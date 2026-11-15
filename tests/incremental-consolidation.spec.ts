/**
 * 1.7.0 инкрементальная консолидация: запуск на границе тёрна (agent/turn-stopping) каждые N
 * пользовательских сообщений, курсор «уже обработано», возврат батча при сбое, без параллельных
 * запусков в одной сессии, добор хвоста на agent/disposed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { MemoryStore } from '../src/store.ts'
import { registerConsolidation } from '../src/consolidate.ts'
import type { ConsolidationHandle, ConsolidationOptions } from '../src/consolidate.ts'

const CWD = '/work/proj'

const baseOptions: ConsolidationOptions = {
  autoSummarize: true, autoSummarizeMaxMemories: 5, autoSummarizeMaxTokens: 1024,
  enableUserScope: true, minImportance: 0, autoSummarizeEveryTurns: 3,
}

function streamOf(text: string) {
  return async function* () {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

describe('инкрементальная консолидация', () => {
  let root: string
  let store: MemoryStore
  let ctx: Context
  let handle: ConsolidationHandle
  let prompts: string[]
  let reply: (prompt: string) => string | Promise<string>

  const session = (id = 's1', header: Record<string, unknown> = {}) => ({ id, header: { cwd: CWD, ...header } })
  const agentOf = (id = 's1', header: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => ({
    session: session(id, header), options: { provider: 'p', model: 'm', ...options },
  })
  // события dsh типизированы строго; тесту нужен только сам вызов слушателей
  const emit = (name: string, ...args: unknown[]): void => {
    (ctx as unknown as { emit: (n: string, ...a: unknown[]) => void }).emit(name, ...args)
  }
  const say = (text: string, id = 's1') => {
    emit('session/event', session(id), { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text }] } })
  }
  const answer = (text: string, id = 's1') => {
    emit('session/event', session(id), { type: 'assistant/message', data: { message: { content: [{ type: 'text', text }] } } })
  }
  const stopTurn = async (agent = agentOf()) => {
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent, turn: 1, signal: new AbortController().signal })
    await handle.flush()
  }
  const dispose = async (agent = agentOf()) => {
    emit('agent/disposed', { agent })
    await handle.flush()
  }
  const waitFor = async (condition: () => boolean, ms = 2000): Promise<void> => {
    const deadline = Date.now() + ms
    while (!condition()) {
      if (Date.now() > deadline) throw new Error('waitFor: condition not met')
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  const candidate = (name: string, evidence: string) => JSON.stringify([{
    name, title: name, description: `Описание ${name}`, type: 'project', body: `Факт ${name}`,
    scope: 'project', importance: 7, evidence,
  }])

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-incr-'))
    store = new MemoryStore(root)
    ctx = new Context()
    prompts = []
    reply = () => '[]'
    ctx.provide('llm')
    ctx.set('llm', {
      stream: (request: { messages: Array<{ content: Array<{ text: string }> }> }) => {
        const prompt = request.messages[0]!.content[0]!.text
        prompts.push(prompt)
        const signal = (request as { signal?: AbortSignal }).signal
        return (async function* () {
          const aborted = new Promise<null>(resolve => signal?.addEventListener('abort', () => resolve(null), { once: true }))
          const text = await Promise.race([Promise.resolve(reply(prompt)), aborted])
          if (text === null) {
            yield { type: 'finish', reason: { kind: 'aborted' } }
            return
          }
          yield* streamOf(text)()
        })()
      },
    })
  })
  afterEach(async () => {
    await ctx.fiber.dispose()
    await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  })

  it('до порога ничего не запускается; по порогу — одна консолидация с накопленным текстом', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    say('Мы храним закупки в Postgres 16')
    answer('Понял')
    await stopTurn()
    say('Основная модель — Qwen3-235B на H200')
    await stopTurn()
    expect(prompts).toHaveLength(0) // 2 сообщения < 3

    say('Деплой делаем через docker compose')
    reply = () => candidate('procurement-db', 'Мы храним закупки в Postgres 16')
    await stopTurn()
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('USER: Мы храним закупки в Postgres 16')
    expect(prompts[0]).toContain('USER: Основная модель — Qwen3-235B на H200')
    expect(prompts[0]).toContain('USER: Деплой делаем через docker compose')
    expect(prompts[0]).toContain('ASSISTANT: Понял')
    const names = (await store.listAll(CWD)).map(r => r.name)
    expect(names).toContain('procurement-db')
  })

  it('курсор: вторая консолидация видит только новое, а не всю историю', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    for (const text of ['первое сообщение про закупки', 'второе сообщение про сервер', 'третье сообщение про деплой']) say(text)
    await stopTurn()
    expect(prompts).toHaveLength(1)

    say('четвёртое сообщение про бюджет проекта')
    await dispose() // хвост добирается на disposed
    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toContain('четвёртое сообщение про бюджет проекта')
    expect(prompts[1]).not.toContain('первое сообщение про закупки')
  })

  it('сбой LLM возвращает батч в курсор: следующая попытка содержит и старое, и новое', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    for (const text of ['сообщение один про закупки', 'сообщение два про сервер', 'сообщение три про деплой']) say(text)
    reply = () => 'это не JSON'
    await stopTurn()
    expect(prompts).toHaveLength(1)
    expect(await store.listAll(CWD)).toHaveLength(0)

    // Счётчик не сброшен → ретрай не на каждом тёрне (backoff): ещё 2 сообщения < порога
    say('сообщение четыре про бюджет')
    await stopTurn()
    expect(prompts).toHaveLength(1)

    for (const text of ['сообщение пять про сроки', 'сообщение шесть про команду']) say(text)
    reply = () => candidate('team-info', 'сообщение шесть про команду')
    await stopTurn()
    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toContain('сообщение один про закупки') // вернулось после сбоя
    expect(prompts[1]).toContain('сообщение шесть про команду')
    expect((await store.listAll(CWD)).map(r => r.name)).toContain('team-info')
  })

  it('в одной сессии нет параллельных запусков', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    reply = async () => { await gate; return '[]' }
    for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
    const first = (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent: agentOf(), turn: 1, signal: new AbortController().signal })
    await first // serial не ждёт фоновую задачу
    await waitFor(() => prompts.length === 1)

    for (const text of ['четыре про бюджет', 'пять про сроки', 'шесть про команду']) say(text)
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent: agentOf(), turn: 2, signal: new AbortController().signal })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(prompts).toHaveLength(1) // первая ещё в полёте

    release()
    await handle.flush()
    await stopTurn() // после завершения — следующая порция уходит
    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toContain('шесть про команду')
  })

  it('turn-stopping не ждёт LLM (не тормозит ход)', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    let release: () => void = () => {}
    reply = () => new Promise<string>(resolve => { release = () => resolve('[]') })
    for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
    const started = Date.now()
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent: agentOf(), turn: 1, signal: new AbortController().signal })
    expect(Date.now() - started).toBeLessThan(500)
    await waitFor(() => prompts.length === 1)
    release()
    await handle.flush()
  })

  it('disposed без новых пользовательских реплик ничего не запускает', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    await dispose()
    expect(prompts).toHaveLength(0)
    answer('ответ без вопроса')
    await dispose()
    expect(prompts).toHaveLength(0)
  })

  it('autoSummarize=false: LLM не вызывается, но слова запроса для индекса копятся', async () => {
    handle = registerConsolidation(ctx, store, { ...baseOptions, autoSummarize: false })
    for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
    await stopTurn()
    await dispose()
    expect(prompts).toHaveLength(0)
    // после disposed буфер при выключенной консолидации сохраняется до session/disposed
    expect(handle.getQueryText('s1')).toContain('раз про закупки')
  })

  it('субагенты не консолидируются', async () => {
    handle = registerConsolidation(ctx, store, baseOptions)
    for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text, 'child')
    await stopTurn(agentOf('child', { delegationDepth: 1 }))
    await dispose(agentOf('child', { delegationDepth: 1 }))
    expect(prompts).toHaveLength(0)
  })

  it('autoSummarizeEveryTurns=1 консолидирует после каждого сообщения', async () => {
    handle = registerConsolidation(ctx, store, { ...baseOptions, autoSummarizeEveryTurns: 1 })
    say('единственное сообщение про закупки')
    await stopTurn()
    expect(prompts).toHaveLength(1)
  })

  it('нет маршрута (provider/model) — тихо пропускаем и не теряем буфер', async () => {
    handle = registerConsolidation(ctx, store, { ...baseOptions, autoSummarizeEveryTurns: 1 })
    say('сообщение до появления маршрута')
    await stopTurn(agentOf('s1', {}, { provider: undefined }))
    expect(prompts).toHaveLength(0)
    await stopTurn() // маршрут появился
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('сообщение до появления маршрута')
  })

  describe('П.4: merge вместо скипа при прямой записи', () => {
    /** Прямой вызов memory_write/memory_delete в ходе: tools/pre-execute waterfall c allow/deny. */
    const directTool = async (name: 'memory_write' | 'memory_delete', target: string, decision: 'allow' | 'deny' = 'allow', id = 's1'): Promise<void> => {
      await (ctx as unknown as { waterfall: (n: string, p: unknown, nx: () => Promise<unknown>) => Promise<unknown> }).waterfall(
        'tools/pre-execute',
        { name, arguments: { name: target }, agent: { session: { id } } },
        async () => ({ kind: decision }),
      )
    }

    it('диапазон с прямой записью НЕ скипается: LLM вызван, якорь в промпте, перекрывающийся факт доливается update-веткой', async () => {
      handle = registerConsolidation(ctx, store, baseOptions)
      // модель напрямую записала память в диапазоне
      await directTool('memory_write', 'procurement-db')
      for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
      // экстрактор «следует промпту»: перекрывающийся факт приходит с ТОЧНЫМ именем якоря
      reply = prompt => {
        expect(prompt).toContain('Merge anchors — memories the agent wrote DIRECTLY')
        expect(prompt).toContain('procurement-db')
        return candidate('procurement-db', 'раз про закупки')
      }
      await stopTurn()
      expect(prompts).toHaveLength(1) // скипа нет: консолидация выполнена
      // запись реально существует (напрямую записанная моделью — заглушка store.write в тесте
      // не вызывалась, поэтому «якорь» создала консолидация update-веткой: дубля нет)
      expect((await store.listAll(CWD)).map(r => r.name)).toContain('procurement-db')
    })

    it('guard: create-кандидат с именем якоря форсится в update, имя из прямых удалений не воскресает', async () => {
      handle = registerConsolidation(ctx, store, baseOptions)
      // существующая память-якорь (записана в хранилище заранее) + прямая запись того же имени в диапазоне
      await store.write({ name: 'anchor-a', description: 'якорь A', type: 'project', body: 'старое тело A' }, 'project', CWD)
      await directTool('memory_write', 'anchor-a')
      await directTool('memory_delete', 'deleted-b')
      for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
      // экстрактор «ошибается» как в худшем случае: create под именем якоря и воскрешение удалённого
      reply = () => JSON.stringify([
        { name: 'anchor-a', title: 'x', description: 'Описание совсем другое, не совпадающее с якорем', type: 'project', body: 'новое тело A', scope: 'project', importance: 7, evidence: 'раз про закупки' },
        { name: 'deleted-b', title: 'y', description: 'Воскрешение удалённого', type: 'project', body: 'Факт deleted-b', scope: 'project', importance: 7, evidence: 'два про сервер' },
      ])
      await stopTurn()
      const records = await store.listAll(CWD)
      const anchor = records.find(r => r.name === 'anchor-a')
      expect(anchor).toBeDefined()
      expect(anchor?.body).toBe('новое тело A') // update по имени якоря: тело заменено, дубля нет
      expect(records.filter(r => r.name === 'anchor-a')).toHaveLength(1)
      expect(records.some(r => r.name === 'deleted-b')).toBe(false) // воскрешение заблокировано
    })

    it('deny-запись не считается якорем; сбой LLM возвращает якоря для повторного прогона', async () => {
      handle = registerConsolidation(ctx, store, baseOptions)
      await directTool('memory_write', 'denied-c', 'deny')
      for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
      reply = prompt => {
        expect(prompt).not.toContain('Merge anchors') // deny не попал в якоря
        return 'это не JSON' // первый прогон падает
      }
      await stopTurn()
      expect(prompts).toHaveLength(1)
      // якоря «allow»-записей нет — и возвращать нечего; батч вернулся после сбоя
      for (const text of ['четыре про сроки', 'пять про команду', 'шесть про релизы']) say(text)
      reply = prompt => {
        expect(prompt).not.toContain('Merge anchors')
        return candidate('late-fact', 'четыре про сроки')
      }
      await stopTurn()
      expect(prompts).toHaveLength(2)
      expect((await store.listAll(CWD)).map(r => r.name)).toContain('late-fact')
    })

    it('изоляция сессий: прямая запись в чужой сессии не становится якорем', async () => {
      handle = registerConsolidation(ctx, store, baseOptions)
      await directTool('memory_write', 'other-session-fact', 'allow', 's-other')
      for (const text of ['раз про закупки', 'два про сервер', 'три про деплой']) say(text)
      reply = prompt => {
        expect(prompt).not.toContain('Merge anchors')
        expect(prompt).not.toContain('other-session-fact')
        return '[]'
      }
      await stopTurn()
      expect(prompts).toHaveLength(1)
    })
  })
})
