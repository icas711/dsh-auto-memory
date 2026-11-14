/**
 * Гейт против инъекций через память (замена штатного memory-policy): если в текущем ходу агент
 * читал недоверенный внешний контент (документы, веб, поиск), то `memory_write` в этом ходу идёт
 * только через подтверждение человека. Так текст из закупочной документации или страницы не может
 * молча прописать себе инструкции в постоянную память.
 *
 * Определение «недоверенного» инструмента — список имён/масок `untrustedTools` в конфиге
 * (`*` = любая подстрока; регистр не важен). Инструменты самой памяти (`memory_*`) никогда
 * не считаются источником заражения. Метка хода сбрасывается на границе хода и при закрытии сессии.
 */

import type { Context } from '@deepseek-ai/cordis'
import { askHuman } from './ask.ts'

export interface InjectionGateOptions {
  /** Включён ли гейт (по умолчанию да). */
  injectionGate?: boolean
  /** Маски имён инструментов, чтение которых «заражает» ход. */
  untrustedTools?: string[]
}

/** Набор по умолчанию: типичные имена; реальные имена вашей сборки задайте в конфиге. */
export const DEFAULT_UNTRUSTED_TOOLS: readonly string[] = [
  'web_*', '*fetch*', '*search*', '*browse*', '*document*', '*pdf*', '*docx*', '*xlsx*', 'read_url*',
]

/** Сопоставление имени с маской (`*` — любая подстрока); экспортируется для тестов. */
export function matchesToolPattern(name: string, pattern: string): boolean {
  const escaped = pattern.toLowerCase().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
  return new RegExp(`^${escaped}$`).test(name.toLowerCase())
}

export function isUntrustedTool(name: string, patterns: readonly string[]): boolean {
  if (name.startsWith('memory_')) return false
  return patterns.some(pattern => matchesToolPattern(name, pattern))
}

export interface InjectionGateHandle {
  /** Какой инструмент заразил ход (для тестов/отладки). */
  taintedBy: (sessionId: string) => string | undefined
  cleanup: (sessionId: string) => void
}

export function registerInjectionGate(ctx: Context, options: InjectionGateOptions): InjectionGateHandle {
  const tainted = new Map<string, string>()
  const patterns = (): readonly string[] =>
    options.untrustedTools !== undefined && options.untrustedTools.length > 0 ? options.untrustedTools : DEFAULT_UNTRUSTED_TOOLS

  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = await next()
    if (decision.kind !== 'allow') return decision
    if (options.injectionGate === false) return decision
    const sessionId = String((exec as unknown as { agent?: { session?: { id?: unknown } } }).agent?.session?.id ?? '')
    if (sessionId.length === 0) return decision
    if (exec.name === 'memory_write') {
      const source = tainted.get(sessionId)
      if (source === undefined) return decision
      return askHuman(`memory_write после чтения внешнего контента (${source}): подтвердите, что запись исходит от вас, а не из текста документа/страницы`)
    }
    if (isUntrustedTool(exec.name, patterns())) tainted.set(sessionId, exec.name)
    return decision
  })

  // Новый ход — чистая метка: если пользователь сам просит «запомни» следующим сообщением, это его явная воля
  ctx.on('agent/turn-stopping', ({ agent }) => {
    tainted.delete(String(agent.session.id))
  })

  return {
    taintedBy: sessionId => tainted.get(sessionId),
    cleanup: sessionId => { tainted.delete(sessionId) },
  }
}
