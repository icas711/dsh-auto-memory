/**
 * П.7 (v1.12): Dream — глубокий периодический пересмотр памяти (полностью автоматический).
 * Чистые фазы (манифест/дайджест/промпт/разбор/применение), guardrails (без delete,
 * skip pinned/verified/disputed, cap действий, статус candidate), dry-run не пишет,
 * дефолт пишет и логирует receipts, supersede-цепочка, штамп-интервал, dream: false.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { MemoryStore } from '../src/store.ts'
import {
  applyDreamActions, buildDreamPrompt, buildManifest, extractTranscriptLine, gatherDigest, parseDreamActions, registerDream,
} from '../src/dream.ts'
import type { DreamAction, DreamManifestItem, DreamOptions } from '../src/dream.ts'
import type { RecallOptions } from '../src/recall.ts'
import type { RecallSelector } from '../src/recall.ts'

const baseOptions = (over: Partial<DreamOptions & RecallOptions> = {}): DreamOptions & RecallOptions => ({
  enableUserScope: true, dream: true, dreamIntervalHours: 168, dreamMaxActions: 5, dreamDryRun: false, dreamTranscripts: 3,
  recall: true, recallMaxMemories: 3, recallMaxBytes: 3000, recallTimeoutMs: 2000,
  ...over,
})

describe('buildManifest (Orient)', () => {
  it('человеческий возраст (П.1), статус, pinned, preview тела', () => {
    const now = Date.UTC(2026, 10, 15)
    const manifest = buildManifest([
      { name: 'old-fact', description: 'старая', type: 'project', body: 'тело', scope: 'project', updatedMs: now - 47 * 86_400_000, status: 'candidate' },
      { name: 'pinned-fact', description: 'закреплена', type: 'user', body: 'x', scope: 'user', updatedMs: now, pinned: true },
    ], now)
    expect(manifest[0]).toMatchObject({ name: 'old-fact', updated: '47 days ago', status: 'candidate' })
    expect(manifest[1]).toMatchObject({ name: 'pinned-fact', updated: 'today', pinned: true })
  })
})

describe('extractTranscriptLine / gatherDigest (Gather)', () => {
  it('извлекает USER:/ASSISTANT: из jsonl-строки, мусор → null', () => {
    const user = JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'сообщение пользователя' }] })
    const assistant = JSON.stringify({ type: 'message', message: { role: 'assistant', content: [{ type: 'text', text: 'ответ модели' }] } })
    expect(extractTranscriptLine(user)).toBe('USER: сообщение пользователя')
    expect(extractTranscriptLine(assistant)).toBe('ASSISTANT: ответ модели')
    expect(extractTranscriptLine('не json')).toBeNull()
    expect(extractTranscriptLine(JSON.stringify({ role: 'user', content: [] }))).toBeNull()
    expect(extractTranscriptLine('')).toBeNull()
  })

  it('gatherDigest: читает последние .jsonl из $DSH_HOME/sessions (fallback-путь)', async () => {
    const home = await fsp.mkdtemp(join(tmpdir(), 'dsh-dream-home-'))
    const oldEnv = process.env.DSH_HOME
    process.env.DSH_HOME = home
    try {
      const dir = join(home, 'sessions')
      await fsp.mkdir(dir, { recursive: true })
      const line1 = JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'пользователь просит итоги' }] })
      const line2 = JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'модель отвечает' }] })
      await fsp.writeFile(join(dir, 'a.jsonl'), `${line1}\n${line2}\n`, 'utf8')
      // старый файл по mtime: второй сессии не должно быть в лимите 1
      const oldTime = new Date(Date.now() - 48 * 3_600_000)
      await fsp.writeFile(join(dir, 'b.jsonl'), `${JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'старая сессия' }] })}\n`, 'utf8')
      await fsp.utimes(join(dir, 'b.jsonl'), oldTime, oldTime)
      const ctx = { get: () => undefined } as never
      const digest = await gatherDigest(ctx as never, 1)
      expect(digest).toContain('USER: пользователь просит итоги')
      expect(digest).toContain('ASSISTANT: модель отвечает')
      expect(digest).not.toContain('старая сессия')
    } finally {
      if (oldEnv === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = oldEnv
      await fsp.rm(home, { recursive: true, force: true })
    }
  })
})

describe('buildDreamPrompt / parseDreamActions (Consolidate)', () => {
  const manifest: DreamManifestItem[] = [
    { name: 'stale-fact', type: 'project', status: 'candidate', description: 'устаревший факт', updated: '30 days ago', bodyPreview: 'древнее тело' },
    { name: 'fresh-fact', type: 'user', description: 'свежий факт', updated: 'today', bodyPreview: 'тело' },
  ]
  it('промпт содержит манифест, дайджест, правила и cap действий', () => {
    const prompt = buildDreamPrompt(manifest, 'USER: что-то новое', 5)
    expect(prompt).toContain('stale-fact')
    expect(prompt).toContain('updated 30 days ago')
    expect(prompt).toContain('USER: что-то новое')
    expect(prompt).toContain('at most 5 actions')
    expect(prompt).toContain('NEVER lose information')
  })

  it('parse: update по точному имени, supersede с указателем, create новое; мусор отбрасывается', () => {
    const raw = JSON.stringify({
      actions: [
        { action: 'update', name: 'stale-fact', description: 'обновлённый факт', type: 'project', body: 'новое тело', importance: 6, reason: 'digest contradicts' },
        { action: 'update', name: 'нет-такого', description: 'x', type: 'project', body: 'x' }, // несуществующее имя → skip
        { action: 'supersede', name: 'renewed-fact', supersedes: 'fresh-fact', description: 'замена', type: 'user', body: 'новый факт' },
        { action: 'create', name: 'brand-new-fact', description: 'новое знание', type: 'reference', body: 'ссылка' },
        { action: 'create', name: 'fresh-fact', description: 'дубль имени', type: 'project', body: 'x' }, // коллизия → skip
        { action: 'delete', name: 'stale-fact' }, // delete не входит в контракт → skip
      ],
    })
    const actions = parseDreamActions(raw, manifest, 5)
    expect(actions.map(a => a.action)).toEqual(['update', 'supersede', 'create'])
    expect(actions[0]).toMatchObject({ name: 'stale-fact', importance: 6, reason: 'digest contradicts' })
    expect(actions[1]).toMatchObject({ name: 'renewed-fact', supersedes: 'fresh-fact' })
  })

  it('parse: cap maxActions и не-JSON → пусто', () => {
    const many = { actions: Array.from({ length: 9 }, (_, i) => ({ action: 'create', name: `n-${String(i)}`, description: 'd', type: 'project', body: 'b' })) }
    expect(parseDreamActions(JSON.stringify(many), manifest, 3)).toHaveLength(3)
    expect(parseDreamActions('не json', manifest, 5)).toEqual([])
  })
})

describe('applyDreamActions (Apply)', () => {
  let root: string
  let store: MemoryStore
  const logs: string[] = []
  const CWD = '/w'

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-dream-apply-'))
    store = new MemoryStore(root)
    logs.length = 0
  })
  afterEach(async () => { await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }) })
  const apply = (actions: DreamAction[], dryRun = false, maxActions = 5): Promise<number> =>
    applyDreamActions(store, actions, 'project', CWD, { dryRun, maxActions, log: m => logs.push(m) })

  it('update: перезапись по имени, статус candidate, receipt в логе', async () => {
    await store.write({ name: 'stale-fact', description: 'устаревший факт', type: 'project', body: 'древнее тело' }, 'project', CWD)
    const applied = await apply([{ action: 'update', name: 'stale-fact', description: 'обновлённый факт', type: 'project', body: 'новое тело' }])
    expect(applied).toBe(1)
    const record = await store.read('stale-fact', 'project', CWD)
    expect(record?.body).toBe('новое тело')
    expect(record?.status).toBe('candidate')
    expect(logs.some(l => l.includes('dream applied: update stale-fact'))).toBe(true)
  })

  it('supersede: новое имя + supersedes-указатель, старое помечено superseded (факт не потерян)', async () => {
    await store.write({ name: 'old-fact', description: 'старое', type: 'project', body: 'старое тело' }, 'project', CWD)
    const applied = await apply([{ action: 'supersede', name: 'renewed-fact', supersedes: 'old-fact', description: 'новая версия факта', type: 'project', body: 'новое тело' }])
    expect(applied).toBe(1)
    const renewed = await store.read('renewed-fact', 'project', CWD)
    expect(renewed?.supersedes).toBe('old-fact')
    expect(renewed?.status).toBe('candidate')
    const old = await store.read('old-fact', 'project', CWD)
    expect(old?.status).toBe('superseded')
    expect(old?.supersededBy).toBe('renewed-fact')
    expect(old?.body).toBe('старое тело') // содержимое старой сохранено — ничего не потеряно
  })

  it('guardrails: pinned и verified не трогаются (verified — только предложение в лог), delete отсутствует', async () => {
    await store.write({ name: 'pinned-fact', description: 'закреплена', type: 'project', body: 'тело', pinned: true }, 'project', CWD)
    await store.write({ name: 'verified-fact', description: 'проверена', type: 'project', body: 'тело', status: 'verified' }, 'project', CWD)
    const applied = await apply([
      { action: 'update', name: 'pinned-fact', description: 'x', type: 'project', body: 'новое тело' },
      { action: 'update', name: 'verified-fact', description: 'y', type: 'project', body: 'новое тело 2' },
    ])
    expect(applied).toBe(0)
    expect(logs.some(l => l.includes('dream skipped') && l.includes('pinned'))).toBe(true)
    expect(logs.some(l => l.includes('dream skipped') && l.includes('verified'))).toBe(true)
    expect((await store.read('pinned-fact', 'project', CWD))?.body).toBe('тело')
    expect((await store.read('verified-fact', 'project', CWD))?.body).toBe('тело')
  })

  it('dry-run: только предложения в логе, диск не меняется', async () => {
    await store.write({ name: 'stale-fact', description: 'устаревший факт', type: 'project', body: 'древнее тело' }, 'project', CWD)
    const applied = await apply([{ action: 'update', name: 'stale-fact', description: 'обновлённый факт', type: 'project', body: 'новое тело' }], true)
    expect(applied).toBe(0)
    expect(logs.some(l => l.includes('dream proposal (dry-run): update stale-fact'))).toBe(true)
    expect((await store.read('stale-fact', 'project', CWD))?.body).toBe('древнее тело')
  })

  it('cap maxActions ограничивает запись', async () => {
    const actions: DreamAction[] = Array.from({ length: 4 }, (_, i) => ({
      action: 'create', name: `created-${String(i)}`, description: `новая запись ${String(i)}`, type: 'project', body: 'тело',
    }))
    const applied = await apply(actions, false, 2)
    expect(applied).toBe(2)
    const names = (await store.listAll(CWD)).map(r => r.name)
    expect(names).toContain('created-0')
    expect(names).toContain('created-1')
    expect(names).not.toContain('created-2')
  })
})

describe('registerDream: расписание', () => {
  let root: string
  let home: string
  let store: MemoryStore
  let ctx: Context
  let handle: ReturnType<typeof registerDream>
  let reply: (prompt: string) => string

  const agentOf = (over: Record<string, unknown> = {}) => ({
    session: { id: 's1', header: { cwd: root, ...over } },
    options: { provider: 'p', model: 'm' },
  })
  const stopTurn = async (agent = agentOf()): Promise<void> => {
    await (ctx as unknown as { serial: (n: string, p: unknown) => Promise<void> }).serial('agent/turn-stopping', { agent, turn: 1, signal: new AbortController().signal })
    await handle.flush()
  }
  const dreamCandidate = (): string => JSON.stringify({
    actions: [
      { action: 'create', name: 'dream-created', description: 'новый факт от dream', type: 'project', body: 'тело от dream', importance: 6, reason: 'missing in manifest' },
    ],
  })

  beforeEach(async () => {
    root = await fsp.mkdtemp(join(tmpdir(), 'dsh-dream-reg-'))
    home = await fsp.mkdtemp(join(tmpdir(), 'dsh-dream-home-'))
    store = new MemoryStore(root)
    ctx = new Context()
    reply = () => '{"actions":[]}'
    const oldEnv = process.env.DSH_HOME
    process.env.DSH_HOME = home
    void oldEnv
    await store.write({ name: 'seed-fact', description: 'начальная запись', type: 'project', body: 'тело' }, 'project', root)
  })
  afterEach(async () => {
    await ctx.fiber.dispose()
    delete process.env.DSH_HOME
    await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
    await fsp.rm(home, { recursive: true, force: true })
  })
  const mount = (over: Partial<DreamOptions> = {}, select?: RecallSelector): void => {
    handle = registerDream(ctx, store, { ...baseOptions({ dreamIntervalHours: 0 }), ...over }, select)
  }

  it('дефолт (dream: true, dryRun: false): пишет автоматически и ставит штамп', async () => {
    const selector: RecallSelector = async prompt => {
      expect(prompt).toContain('<manifest>')
      expect(prompt).toContain('seed-fact')
      return dreamCandidate()
    }
    mount({}, selector)
    await stopTurn()
    expect((await store.listAll(root)).map(r => r.name)).toContain('dream-created')
    // штамп .dream записан (проход не повторится на каждом ходу)
    const dir = store.dir('project', root)
    const stamp = await fsp.readFile(join(dir, '.dream'), 'utf8')
    expect(Number(stamp)).toBeGreaterThan(0)
  })

  it('dreamDryRun: true — предложение в логе, записи нет, штамп стоит', async () => {
    const selector: RecallSelector = async () => dreamCandidate()
    mount({ dreamDryRun: true }, selector)
    await stopTurn()
    expect((await store.listAll(root)).map(r => r.name)).not.toContain('dream-created')
    const stamp = await fsp.readFile(join(store.dir('project', root), '.dream'), 'utf8')
    expect(Number(stamp)).toBeGreaterThan(0)
  })

  it('dream: false — проход не запускается', async () => {
    let calls = 0
    mount({ dream: false }, async () => { calls += 1; return dreamCandidate() })
    await stopTurn()
    expect(calls).toBe(0)
    expect((await store.listAll(root)).map(r => r.name)).not.toContain('dream-created')
  })

  it('штамп-интервал: свежий .dream блокирует повторный проход', async () => {
    let calls = 0
    const dir = store.dir('project', root)
    await fsp.mkdir(dir, { recursive: true })
    await fsp.writeFile(join(dir, '.dream'), String(Date.now()), { mode: 0o600 })
    mount({ dreamIntervalHours: 168 }, async () => { calls += 1; return dreamCandidate() })
    await stopTurn()
    expect(calls).toBe(0)
    expect((await store.listAll(root)).map(r => r.name)).not.toContain('dream-created')
  })

  it('субагенты не dream-ят', async () => {
    let calls = 0
    mount({}, async () => { calls += 1; return dreamCandidate() })
    await stopTurn(agentOf({ delegationDepth: 1 }))
    expect(calls).toBe(0)
  })
})
