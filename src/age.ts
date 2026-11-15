/**
 * П.1 (v1.12): человеческий возраст памяти вместо ISO-дат.
 *
 * Зачем: модели плохи в арифметике дат — «updated 2026-11-13» не триггерит рассуждение о старости
 * записи, тогда как «47 days ago» сразу читается как «давно, стоит перепроверить»
 * (референс: CC memdir/memoryAge.ts:12-21, 33-50).
 *
 * Все функции чистые: `now` передаётся параметром (по умолчанию Date.now()), поэтому тесты
 * детерминированы без fake timers; разница в будущем (часы сессии впереди записи) clamps в 0.
 */

const DAY_MS = 86_400_000

/** Полных дней с момента `ms`; `ms === undefined` → 0; дата в будущем → 0. */
export function ageDays(ms: number | undefined, now: number = Date.now()): number {
  if (ms === undefined) return 0
  const days = Math.floor((now - ms) / DAY_MS)
  return days < 0 ? 0 : days
}

/** Человеческий возраст: 'today' | 'yesterday' | 'N days ago'; `ms === undefined` → '' (возраст неизвестен). */
export function humanAge(ms: number | undefined, now: number = Date.now()): string {
  if (ms === undefined) return ''
  const days = ageDays(ms, now)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/**
 * Caveat для записей старше суток (≥ 2 дней): одна строка-предупреждение.
 * Свежим записям (≤ 1 дня) и неизвестному возрасту — пусто (байты не тратим).
 */
export function stalenessNote(ms: number | undefined, now: number = Date.now()): string {
  if (ms === undefined) return ''
  const days = ageDays(ms, now)
  return days > 1 ? `(This memory is ${days} days old — verify before relying on it.)` : ''
}
