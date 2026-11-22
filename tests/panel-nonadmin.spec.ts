/**
 * Ограниченный режим панели для не-админа: в UI он видит только СВОИ записи
 * (личные слои + свои записи общего слоя с author = логин), может читать их
 * текст (название/описание/тело) и удалять; общие — только ещё не одобренные
 * (candidate/disputed), одобренные удаляет админ. Чужие записи (включая
 * одобренные общие, видимые в инъекциях) в панель не-админа не попадают.
 * Права удаления общего слоя проверяет MemoryStore (единая точка).
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { MemoryStore, projectKey } from '../src/store.ts'
import { registerMemoryApi } from '../src/memory-api.ts'
import type { IdentityBridge } from '../src/identity.ts'

const BASE = '/api/auto-memory'
const CWD = '/work/alice-proj'

interface RegisteredRoute {
  path: string
  fetch: (request: Request) => Promise<Response>
}

let base: string
let store: MemoryStore
let routes: Map<string, RegisteredRoute['fetch']>

/** Мост-подделка: личность по фиксированному логину, роли нет → решает список admins. */
function bridgeAs(login: string | undefined): IdentityBridge {
  return {
    active: () => true,
    isAdmin: () => undefined,
    identify: async () => (login === undefined ? undefined : { login }),
  }
}

function mount(viewerLogin: string | undefined): void {
  routes = new Map()
  const connection = {
    fetch: {
      register: (route: RegisteredRoute): void => { routes.set(route.path, route.fetch) },
    },
  }
  const ctx = { get: (name: string) => (name === 'connection' ? connection : undefined) } as unknown as Context
  registerMemoryApi(ctx, store, store.personalRootDir(), { maxBytes: 4096 }, { maxBytes: 4096 }, bridgeAs(viewerLogin))
}

function get(path: string): Promise<Response> {
  const [routePath, query] = path.split('?')
  const handler = routes.get(`${BASE}/${routePath!}`)
  if (handler === undefined) throw new Error(`route not registered: ${routePath}`)
  return handler(new Request(`http://local${BASE}/${routePath!}${query !== undefined ? `?${query}` : ''}`))
}

function post(path: string, payload: unknown): Promise<Response> {
  const handler = routes.get(`${BASE}/${path}`)
  if (handler === undefined) throw new Error(`route not registered: ${path}`)
  return handler(new Request(`http://local${BASE}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}

async function groupsBody(): Promise<{
  restricted?: boolean
  claudeImportPending?: number
  groups: Array<{ key: string, scope: string, slug: string, current?: boolean, indexText: string | null, memories: Array<{ name: string, title?: string, description: string, status?: string, author?: string }> }>
}> {
  const response = await get('groups.list')
  expect(response.status).toBe(200)
  return response.json() as never
}

beforeEach(async () => {
  base = await fsp.mkdtemp(join(tmpdir(), 'dsh-panel-limited-'))
  store = new MemoryStore(join(base, 'memory-root'), { admins: ['boss'] })
})

afterEach(async () => {
  await fsp.rm(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
})

describe('groups.list в ограниченном режиме', () => {
  it('видны личные слои владельца и только свои записи общего слоя; чужих нет', async () => {
    const alice = store.withOwner('alice')
    const boss = store.withOwner('boss')
    await alice.write({ name: 'alice-user', title: 'Моя заметка', description: 'личное', type: 'user', body: 'тело' }, 'user')
    await alice.write({ name: 'alice-proj', description: 'проектное', type: 'project', body: 'тело' }, 'project', CWD)
    await alice.write({ name: 'alice-shared', description: 'моя общая', type: 'reference', body: 'тело' }, 'shared')
    await alice.write({ name: 'alice-pending', description: 'ждёт одобрения', type: 'reference', body: 'тело' }, 'shared')
    await boss.write({ name: 'boss-shared', description: 'чужая общая', type: 'reference', body: 'тело' }, 'shared')

    mount('alice')
    const body = await groupsBody()
    expect(body.restricted).toBe(true)
    // Подсказка импорта Claude — админская, ограниченному режиму не приходит
    expect(body.claudeImportPending).toBe(-1)

    const byScope = new Map(body.groups.map(g => [g.scope, g] as const))
    const userGroup = byScope.get('user')
    const projectGroup = byScope.get('project')
    const sharedGroup = byScope.get('shared')
    expect(userGroup?.memories.map(m => m.name)).toEqual(['alice-user'])
    expect(projectGroup?.memories.map(m => m.name)).toEqual(['alice-proj'])
    // Общий слой: только записи alice; описание и авторство на месте
    expect(sharedGroup?.memories.map(m => m.name).sort()).toEqual(['alice-pending', 'alice-shared'])
    expect(sharedGroup?.memories.find(m => m.name === 'alice-shared')).toMatchObject({ description: 'моя общая', author: 'alice' })
    // Индекс общего слоя не отдаётся (в нём строки чужих записей — утечка)
    expect(sharedGroup?.indexText).toBeNull()

    // Чужих записей нет нигде
    const allNames = body.groups.flatMap(g => g.memories.map(m => m.name))
    expect(allNames).not.toContain('boss-shared')

    // Текущая рабочая область помечается как раньше
    const marked = await get(`groups.list?cwd=${encodeURIComponent(CWD)}`)
    const markedBody = await marked.json() as typeof body
    expect(markedBody.groups.find(g => g.scope === 'project')?.current).toBe(true)
    expect(markedBody.groups.find(g => g.scope === 'project')?.slug).toBe(projectKey(CWD))
  })

  it('админ видит панель без ограничений (restricted: false), общих групп в его панели нет', async () => {
    await store.withOwner('alice').write({ name: 'alice-user', description: 'личное', type: 'user', body: 'тело' }, 'user')
    await store.withOwner('alice').write({ name: 'alice-shared', description: 'общая alice', type: 'reference', body: 'тело' }, 'shared')

    mount('boss')
    const body = await groupsBody()
    expect(body.restricted).toBe(false)
    // Панель админа — прежнее общее представление (локальный корень), личное чужое не утекает
    const allNames = body.groups.flatMap(g => g.memories.map(m => m.name))
    expect(allNames).not.toContain('alice-user')
    expect(allNames).not.toContain('alice-shared')
  })
})

describe('memory.read в ограниченном режиме', () => {
  it('свои записи читаются с телом; чужие общие — 404', async () => {
    const alice = store.withOwner('alice')
    const boss = store.withOwner('boss')
    await alice.write({ name: 'mine', description: 'моё', type: 'user', body: 'секретное-моё' }, 'user')
    await alice.write({ name: 'mine-shared', description: 'моя общая', type: 'reference', body: 'моё-общее' }, 'shared')
    await boss.write({ name: 'theirs', description: 'чужая одобренная', type: 'reference', body: 'чужое' }, 'shared')
    await boss.write({ name: 'theirs-pending', description: 'чужая на модерации', type: 'reference', body: 'чужое' }, 'shared')

    mount('alice')
    const own = await get('memory.read?name=mine&scope=user')
    expect(own.status).toBe(200)
    expect(((await own.json()) as { body: string }).body).toBe('секретное-моё')

    const ownShared = await get('memory.read?name=mine-shared&scope=shared')
    expect(ownShared.status).toBe(200)
    expect(((await ownShared.json()) as { body: string }).body).toBe('моё-общее')

    // Чужие (одобренная и кандидат) — 404: панель не-админа их не показывает
    for (const name of ['theirs', 'theirs-pending']) {
      expect((await get(`memory.read?name=${name}&scope=shared`)).status).toBe(404)
    }
    // Чужого личного слоя не существует в личном корне alice
    expect((await get('memory.read?name=nothing&scope=user')).status).toBe(404)
  })
})

describe('memory.delete в ограниченном режиме', () => {
  it('свою личную запись удаляет; свою не одобренную общую удаляет; свою одобренную общую — нет', async () => {
    const alice = store.withOwner('alice')
    const boss = store.withOwner('boss')
    await alice.write({ name: 'mine', description: 'моё', type: 'user', body: 'тело' }, 'user')
    await alice.write({ name: 'mine-candidate', description: 'ждёт', type: 'reference', body: 'тело' }, 'shared')
    await alice.write({ name: 'mine-disputed', description: 'спорная', type: 'reference', body: 'тело' }, 'shared')
    await alice.write({ name: 'mine-verified', description: 'одобрена админом', type: 'reference', body: 'тело' }, 'shared')
    await boss.write({ name: 'theirs', description: 'чужая', type: 'reference', body: 'тело' }, 'shared')
    // Одобрение админом переводит запись в verified
    await boss.approve('mine-verified')
    const sharedDir = join(base, 'memory-root', '_shared')

    mount('alice')
    // Личная запись — удаляется
    expect((await post('memory.delete', { scope: 'user', name: 'mine' })).status).toBe(200)
    expect(await alice.read('mine', 'user')).toBeNull()

    // Свои не одобренные общие (кандидат и спорная) — удаляются
    expect((await post('memory.delete', { scope: 'shared', name: 'mine-candidate' })).status).toBe(200)
    expect(await fsp.access(join(sharedDir, 'mine-candidate.md')).then(() => true, () => false)).toBe(false)
    expect((await post('memory.delete', { scope: 'shared', name: 'mine-disputed' })).status).toBe(200)

    // Своя одобренная — store отклоняет (400), файл на месте
    const denied = await post('memory.delete', { scope: 'shared', name: 'mine-verified' })
    expect(denied.status).toBe(400)
    expect(await fsp.access(join(sharedDir, 'mine-verified.md')).then(() => true, () => false)).toBe(true)

    // Чужая запись — store отклоняет (400), файл на месте
    expect((await post('memory.delete', { scope: 'shared', name: 'theirs' })).status).toBe(400)
    expect(await fsp.access(join(sharedDir, 'theirs.md')).then(() => true, () => false)).toBe(true)

    // Несуществующая — 404
    expect((await post('memory.delete', { scope: 'user', name: 'ghost' })).status).toBe(404)
  })

  it('запись текущего проекта удаляется по cwd; project без cwd — 400', async () => {
    const alice = store.withOwner('alice')
    await alice.write({ name: 'proj-note', description: 'проектное', type: 'project', body: 'тело' }, 'project', CWD)

    mount('alice')
    expect((await post('memory.delete', { scope: 'project', name: 'proj-note' })).status).toBe(400)
    const ok = await post('memory.delete', { scope: 'project', name: 'proj-note', cwd: CWD })
    expect(ok.status).toBe(200)
    expect(await alice.read('proj-note', 'project', CWD)).toBeNull()
  })
})
