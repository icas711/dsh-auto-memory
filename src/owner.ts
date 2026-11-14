/**
 * Логин владельца сессии (многопользовательский режим, 1.8.0): берётся из `session.header.owner` (deepseek-harness пишет его в
 * веб-сессиях с авторизацией; в CLI/headless этого поля нет).
 * Возвращает undefined = локальная сессия без логина: старая раскладка каталогов, и она считается админом общего слоя.
 * Пустая строка и не-строка трактуются как «нет owner» — но это значит, что некорректный owner попадёт в локальное представление;
 * развёртывание должно гарантировать, что вход с авторизацией всегда пишет owner (это контракт на стороне dsh, плагин проверить его не может).
 */
export function ownerOf(agent: { session: { header: unknown } } | undefined | null): string | undefined {
  const header = agent?.session.header as { owner?: unknown } | undefined
  const owner = header?.owner
  return typeof owner === 'string' && owner.trim().length > 0 ? owner : undefined
}
