/**
 * 1.7.0 русский язык: токенизатор, даты/единицы в детекторе противоречий, подавление болтовни.
 * До этого кириллица считалась разделителем и все лексические механизмы были слепы к русскому тексту.
 */

import { describe, expect, it } from 'vitest'
import { words, descriptionCoverage, descriptionSimilarity, detectContradictions, pickBestMatch } from '../src/matching.ts'
import { isChitchat } from '../src/consolidate.ts'
import type { MemoryRecord } from '../src/types.ts'

describe('words(кириллица)', () => {
  it('склонения одного слова сводятся к общему стему', () => {
    const a = words('закупки')
    const b = words('закупка')
    const c = words('закупок')
    expect([...a]).toEqual([...b])
    expect([...b]).toEqual([...c])
  })
  it('ё = е, регистр не важен', () => {
    expect([...words('Ёлка')]).toEqual([...words('елка')])
  })
  it('короткие слова и стоп-слова отбрасываются', () => {
    expect(words('и в на это как для').size).toBe(0)
  })
  it('смешанный текст: латиница + кириллица + CJK', () => {
    const w = words('Пользователь любит python и 用户偏好')
    expect(w.has('python')).toBe(true)
    expect(w.has('польз')).toBe(true)
    expect(w.has('用户')).toBe(true)
  })
  it('прежнее поведение для латиницы и CJK не изменилось', () => {
    expect([...words('用户偏好 python')]).toEqual(['用户', '户偏', '偏好', 'python'])
  })
})

describe('лексические метрики на русском', () => {
  it('descriptionCoverage видит пересечение по смыслу слов', () => {
    const q = 'как устроено дробление закупок'
    const line = 'Проект выявления дробления закупок через эмбеддинги'
    expect(descriptionCoverage(q, line)).toBeGreaterThan(0.5)
  })
  it('descriptionSimilarity различает похожее и несвязанное', () => {
    const near = descriptionSimilarity('Пользователь предпочитает ответы на русском языке', 'Предпочитает ответы на русском языке')
    const far = descriptionSimilarity('Пользователь предпочитает ответы на русском языке', 'Сервер с видеокартами H200 стоит в стойке')
    expect(near).toBeGreaterThan(far)
    expect(near).toBeGreaterThanOrEqual(0.5)
  })
  it('pickBestMatch: русское описание-перепев находит существующую запись', () => {
    const existing: MemoryRecord[] = [{
      name: 'answers-language', description: 'Пользователь просит отвечать по-русски кратко', type: 'feedback', body: 'b', scope: 'user',
    }]
    const match = pickBestMatch({ name: 'reply-style', description: 'Пользователь просит отвечать по-русски кратко' }, existing)
    expect(match?.existing.name).toBe('answers-language')
  })
})

describe('detectContradictions(русские даты и единицы)', () => {
  it('разные даты DD.MM.YYYY', () => {
    const signals = detectContradictions(
      { description: 'Дедлайн', body: 'Сдача проекта 01.12.2026' },
      { description: 'Дедлайн', body: 'Сдача проекта 15.01.2027' },
    )
    expect(signals.some(s => s.kind === 'date')).toBe(true)
  })
  it('даты словами: «15 октября 2026» против «20 ноября 2026»', () => {
    const signals = detectContradictions(
      { description: 'Релиз', body: 'Релиз 15 октября 2026' },
      { description: 'Релиз', body: 'Релиз 20 ноября 2026' },
    )
    expect(signals.some(s => s.kind === 'date')).toBe(true)
  })
  it('одна и та же дата в разных записях — не противоречие', () => {
    const signals = detectContradictions(
      { description: 'Релиз', body: 'Релиз 15 октября 2026' },
      { description: 'Релиз', body: 'Релиз 15.10.2026' },
    )
    expect(signals.some(s => s.kind === 'date')).toBe(false)
  })
  it('одна единица, разные значения: 5 человек против 8 человек', () => {
    const signals = detectContradictions(
      { description: 'Команда', body: 'В команде 5 человек' },
      { description: 'Команда', body: 'В команде 8 человек' },
    )
    expect(signals.some(s => s.kind === 'number')).toBe(true)
  })
  it('склонения единиц нормализуются: 3 дня против 7 дней', () => {
    const signals = detectContradictions(
      { description: 'Срок', body: 'Срок поставки 3 дня' },
      { description: 'Срок', body: 'Срок поставки 7 дней' },
    )
    expect(signals.some(s => s.kind === 'number')).toBe(true)
  })
})

describe('isChitchat(русские приветствия)', () => {
  it('чистая болтовня подавляется', () => {
    expect(isChitchat('Привет!')).toBe(true)
    expect(isChitchat('Спасибо, пока')).toBe(true)
    expect(isChitchat('ок')).toBe(true)
    expect(isChitchat('Понял')).toBe(true)
  })
  it('приветствие с содержательной частью сохраняется', () => {
    expect(isChitchat('Привет! Я работаю архитектором в департаменте закупок и пишу на Dart')).toBe(false)
    expect(isChitchat('Здравствуйте, нужно всегда отвечать по-русски и не использовать эмодзи')).toBe(false)
  })
  it('слово «показать» не считается прощанием', () => {
    expect(isChitchat('Нужно показать отчёт заказчику в понедельник утром')).toBe(false)
  })
  it('прежнее поведение для китайского и английского', () => {
    expect(isChitchat('你好')).toBe(true)
    expect(isChitchat('hello, I prefer tabs over spaces in all projects')).toBe(false)
  })
})
