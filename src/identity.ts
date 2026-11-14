/**
 * Мост к сервису аутентификации хоста (`webAuth` в веб-сборке dsh): единый источник прав админа
 * и личность автора веб-запроса для маршрутов панели.
 *
 * ВАЖНО: форма сервиса `webAuth` здесь НЕ проверена на реальной сборке (в зависимостях плагина
 * её типов нет). Мост написан «по утиной типизации» и в сомнительных случаях закрывается
 * (fail-closed): нет ответа — считаем «неизвестно», а для панели это 403. Уточните точные
 * методы по `webauth.ts` / `web-identity.ts` сборки и поправьте `ADMIN_CHECKS` / `IDENTIFY`.
 */

import type { Context } from '@deepseek-ai/cordis'

type Loose = Record<string, unknown>

export interface IdentityBridge {
  /** Сервис аутентификации присутствует (многопользовательский веб). Иначе панель работает как раньше (локальный админ). */
  active: () => boolean
  /** true/false — авторитетный ответ хоста; undefined — хост ответить не смог (используется запасной список `admins`). */
  isAdmin: (login: string) => boolean | undefined
  /** Логин автора запроса; undefined — не удалось определить (панель отвечает 403). */
  identify: (request: Request) => Promise<string | undefined>
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

/** Имена методов, под которыми сервис может отдавать проверку админа / личность (подправить по сборке). */
const ADMIN_METHODS = ['isAdmin', 'isAdminLogin'] as const
const ADMIN_COLLECTIONS = ['admins', 'adminLogins'] as const
const IDENTIFY_METHODS = ['identify', 'requestIdentity', 'userFromRequest', 'getRequestUser'] as const

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
        for (const name of IDENTIFY_METHODS) {
          const fn = svc[name]
          if (typeof fn === 'function') {
            const login = toLogin(await (fn as (r: Request) => unknown).call(svc, request))
            if (login !== undefined) return login
          }
        }
      } catch {
        // не смогли определить — fail-closed на стороне вызывающего
      }
      return undefined
    },
  }
}
