/**
 * Решение `ask` (подтверждение человеком) с `bypassPolicy: true`.
 *
 * В сборке хоста политика подтверждений `'never'` без `bypassPolicy` молча отклоняет запрос — и защитные
 * подтверждения (удаление, модерация общего слоя, гейт инъекций) тихо перестали бы работать. Поле есть
 * в решении `ask` целевой сборки, но не в типах установленных зависимостей плагина — отсюда приведение типа.
 */
export function askHuman(reason: string): { kind: 'ask', reason: string } {
  return { kind: 'ask', reason, bypassPolicy: true } as unknown as { kind: 'ask', reason: string }
}
