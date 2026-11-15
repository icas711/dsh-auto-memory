/**
 * 1.11.0: recall подмешивает project-память других рабочих областей ТОГО ЖЕ владельца.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MemoryStore } from '../src/store.ts'
import { createRecaller, renderRecallBlock } from '../src/recall.ts'
import type { RecallAgent, RecallOptions } from '../src/recall.ts'

let root: string
beforeEach(async () => { root = await fsp.mkdtemp(join(tmpdir(), 'dsh-am-op-')) })
afterEach(async () => { await fsp.rm(root, { recursive: true, force: true }) })

const input = (name: string, description = 'Дорожная карта НМЦК') => ({ name, description, type: 'reference' as const, body: 'тело ' + name })
const agent = (cwd: string, owner?: string): RecallAgent => ({
  session: { id: `s-${cwd}-${owner}` as never, header: { cwd, owner } },
  options: {},
})
const opts: RecallOptions = { recall: true, recallMaxMemories: 4, recallMaxBytes: 3000, recallTimeoutMs: 1000, enableUserScope: true }
const messages = [{ source: { kind: 'user' }, content: [{ type: 'text', text: 'дорожная карта НМЦК по сметам' }] }] as never

describe('listOtherProjects', () => {
  it('видит другие области владельца, но не текущую и не чужих владельцев', async () => {
    const store = new MemoryStore(root, { admins: () => [] })
    const a = store.withOwner('anna')
    await a.write(input('roadmap'), 'project', '/ws/one')
    await a.write(input('local'), 'project', '/ws/two')
    await store.withOwner('boris').write(input('secret'), 'project', '/ws/three')
    const others = await a.listOtherProjects('/ws/two')
    expect(others.map(r => r.name)).toEqual(['roadmap'])
    expect(others[0]!.workspace).toMatch(/^--.+--$/)
  })
})

describe('recall по другим областям', () => {
  it('находит запись из другой области, помечает происхождение; чужой владелец — ничего', async () => {
    const store = new MemoryStore(root, { admins: () => [] })
    await store.withOwner('anna').write(input('roadmap'), 'project', '/ws/one')
    const selector = async (prompt: string) => (prompt.includes('roadmap') ? '["roadmap"]' : '[]')
    const recaller = createRecaller(store, opts, selector)
    const hit = await recaller.recall(agent('/ws/two', 'anna'), messages, new AbortController().signal)
    expect(hit?.picked).toEqual(['roadmap'])
    expect(JSON.stringify(hit?.message.content)).toContain('из другой области')
    expect(await recaller.recall(agent('/ws/two', 'boris'), messages, new AbortController().signal)).toBeNull()
  })

  it('recallOtherProjects=false отключает', async () => {
    const store = new MemoryStore(root, { admins: () => [] })
    await store.withOwner('anna').write(input('roadmap'), 'project', '/ws/one')
    const recaller = createRecaller(store, { ...opts, recallOtherProjects: false }, async () => '["roadmap"]')
    expect(await recaller.recall(agent('/ws/two', 'anna'), messages, new AbortController().signal)).toBeNull()
  })

  it('одноимённая запись текущей области приоритетнее', async () => {
    const store = new MemoryStore(root, { admins: () => [] })
    const a = store.withOwner('anna')
    await a.write(input('roadmap'), 'project', '/ws/one')
    await a.write({ ...input('roadmap'), body: 'локальная' }, 'project', '/ws/two')
    const recaller = createRecaller(store, opts, async () => '["roadmap"]')
    const hit = await recaller.recall(agent('/ws/two', 'anna'), messages, new AbortController().signal)
    const text = JSON.stringify(hit?.message.content)
    expect(text).toContain('локальная')
    expect(text).not.toContain('из другой области')
  })

  it('renderRecallBlock: метка содержит имя области', () => {
    const { text } = renderRecallBlock([{ name: 'n', description: 'd', type: 'user', body: 'b', scope: 'project', workspace: '--ws-one--' }], 2000)
    expect(text).toContain('из другой области: ws-one')
  })
})
