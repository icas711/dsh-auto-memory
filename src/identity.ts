/**
 * Мост к сервису аутентификации хоста (`webAuth` в веб-сборке dsh): единый источник прав админа
 * и личность автора веб-запроса для маршрутов панели.
 *
 * Личность запроса берётся тем же способом, что и в хосте (`requestIdentity` в web-identity.ts):
 * `webAuth.identityFromCookie(заголовок cookie)` → `WebIdentity` с полями `login` и `admin`.
 * Роль из этой личности авторитетна для маршрутов панели.
 *
 * НЕ известно (в сборке не видно): есть ли у `webAuth` проверка «логин → админ» без запроса. Для
 * инструментов памяти (там есть только `session.header.owner`, а не cookie) мост пробует
 * несколько типичных имён (`isAdmin`, коллекция `admins`); если ничего не нашлось, права админа
 * решает запасной список `admins` из конфига плагина. Всё сомнительное закрывается (fail-closed).
 */

import type { Context } from '@deepseek-ai/cordis'

type Loose = Record<string, unknown>

/** Личность автора веб-запроса. */
export interface RequestIdentity {
  login: string
  /** Роль по данным хоста (true/false); undefined — хост роль не сообщил. */
  admin?: boolean
}

export interface IdentityBridge {
  /** Сервис аутентификации присутствует (многопользовательский веб). Иначе панель работает как раньше (локальный админ). */
  active: () => boolean
  /** true/false — авторитетный ответ хоста; undefined — хост ответить не смог (используется запасной список `admins`). */
  isAdmin: (login: string) => boolean | undefined
  /** Автор запроса (логин и роль по данным хоста); undefined — не удалось определить (панель отвечает 403). */
  identify: (request: Request) => Promise<RequestIdentity | undefined>
}

function toLogin(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (value !== null && typeof value === 'object') {
    const obj = value as Loose
    for (const key of ['login', 'username', 'user', 'id', 'name']) {
      const v = obj[key]
      if (typeof v === 'string' && v.length > 0) return v
    }
  }
  return undefined
}

/** Предположительные имена проверки «логин → админ» (в сборке не подтверждены). */
const ADMIN_METHODS = ['isAdmin', 'isAdminLogin'] as const
const ADMIN_COLLECTIONS = ['admins', 'adminLogins'] as const

export function createIdentityBridge(ctx: Context): IdentityBridge {
  const service = (): Loose | undefined => {
    const svc = (ctx as unknown as { get: (name: string) => unknown }).get('webAuth')
    return svc !== null && typeof svc === 'object' ? svc as Loose : undefined
  }
  return {
    active: () => service() !== undefined,
    isAdmin: login => {
      const svc = service()
      if (svc === undefined) return undefined
      try {
        for (const name of ADMIN_METHODS) {
          const fn = svc[name]
          if (typeof fn === 'function') {
            const answer = (fn as (l: string) => unknown).call(svc, login)
            if (typeof answer === 'boolean') return answer
          }
        }
        for (const name of ADMIN_COLLECTIONS) {
          const coll = svc[name]
          if (coll instanceof Set) return coll.has(login)
          if (Array.isArray(coll)) return coll.includes(login)
        }
      } catch {
        // сервис недоступен/упал — «не знаю», решает запасной список
      }
      return undefined
    },
    identify: async request => {
      const svc = service()
      if (svc === undefined) return undefined
      try {
        const fn = svc.identityFromCookie
        if (typeof fn !== 'function') return undefined
        const identity = await (fn as (cookie: string | undefined) => unknown).call(svc, request.headers.get('cookie') ?? undefined)
        const login = toLogin(identity)
        if (login === undefined) return undefined // нет живой сессии
        const admin = (identity as Loose).admin
        return typeof admin === 'boolean' ? { login, admin } : { login }
      } catch {
        // не смогли определить — fail-closed на стороне вызывающего
        return undefined
      }
    },
  }
}
