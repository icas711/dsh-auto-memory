/**
 * П.6 (v1.12): claim-verify — детерминированная верификация путей при записи.
 * Чистые функции (extract/verify/strip) + интеграция в фоновую консолидацию:
 * кандидат с несуществующим путём пишется без «битого» предложения либо отбрасывается;
 * update-ветка не верифицируется; verifyWrites: false отключает проверку.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { extractPathClaims, stripFailedSentences, verifyPathClaims } from '../src/verify.ts'
import { MemoryStore } from '../src/store.ts'
import { registerConsolidation } from '../src/consolidate.ts'
import type { ConsolidationHandle, ConsolidationOptions } from '../src/consolidate.ts'

const CWD = '/work/proj'
const baseOptions: ConsolidationOptions = {
  autoSummarize: true, autoSummarizeMaxMemories: 5, autoSummarizeMaxTokens: 1024,
  enableUserScope: true, minImportance: 0, autoSummarizeEveryTurns: 3,
}

describe('extractPathClaims', () => {
  it('берёт только пути с известными префиксами и белым списком расширений', () => {
    const claims = extractPathClaims(
      'Конфиг в src/config/app.ts, схема в packages/core/schema.json, скрипт ./scripts/build.sh, домашние настройки ~/projects/x/env.yml.',
    )
    expect(claims).toContain('src/config/app.ts')
    expect(claims).toContain('packages/core/schema.json')
    expect(claims).toContain('./scripts/build.sh')
    expect(claims.some(c => c.startsWith('~/'))).toBe(true)
  })
  it('голые имена файлов без пути, URL и node_modules — не claims', () => {
    const claims = extractPathClaims(
      'Смотри README.md (без пути), доку на https://example.com/src/guide.md, зависимости в node_modules/left-pad/index.js, модуль ../shared/lib/util.py.',
    )
    expect(claims).toEqual(['../shared/lib/util.py'])
  })
  it('дедуп и cap 20', () => {
    const body = Array.from({ length: 30 }, (_, i) => `Факт ${i} в src/file-${i}.ts`).join('. ')
    const claims = extractPathClaims(body)
    expect(claims).toHaveLength(20)
    expect(extractPathClaims('одно src/a.ts и снова src/a.ts')).toEqual(['src/a.ts'])
  })
})

describe('verifyPathClaims', () => {
  let root: string
  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-verify-'))
    await fsp.mkdir(join(root, 'src'), { recursive: true })
    await fsp.writeFile(join(root, 'src', 'exists.ts'), 'export {}', 'utf8')
  })
  afterEach(async () => { await fsp.rm(root, { recursive: true, force: true }) })

  it('существующий путь exists, отсутствующий — нет', async () => {
    const results = await verifyPathClaims(['src/exists.ts', 'src/missing.ts'], root)
    expect(results).toEqual([
      { claim: 'src/exists.ts', exists: true },
      { claim: 'src/missing.ts', exists: false },
    ])
  })
  it('без cwd всё считается существующим (fail-open)', async () => {
    const results = await verifyPathClaims(['src/missing.ts'], undefined)
    expect(results).toEqual([{ claim: 'src/missing.ts', exists: true }])
  })
})

describe('stripFailedSentences', () => {
  it('вырезает только предложения с битыми claims, остальные сохраняются', () => {
    const body = 'Конфиг лежит в src/config/app.ts. Проект работает на Postgres 16! Схема в src/schema/missing.json.\nДеплой через docker compose.'
    const stripped = stripFailedSentences(body, ['src/config/app.ts', 'src/schema/missing.json'])
    expect(stripped.stripped).toBe(2)
    expect(stripped.body).toContain('Проект работает на Postgres 16!')
    expect(stripped.body).toContain('Деплой через docker compose.')
    expect(stripped.body).not.toContain('src/config/app.ts')
  })
  it('нет битых claims — тело без изменений', () => {
    const body = 'Просто факт без путей.'
    expect(stripFailedSentences(body, [])).toEqual({ body, stripped: 0 })
  })
})

describe('интеграция в консолидацию', () => {
  let root: string
  let store: MemoryStore
  let ctx: Context
  let handle: ConsolidationHandle
  let prompts: string[]
  let reply: (prompt: string) => string | Promise<string>

  const session = (id = 's1') => ({ id, header: { cwd: root } })
  const agentOf = () => ({ session: session(), options: { provider: 'p', model: 'm' } })
  const emit = (name: string, ...args: unknown[]): void => {
    (ctx as unknown as { emit: (n: string, ...a: unknown[]) => void }).emit(name, ...args)
  }
  const say = (text: string): void => {
    emit('session/event', session(), { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text }] } })
  }
  const stopTurn = async (): Promise<void> => {
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent: agentOf(), turn: 1, signal: new AbortController().signal })
    await handle.flush()
  }
  /** Кандидат project с реальным и битым путём (первое предложение переживает strip). */
  const twoPathsCandidate = (): string => JSON.stringify([{
    name: 'paths-fact', title: 'paths', description: 'Факт о путях проекта', type: 'project',
    body: 'Основной модуль парсера закупок лежит в src/real-module.ts и экспортирует функции нормализации позиций и расчёта сумм контрактов. Конфигурация окружения описана в src/config/missing-file.ts.',
    scope: 'project', importance: 7, evidence: 'сообщение про пути проекта',
  }])

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-verify-it-'))
    store = new MemoryStore(root)
    ctx = new Context()
    prompts = []
    reply = () => '[]'
    await fsp.mkdir(join(root, 'src'), { recursive: true })
    await fsp.writeFile(join(root, 'src', 'real-module.ts'), 'export {}', 'utf8')
    ctx.provide('llm')
    ctx.set('llm', {
      stream: (request: { messages: Array<{ content: Array<{ text: string }> }>; signal?: AbortSignal }) => {
        const prompt = request.messages[0]!.content[0]!.text
        prompts.push(prompt)
        const signal = request.signal
        return (async function* () {
          const aborted = new Promise<null>(resolve => signal?.addEventListener('abort', () => resolve(null), { once: true }))
          const text = await Promise.race([Promise.resolve(reply(prompt)), aborted])
          if (text === null) {
            yield { type: 'finish', reason: { kind: 'aborted' } }
            return
          }
          // block-end несёт полный текст (BlockAssembler собирает из него, как в incremental-харнессе)
          yield { type: 'block-start', index: 0, blockType: 'text' }
          yield { type: 'text-delta', index: 0, text }
          yield { type: 'block-end', index: 0, block: { type: 'text', text } }
          yield { type: 'finish', reason: { kind: 'stop' } }
        })()
      },
    })
    handle = registerConsolidation(ctx, store, { ...baseOptions, autoSummarizeEveryTurns: 1 })
  })
  afterEach(async () => {
    await ctx.fiber.dispose()
    await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  })

  it('битое предложение вырезается, реальный путь сохраняется (честная деградация)', async () => {
    say('сообщение про пути проекта')
    reply = () => twoPathsCandidate()
    await stopTurn()
    const record = (await store.listAll(root)).find(r => r.name === 'paths-fact')
    expect(record).toBeDefined()
    expect(record?.body).toContain('src/real-module.ts')
    expect(record?.body).not.toContain('src/config/missing-file.ts')
  })

  it('короткий остаток (<80) — кандидат отбрасывается целиком', async () => {
    say('сообщение про один битый путь')
    reply = () => JSON.stringify([{
      name: 'stale-only', title: 'x', description: 'Только битый путь', type: 'project',
      body: 'Конфиг в src/config/missing-file.ts.',
      scope: 'project', importance: 7, evidence: 'сообщение про один битый путь',
    }])
    await stopTurn()
    expect((await store.listAll(root)).filter(r => r.name === 'stale-only')).toHaveLength(0)
  })

  it('update-ветка не верифицируется: update с битым путём проходит как есть', async () => {
    await store.write({ name: 'paths-fact', description: 'Факт о путях проекта', type: 'project', body: 'старое тело' }, 'project', root)
    say('сообщение про пути проекта')
    reply = () => twoPathsCandidate()
    await stopTurn()
    const record = (await store.listAll(root)).find(r => r.name === 'paths-fact')
    expect(record?.body).toContain('src/config/missing-file.ts') // update прошёл без strip
  })

  it('verifyWrites: false — пути не проверяются и сохраняются как есть', async () => {
    handle = registerConsolidation(ctx, store, { ...baseOptions, autoSummarizeEveryTurns: 1, verifyWrites: false })
    say('сообщение про непроверяемые пути')
    reply = () => JSON.stringify([{
      name: 'unverified-fact', title: 'u', description: 'Пути не проверяются', type: 'project',
      body: 'Только битый путь: src/config/missing-file.ts, и это сохранится.',
      scope: 'project', importance: 7, evidence: 'сообщение про непроверяемые пути',
    }])
    await stopTurn()
    const record = (await store.listAll(root)).find(r => r.name === 'unverified-fact')
    expect(record?.body).toContain('src/config/missing-file.ts')
  })
})
