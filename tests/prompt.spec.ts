/**
 * 提示词渲染层测试:花括号中和(审查 major 回归:3+ 连续 { 会残留 {{,
 * 在 0.1.5-rc.2 严格插值下炸掉全部模型请求)。
 * П.2 (v1.12): секция «verify before recommending» в MEMORY_POLICY_TEXT.
 */

import { describe, expect, it } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MemoryStore } from '../src/store.ts'
import { MEMORY_POLICY_TEXT, neutralizeBraces, renderMemoryIndexDetail } from '../src/prompt.ts'

describe('neutralizeBraces', () => {
  it('双花括号被中和', () => {
    expect(neutralizeBraces('a {{footer}} b')).toBe('a { {footer}} b')
    expect(neutralizeBraces('a {{footer}} b')).not.toContain('{{')
  })
  it('三个连续左花括号不残留 {{(Mustache raw partial 场景)', () => {
    expect(neutralizeBraces('Mustache raw partial: {{{footer}}}')).not.toContain('{{')
  })
  it('四个连续左花括号同样干净', () => {
    expect(neutralizeBraces('{{{{a}}}}')).not.toContain('{{')
  })
  it('大量连续左花括号收敛', () => {
    expect(neutralizeBraces('{'.repeat(50))).not.toContain('{{')
  })
  it('无花括号原样返回', () => {
    expect(neutralizeBraces('plain text 中文')).toBe('plain text 中文')
  })
})

describe('MEMORY_POLICY_TEXT: verify-before-recommending (П.2)', () => {
  it('секция «claims from the past» присутствует после Rules', () => {
    expect(MEMORY_POLICY_TEXT).toContain('Recalled memories are claims from the past:')
    expect(MEMORY_POLICY_TEXT).toContain('Before recommending it: check the file exists /')
    expect(MEMORY_POLICY_TEXT).toContain('trust the\n  observation — and update or delete the stale memory')
    expect(MEMORY_POLICY_TEXT).toContain('prefer git log and reading the\n  code over recalling a memory snapshot.')
  })
  it('секция стоит после Rules и до Layers', () => {
    const rules = MEMORY_POLICY_TEXT.indexOf('Rules:')
    const claims = MEMORY_POLICY_TEXT.indexOf('Recalled memories are claims from the past:')
    const layers = MEMORY_POLICY_TEXT.indexOf('Layers:')
    expect(rules).toBeGreaterThan(-1)
    expect(claims).toBeGreaterThan(rules)
    expect(layers).toBeGreaterThan(claims)
  })
  it('renderMemoryIndexDetail: секция попадает в инъекцию, бюджет соблюдается', async () => {
    const root = await fsp.mkdtemp(join(tmpdir(), 'dsh-prompt-'))
    try {
      const store = new MemoryStore(root)
      await store.write({ name: 'a', description: 'about a', type: 'project', body: 'body a' }, 'project', '/w/p')
      const detail = renderMemoryIndexDetail(store, { maxBytes: 4096, enableUserScope: false, autoSummarize: false } as never, '/w/p')
      expect(detail.text).toContain('Recalled memories are claims from the past:')
      expect(detail.textBytes).toBeLessThanOrEqual(4096)
    } finally {
      await fsp.rm(root, { recursive: true, force: true })
    }
  })
})
