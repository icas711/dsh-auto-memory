/**
 * Гейт против инъекций через память (замена штатного memory-policy): если в текущем ходу агент
 * читал недоверенный внешний контент (документы, веб, поиск), то `memory_write` в этом ходу
 * обрабатывается по режиму gate (П.9, v1.12):
 * - `'ask'` — только через подтверждение человека (прежнее поведение `injectionGate: true`);
 * - `'candidate'` (по умолчанию) — тихий пропуск: запись сохраняется со статусом candidate
 *   и меткой `untrusted: <tool>` (см. tools.ts), видна в health board для ревью; в headless
 *   без ответчика запись больше не блокируется навсегда;
 * - `'off'` — прежнее поведение `injectionGate: false` (и трекинг заражения выключен).
 *
 * Определение «недоверенного» инструмента — список имён/масок `untrustedTools` в конфиге
 * (`*` = любая подстрока; регистр не важен). Инструменты самой памяти (`memory_*`) никогда
 * не считаются источником заражения. Метка хода сбрасывается на границе хода и при закрытии сессии.
 */

import type { Context } from '@deepseek-ai/cordis'
import { askHuman } from './ask.ts'

/** Режимы гейта (П.9): тихая запись кандидатом / подтверждение человека / выключено. */
export type GateMode = 'candidate' | 'ask' | 'off'

/**
 * Нормализация значения конфига: старые булевы `true → 'ask'`, `false → 'off'`;
 * новое строковое перечисление проходит как есть; неизвестное значение → `'candidate'`.
 */
export function normalizeGateMode(value: unknown): GateMode {
  if (value === true) return 'ask'
  if (value === false) return 'off'
  if (value === 'ask' || value === 'candidate' || value === 'off') return value
  return 'candidate'
}

export interface InjectionGateOptions {
  /** Режим гейта (П.9): 'candidate' (по умолчанию) | 'ask' | 'off'; принимаются и старые boolean. */
  injectionGate?: GateMode | boolean
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
  /** Какой инструмент заразил ход (для тестов/отладки и для тихой метки candidate в tools.ts). */
  taintedBy: (sessionId: string) => string | undefined
  cleanup: (sessionId: string) => void
}

export function registerInjectionGate(ctx: Context, options: InjectionGateOptions): InjectionGateHandle {
  const tainted = new Map<string, string>()
  const patterns = (): readonly string[] =>
    options.untrustedTools !== undefined && options.untrustedTools.length > 0 ? options.untrustedTools : DEFAULT_UNTRUSTED_TOOLS
  const mode = (): GateMode => normalizeGateMode(options.injectionGate)

  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = await next()
    if (decision.kind !== 'allow') return decision
    if (mode() === 'off') return decision // 'off': трекинг заражения выключен, поведение старого false
    const sessionId = String((exec as unknown as { agent?: { session?: { id?: unknown } } }).agent?.session?.id ?? '')
    if (sessionId.length === 0) return decision
    if (exec.name === 'memory_write') {
      const source = tainted.get(sessionId)
      if (source === undefined) return decision
      if (mode() === 'candidate') return decision // тихий пропуск: метку ставит tools.ts в execute
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
