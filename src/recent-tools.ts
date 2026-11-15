/**
 * П.3 (v1.12): скользящее окно недавно использованных инструментов сессии.
 *
 * Зачем: селектору recall полезно знать, какими инструментами агент пользовался только что
 * (референс: CC findRelevantMemories.ts:23, 87-95) — reference/API-доки этих инструментов
 * не подмешивать в recall (рабочий usage уже в контексте, шум), но предупреждения и
 * известные проблемы про них — подмешивать.
 *
 * Семантика: «недавно использованные в сессии» — окно никогда не чистится до dispose
 * сессии; повторы поднимают инструмент в конец (most recent last), дубликатов нет,
 * cap 10. Имена `memory_*` в окно не пишутся — они и так не reference-доки.
 */

export interface RecentToolsHandle {
  /** Записать использование инструмента в окно сессии (most recent last). */
  record(sessionId: string, toolName: string): void
  /** Последние до 10 инструментов без дублей, в порядке использования (старые раньше). */
  get(sessionId: string): readonly string[]
  /** Сбросить окно сессии (session/disposed); чужие окна не трогает. */
  cleanup(sessionId: string): void
}

const CAP = 10

export function createRecentTools(): RecentToolsHandle {
  const windows = new Map<string, string[]>()
  return {
    record(sessionId, toolName) {
      if (toolName.length === 0 || toolName.startsWith('memory_')) return
      const window = windows.get(sessionId) ?? []
      const existing = window.indexOf(toolName)
      if (existing >= 0) window.splice(existing, 1) // повторное использование поднимает наверх
      window.push(toolName)
      while (window.length > CAP) window.shift()
      windows.set(sessionId, window)
    },
    get(sessionId) { return windows.get(sessionId) ?? [] },
    cleanup(sessionId) { windows.delete(sessionId) },
  }
}
