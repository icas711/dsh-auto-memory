/**
 * 1.10.0 ужесточение под многопользовательский веб: гейт маршрутов панели (только админы, fail-closed),
 * мост админов из webAuth, делегированные сессии без owner, гейт инъекций, точное сравнение логинов,
 * дозапись хвоста консолидации на session/disposed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { MemoryStore } from '../src/store.ts'
import { registerMemoryApi } from '../src/memory-api.ts'
import { createIdentityBridge } from '../src/identity.ts'
import { isUntrustedTool, matchesToolPattern, registerInjectionGate } from '../src/injection-gate.ts'
import { registerConsolidation } from '../src/consolidate.ts'
import type { ConsolidationOptions } from '../src/consolidate.ts'

let root: string
const input = (name: string) => ({ name, description: `d ${name}`, type: 'reference' as const, body: `b ${name}` })

beforeEach(async () => { root = await fsp.mkdtemp(join(tmpdir(), 'dsh-hard-')) })
afterEach(async () => { await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }) })

describe('сравнение логинов и мост админов', () => {
  it('admins сравниваются точно: Alice не получает прав админа alice', () => {
    const store = new MemoryStore(root, { admins: ['alice'] })
    expect(store.withOwner('alice').isAdmin()).toBe(true)
    expect(store.withOwner('Alice').isAdmin()).toBe(false)
  })

  it('ответ хоста авторитетен, «не знаю» → запасной список', () => {
    const answers = new Map<string, boolean>([['host-admin', true], ['listed', false]])
    const store = new MemoryStore(root, { admins: ['listed', 'fallback'], adminResolver: l => answers.get(l) })
    expect(store.withOwner('host-admin').isAdmin()).toBe(true) // хост сказал да, в списке нет
    expect(store.withOwner('listed').isAdmin()).toBe(false) // хост сказал нет — список не спасает
    expect(store.withOwner('fallback').isAdmin()).toBe(true) // хост не знает → список
    expect(store.withOwner('nobody').isAdmin()).toBe(false)
  })

  it('делегированное представление без owner: не админ и общий слой только на чтение', async () => {
    const store = new MemoryStore(root)
    await store.write({ ...input('pub'), status: 'verified' }, 'shared')
    const child = store.delegated()
    expect(child.isAdmin()).toBe(false)
    expect((await child.read('pub', 'shared'))?.name).toBe('pub') // читать можно
    await expect(child.write(input('x'), 'shared')).rejects.toThrow(/read-only/)
    await expect(child.delete('pub', 'shared')).rejects.toThrow()
    await expect(child.clear('shared')).rejects.toThrow(/admin/)
    expect(store.isAdmin()).toBe(true) // родитель (локальный) не пострадал
  })
})

describe('мост identity', () => {
  const ctxWith = (svc: unknown) => ({ get: (n: string) => (n === 'webAuth' ? svc : undefined) }) as unknown as Context
  it('нет webAuth → не активен', async () => {
    const bridge = createIdentityBridge(ctxWith(undefined))
    expect(bridge.active()).toBe(false)
    expect(bridge.isAdmin('a')).toBeUndefined()
    expect(await bridge.identify(new Request('http://x/'))).toBeUndefined()
  })
  it('личность по cookie (identityFromCookie): логин и роль хоста', async () => {
    const seen: Array<string | undefined> = []
    const bridge = createIdentityBridge(ctxWith({
      identityFromCookie: (cookie: string | undefined) => { seen.push(cookie); return cookie === 'sid=1' ? { login: 'boss', admin: true } : undefined },
    }))
    expect(bridge.active()).toBe(true)
    expect(await bridge.identify(new Request('http://x/', { headers: { cookie: 'sid=1' } }))).toEqual({ login: 'boss', admin: true })
    expect(await bridge.identify(new Request('http://x/'))).toBeUndefined() // нет сессии
    expect(seen).toEqual(['sid=1', undefined])
  })
  it('проверка «логин → админ»: предположительные имена isAdmin / admins', () => {
    const bridge = createIdentityBridge(ctxWith({ isAdmin: (l: string) => l === 'boss' }))
    expect(bridge.isAdmin('boss')).toBe(true)
    expect(bridge.isAdmin('x')).toBe(false)
    expect(createIdentityBridge(ctxWith({ admins: new Set(['a']) })).isAdmin('a')).toBe(true)
    expect(createIdentityBridge(ctxWith({})).isAdmin('a')).toBeUndefined() // не знаем → запасной список
  })
  it('сбой сервиса → «не знаю», без исключения', async () => {
    const bridge = createIdentityBridge(ctxWith({ isAdmin: () => { throw new Error('boom') }, identityFromCookie: () => { throw new Error('boom') } }))
    expect(bridge.isAdmin('a')).toBeUndefined()
    expect(await bridge.identify(new Request('http://x/'))).toBeUndefined()
  })
})

describe('гейт маршрутов панели', () => {
  const BASE = '/api/auto-memory'
  const mount = (identity: ReturnType<typeof createIdentityBridge> | undefined, store: MemoryStore) => {
    const routes = new Map<string, (r: Request) => Promise<Response>>()
    const connection = { fetch: { register: (route: { path: string, fetch: (r: Request) => Promise<Response> }): void => { routes.set(route.path, route.fetch) } } }
    const ctx = { get: (n: string) => (n === 'connection' ? connection : undefined) } as unknown as Context
    registerMemoryApi(ctx, store, join(root, 'memory-root'), { maxBytes: 4096, homeDir: root }, { maxBytes: 4096 }, identity)
    return (req: Request) => routes.get(`${BASE}/groups.list`)!(req)
  }
  const bridgeFor = (login: string | undefined, admin?: boolean): ReturnType<typeof createIdentityBridge> => ({
    active: () => true, isAdmin: () => undefined,
    identify: async () => (login === undefined ? undefined : { login, ...(admin !== undefined ? { admin } : {}) }),
  })

  it('без webAuth (identity не активен) — как раньше', async () => {
    const call = mount(undefined, new MemoryStore(root))
    expect((await call(new Request('http://x/'))).status).toBe(200)
  })
  it('не определили личность → 403; не админ → 403; админ → 200', async () => {
    const store = new MemoryStore(root, { admins: ['boss'] })
    expect((await mount(bridgeFor(undefined), store)(new Request('http://x/'))).status).toBe(403)
    expect((await mount(bridgeFor('alice'), store)(new Request('http://x/'))).status).toBe(403)
    expect((await mount(bridgeFor('boss'), store)(new Request('http://x/'))).status).toBe(200)
    expect((await mount(bridgeFor('Boss'), store)(new Request('http://x/'))).status).toBe(403) // регистр значим
    // роль от хоста авторитетна и в обе стороны
    expect((await mount(bridgeFor('alice', true), store)(new Request('http://x/'))).status).toBe(200)
    expect((await mount(bridgeFor('boss', false), store)(new Request('http://x/'))).status).toBe(403)
  })
})

describe('гейт инъекций', () => {
  it('маски имён: * = подстрока, memory_* никогда не заражает', () => {
    expect(matchesToolPattern('web_fetch', 'web_*')).toBe(true)
    expect(matchesToolPattern('Read_Document', '*document*')).toBe(true)
    expect(isUntrustedTool('memory_search', ['*search*'])).toBe(false)
    expect(isUntrustedTool('bash', ['web_*'])).toBe(false)
  })

  it('после чтения внешнего контента memory_write идёт через ask; в новом ходу — свободно', async () => {
    const ctx = new Context()
    // П.9: режим 'ask' = прежнее поведение injectionGate: true
    const gate = registerInjectionGate(ctx, { untrustedTools: ['read_doc*'], injectionGate: 'ask' })
    const agent = { session: { id: 's1' } }
    const call = (name: string) => (ctx as unknown as { waterfall: (n: string, p: unknown, next: () => Promise<unknown>) => Promise<{ kind: string }> })
      .waterfall('tools/pre-execute', { name, arguments: {}, agent }, async () => ({ kind: 'allow' }))
    expect((await call('memory_write')).kind).toBe('allow') // до чтения — чисто
    await call('read_docx')
    expect(gate.taintedBy('s1')).toBe('read_docx')
    const asked = await call('memory_write') as { kind: string, bypassPolicy?: boolean }
    expect(asked.kind).toBe('ask')
    expect(asked.bypassPolicy).toBe(true)
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent, turn: 1, signal: new AbortController().signal })
    expect((await call('memory_write')).kind).toBe('allow')
    await ctx.fiber.dispose()
  })
})

describe('дозапись хвоста на session/disposed', () => {
  it('закрытие сессии с непросчитанными сообщениями запускает консолидацию', async () => {
    const ctx = new Context()
    ctx.provide('llm')
    const prompts: string[] = []
    ctx.set('llm', {
      stream: (request: { messages: Array<{ content: Array<{ text: string }> }> }) => {
        prompts.push(request.messages[0]!.content[0]!.text)
        return (async function* () {
          yield { type: 'block-start', index: 0, blockType: 'text' }
          yield { type: 'text-delta', index: 0, text: '[]' }
          yield { type: 'block-end', index: 0, block: { type: 'text', text: '[]' } }
          yield { type: 'finish', reason: { kind: 'stop' } }
        })()
      },
    })
    const options: ConsolidationOptions = {
      autoSummarize: true, autoSummarizeMaxMemories: 5, autoSummarizeMaxTokens: 256,
      enableUserScope: true, minImportance: 0, autoSummarizeEveryTurns: 3,
    }
    const handle = registerConsolidation(ctx, new MemoryStore(root), options)
    const session = { id: 's9', header: { cwd: '/work/p' } }
    const agent = { session, options: { provider: 'p', model: 'm' } }
    const emit = (name: string, ...args: unknown[]) => (ctx as unknown as { emit: (n: string, ...a: unknown[]) => void }).emit(name, ...args)
    emit('session/event', session, { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Мы храним закупки в Postgres 16 и это важно' }] } })
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent, turn: 1, signal: new AbortController().signal })
    expect(prompts).toHaveLength(0) // 1 сообщение < порога 3
    emit('session/disposed', session)
    const deadline = Date.now() + 2000
    while (prompts.length === 0 && Date.now() < deadline) await new Promise(r => setTimeout(r, 10))
    await handle.flush()
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('Postgres 16')
    await ctx.fiber.dispose()
  })
})
