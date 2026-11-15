/**
 * Лимит текста записи: больше предела — явная ошибка и ничего не пишется (раньше тихая обрезка по 2000 символов).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { MemoryStore } from '../src/store.ts'
import { registerMemoryTools } from '../src/tools.ts'
import { MEMORY_BODY_MAX_CHARS } from '../src/types.ts'
import { MEMORY_POLICY_TEXT } from '../src/prompt.ts'

type Tool = { execute: (args: Record<string, unknown>, exec: unknown) => Promise<unknown> }
let root: string
let store: MemoryStore
let write: Tool['execute']
const exec = { agent: { session: { id: 's1', header: { cwd: '/work/p' } } } }
const args = (body: string) => ({ name: 'doc', description: 'Документ', type: 'reference', body, scope: 'user' })

beforeEach(async () => {
  root = await fsp.mkdtemp(join(tmpdir(), 'dsh-body-'))
  store = new MemoryStore(root)
  const tools = new Map<string, Tool>()
  const ctx = {
    tools: { register: (tool: Tool & { name: string }) => { tools.set(tool.name, tool); return () => {} } },
    on: () => () => {},
  } as unknown as Context
  registerMemoryTools(ctx, store, { enableUserScope: true })
  write = tools.get('memory_write')!.execute
})
afterEach(async () => { await fsp.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }) })

describe('лимит текста memory_write', () => {
  it('ровно по пределу сохраняется целиком, без обрезки', async () => {
    const body = 'я'.repeat(MEMORY_BODY_MAX_CHARS)
    await write(args(body), exec)
    expect((await store.read('doc', 'user'))?.body).toBe(body)
  })

  it('длиннее предела — ошибка с инструкцией, ничего не записано', async () => {
    await expect(write(args('я'.repeat(MEMORY_BODY_MAX_CHARS + 1)), exec)).rejects.toThrow(/nothing was saved/)
    expect(await store.read('doc', 'user')).toBeNull()
  })

  it('политика прямо говорит про лимит и про слой user', () => {
    expect(MEMORY_POLICY_TEXT).toContain(String(MEMORY_BODY_MAX_CHARS))
    expect(MEMORY_POLICY_TEXT).toContain('scope user')
  })
})
