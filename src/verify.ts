/**
 * П.6 (v1.12): детерминированная верификация фактов при записи (claim-verify).
 *
 * Зачем: авто-создаваемые project/reference памяти нередко называют файлы, которых нет
 * («настройки лежат в src/config/app.ts» из галлюцинации или устаревшего транскрипта).
 * CC на записи проверяет факты инструментами (форк-агент с Read/Grep); полный агент в
 * плагине дорог — эквивалент делается без LLM: пути-claims из тела кандидата проверяются
 * fs.stat, предложения с несуществующими путями вырезаются (честная деградация), а если
 * остаток мал — кандидат отбрасывается целиком.
 *
 * Точка применения — только ветка create фонового консолиданта, только типы
 * project/reference (см. consolidate.ts); прямые записи модели не трогаем.
 * Все функции чистые и тестируемые; любой сбой — claim считается существующим (fail-open).
 */

import { promises as fsp } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Токен-путь с расширением из белого списка (точка после расширения = конец предложения, не продолжение пути). */
const PATH_CLAIM_RE = /(?:~\/|\.{1,2}\/)?[\w][\w./\\-]*\.(?:ts|tsx|js|mjs|cjs|py|go|rs|md|json|ya?ml|toml|sh)(?![\w/-])/g

/** Известные относительные префиксы: голые имена файлов без пути claims-ом не считаются. */
const KNOWN_PREFIXES = ['src/', 'packages/', './', '../', '~/']

/** Максимум проверяемых claims на одного кандидата (бухгалтерия fs.stat). */
export const MAX_CLAIMS = 20

/**
 * Извлекает пути-claims из тела кандидата: белый список расширений, только относительные
 * пути с известным префиксом; URL и всё с node_modules игнорируются; дедуп, cap 20.
 */
export function extractPathClaims(body: string): string[] {
  const seen = new Set<string>()
  const claims: string[] = []
  for (const raw of body.match(PATH_CLAIM_RE) ?? []) {
    const claim = raw.replaceAll('\\', '/')
    if (claim.includes('://')) continue // URL, не путь
    if (claim.includes('node_modules')) continue
    // префикс проверяется по исходному токену ('./' в normalized уже отрезан)
    if (!KNOWN_PREFIXES.some(prefix => claim.startsWith(prefix))) continue
    if (seen.has(claim)) continue
    seen.add(claim)
    claims.push(claim)
    if (claims.length >= MAX_CLAIMS) break
  }
  return claims
}

/**
 * Проверяет claims через fs.stat относительно cwd (или от home для `~/`).
 * Отсутствующий cwd → все считаются существующими (не верифицируем, не блокируем).
 * Ошибка stat (права и т.п.) трактуется как «существует» — блокируем только уверенно отсутствующие.
 */
export async function verifyPathClaims(claims: readonly string[], cwd: string | undefined): Promise<Array<{ claim: string, exists: boolean }>> {
  if (cwd === undefined || cwd.length === 0) return claims.map(claim => ({ claim, exists: true }))
  const results: Array<{ claim: string, exists: boolean }> = []
  for (const claim of claims) {
    const target = claim.startsWith('~/') ? join(homedir(), claim.slice(2)) : join(cwd, claim)
    try {
      await fsp.stat(target)
      results.push({ claim, exists: true })
    } catch (error) {
      results.push({ claim, exists: (error as NodeJS.ErrnoException).code !== 'ENOENT' })
    }
  }
  return results
}

/**
 * Вырезает предложения, содержащие несуществующие claims. Разбивка по [.!?] и \n,
 * но разрыв только там, где за пунктуацией пробел/конец строки — точки ВНУТРИ путей
 * (`src/config/app.ts`) предложения не режут. Возвращает остаток и число вырезанных;
 * вызывающий решает судьбу кандидата по порогу осмысленного остатка (>= 80 символов).
 */
export function stripFailedSentences(body: string, failedClaims: readonly string[]): { body: string, stripped: number } {
  if (failedClaims.length === 0) return { body, stripped: 0 }
  const sentences = body.split(/(?<=[.!?])(?=\s|$)|\n/)
  const kept: string[] = []
  let stripped = 0
  for (const sentence of sentences) {
    if (sentence.trim().length === 0) continue
    const hit = failedClaims.some(claim => sentence.includes(claim))
    if (hit) {
      stripped += 1
      continue
    }
    kept.push(sentence)
  }
  return { body: kept.join(' ').trim(), stripped }
}
