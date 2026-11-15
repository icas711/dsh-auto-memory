/**
 * П.3 (v1.12): recentTools в селектор recall.
 * Окно (cap 10, уникальные, most recent last, memory_* не пишутся), секция в промпте
 * селектора при непустом окне и её отсутствие при пустом, развилка reference-vs-gotcha
 * на fake-селекторе, заполнение окна через tools/pre-execute в registerRecall.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { createRecentTools } from '../src/recent-tools.ts'
import { buildSelectorPrompt, createRecaller, registerRecall } from '../src/recall.ts'
import type { RecallAgent, RecallOptions, RecallSelector } from '../src/recall.ts'
import { MemoryStore } from '../src/store.ts'
import type { MemoryRecord } from '../src/types.ts'

const rec = (over: Partial<MemoryRecord>): MemoryRecord => ({
  name: 'x', description: 'd', type: 'reference', body: 'b', scope: 'project', ...over,
})
const userMsg = (text: string, kind = 'user') => ({ source: { kind }, content: [{ type: 'text', text }] })

describe('createRecentTools', () => {
  it('окно копится в порядке использования, повтор поднимает наверх, без дублей', () => {
    const tools = createRecentTools()
    tools.record('s1', 'a')
    tools.record('s1', 'b')
    tools.record('s1', 'a')
    expect(tools.get('s1')).toEqual(['b', 'a'])
  })
  it('cap 10: старые вытесняются, самые свежие остаются', () => {
    const tools = createRecentTools()
    for (let i = 0; i < 14; i++) tools.record('s1', `tool-${i}`)
    const window = tools.get('s1')
    expect(window).toHaveLength(10)
    expect(window[0]).toBe('tool-4')
    expect(window[9]).toBe('tool-13')
  })
  it('memory_* и пустые имена в окно не пишутся', () => {
    const tools = createRecentTools()
    tools.record('s1', 'memory_write')
    tools.record('s1', 'memory_read')
    tools.record('s1', '')
    tools.record('s1', 'web_fetch')
    expect(tools.get('s1')).toEqual(['web_fetch'])
  })
  it('cleanup очищает только свою сессию', () => {
    const tools = createRecentTools()
    tools.record('s1', 'a')
    tools.record('s2', 'b')
    tools.cleanup('s1')
    expect(tools.get('s1')).toEqual([])
    expect(tools.get('s2')).toEqual(['b'])
    expect(tools.get('нет-такой')).toEqual([])
  })
})

describe('buildSelectorPrompt: секция recentTools', () => {
  it('непустое окно — секция с правилом reference-vs-gotcha', () => {
    const prompt = buildSelectorPrompt('запрос', [], 3, ['web_fetch', 'browser'])
    expect(prompt).toContain('Recently used tools in this session: web_fetch, browser')
    expect(prompt).toContain('Do NOT pick reference/API-documentation memories')
    expect(prompt).toContain('DO pick memories that carry')
  })
  it('секция стоит перед user_message', () => {
    const prompt = buildSelectorPrompt('запрос', [], 3, ['web_fetch'])
    expect(prompt.indexOf('Recently used tools')).toBeLessThan(prompt.indexOf('<user_message>'))
  })
  it('пустое/отсутствующее окно — секции нет, байты не тратятся', () => {
    expect(buildSelectorPrompt('запрос', [], 3)).not.toContain('Recently used tools')
    expect(buildSelectorPrompt('запрос', [], 3, [])).not.toContain('Recently used tools')
  })
})

describe('createRecaller: окно в промпте и развилка reference-vs-gotcha', () => {
  let root: string
  let store: MemoryStore
  const options: RecallOptions = { recall: true, recallMaxMemories: 3, recallMaxBytes: 3000, recallTimeoutMs: 2000, enableUserScope: true }
  const agent = (): RecallAgent => ({
    session: { id: 's1' as never, header: { cwd: '/work/proj' } },
    options: { provider: 'p', model: 'm' },
  })
  const signal = (): AbortSignal => new AbortController().signal

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-recent-tools-'))
    store = new MemoryStore(root)
    await store.write({ name: 'webfetch-ref', description: 'API reference documentation for the web_fetch tool', type: 'reference', body: 'docs' }, 'project', '/work/proj')
    await store.write({ name: 'webfetch-gotcha', description: 'warning: web_fetch silently fails on large bodies — known issue', type: 'project', body: 'gotcha' }, 'project', '/work/proj')
  })
  afterEach(async () => {
    // touch() может писать счётчик чтений в фоне — повторные попытки вместо гонки с удалением
    await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  })

  it('getRecentTools (DI) попадает в промпт селектора', async () => {
    let prompt = ''
    const recaller = createRecaller(store, options, async p => { prompt = p; return '[]' }, () => ['web_fetch'])
    await recaller.recall(agent(), [userMsg('что ты знаешь о проекте') as never], signal())
    expect(prompt).toContain('Recently used tools in this session: web_fetch')
    const plain = createRecaller(store, options, async p => { prompt = p; return '[]' })
    await plain.recall(agent(), [userMsg('что ты знаешь о проекте') as never], signal())
    expect(prompt).not.toContain('Recently used tools')
  })

  it('fake-селектор по секции: reference про используемый tool не выбрана, gotcha выбрана', async () => {
    // Селектор «следует правилу П.3»: есть секция → берёт gotcha, нет секции → берёт reference
    const ruleFollowing: RecallSelector = async prompt =>
      prompt.includes('Recently used tools') ? '["webfetch-gotcha"]' : '["webfetch-ref"]'
    const withTools = createRecaller(store, options, ruleFollowing, () => ['web_fetch'])
    const gotcha = await withTools.recall(agent(), [userMsg('что ты знаешь о проекте') as never], signal())
    expect(gotcha?.picked).toEqual(['webfetch-gotcha'])
    const withoutTools = createRecaller(store, options, ruleFollowing)
    const ref = await withoutTools.recall(agent(), [userMsg('что ты знаешь о проекте') as never], signal())
    expect(ref?.picked).toEqual(['webfetch-ref'])
  })
})

describe('registerRecall: tools/pre-execute заполняет окно', () => {
  let root: string
  let ctx: Context

  const opts: RecallOptions = { recall: true, recallMaxMemories: 3, recallMaxBytes: 3000, recallTimeoutMs: 2000, enableUserScope: true }
  const waterfall = (name: string, payload: unknown, next: () => Promise<unknown>) =>
    (ctx as unknown as { waterfall: (n: string, p: unknown, nx: () => Promise<unknown>) => Promise<unknown> }).waterfall(name, payload, next)

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-recent-tools-it-'))
    ctx = new Context()
  })
  afterEach(async () => {
    await ctx.fiber.dispose()
    // touch() пишет счётчик чтений в фоне — повторные попытки вместо гонки с удалением
    await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  })

  it('allow-вызов инструмента попадает в промпт следующего recall; cleanup и deny работают', async () => {
    const store = new MemoryStore(root)
    await store.write({ name: 'language', description: 'Отвечать по-русски', type: 'feedback', body: 'x' }, 'user')
    let prompt = ''
    const handle = registerRecall(ctx, store, opts, async p => { prompt = p; return '["language"]' })
    const messages = [userMsg('расскажи про дробление закупок')]
    const payloadFor = (id: string, msgs = messages) => ({
      agent: { session: { id, header: { cwd: '/work/proj' } }, options: { provider: 'p', model: 'm' } },
      messages: msgs, turn: 1, step: 1, signal: new AbortController().signal,
    })

    // allow → окно сессии s9 наполнилось
    const allow = await waterfall('tools/pre-execute', { name: 'web_fetch', agent: { session: { id: 's9' } } }, async () => ({ kind: 'allow' }))
    expect((allow as { kind: string }).kind).toBe('allow')
    await waterfall('agent/pre-step', payloadFor('s9'), async () => ({ kind: 'enter', messages }))
    expect(prompt).toContain('Recently used tools in this session: web_fetch')

    // cleanup стирает окно (и surfaced) → следующий recall без секции
    handle.cleanup('s9')
    await waterfall('agent/pre-step', payloadFor('s9'), async () => ({ kind: 'enter', messages }))
    expect(prompt).not.toContain('Recently used tools')

    // deny не пишется в окно: сессия s10 остаётся с пустым окном
    await waterfall('tools/pre-execute', { name: 'browser', agent: { session: { id: 's10' } } }, async () => ({ kind: 'deny' }))
    const messages3 = [userMsg('расскажи про дробление закупок')]
    await waterfall('agent/pre-step', payloadFor('s10', messages3), async () => ({ kind: 'enter', messages: messages3 }))
    expect(prompt).not.toContain('browser')
    expect(prompt).not.toContain('Recently used tools')
  })
})
