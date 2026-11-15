# TASK: панель dsh-auto-memory — untrusted-ревью и настройки v1.12

Отдельная задача, выделенная из П.9/v1.12 (план ревизии 2). Бэкенд готов и опубликован
в 1.12.0: тихая запись после чтения недоверенного контента сохраняет файл со статусом
`candidate` и меткой `untrusted: <tool>` в frontmatter (parse/serialize/наследование в
store, `src/store.ts`), receipt в результате `memory_write` (`src/tools.ts`). Записи уже
видны в `health.report` и в хранилище — недостающее только в **клиентской панели**.

## Скоуп

1. **Health board: строка «записано после недоверенного чтения».** Записи с
   `untrusted` (и статусом `candidate`) видны в health board с меткой источника
   (имя инструмента) и one-click действиями: verify / dispute / delete — те же
   маршруты `memory.write` / `memory.delete`, что уже используются панелью для
   кандидатов.
2. **Настройки панели: новые поля v1.12.** В центре настроек (секция Settings,
   `MemoryPage.tsx`) добавить контролы:
   - `injectionGate` — enum `candidate | ask | off` (новый kind `'enum'` уже есть в
     `SETTABLE_FIELDS`, `src/settings.ts`);
   - `recallSessionMaxBytes` (number 0–65536, step 512);
   - `verifyWrites` (boolean);
   - `dream`, `dreamDryRun` (boolean), `dreamIntervalHours`, `dreamMaxActions`,
     `dreamTranscripts` (number).
   Бэкенд `config.get/config.set` уже принимает всё через `SETTABLE_FIELDS` —
   UI-работа только в клиенте.
3. **Локали.** Словарь трёх языков (zh/en/ru, `src/client/locales.ts`): подписи
   полей, текст метки untrusted, подтверждение delete.

## Файлы

- `src/client/MemoryPage.tsx` (~2000 строк) — health board + контролы настроек;
- `src/client/locales.ts` — ключи zh/en/ru;
- `src/memory-api.ts` — только если `health.report` режет поле `untrusted`
  (проверить сериализацию записей; ожидается, что поле проходит как есть).

## Механика (набросок)

- Записи health board группируются по слоям, как сейчас; строка с `untrusted`
  получает бейдж «⚠ после чтения: <tool>» + те же кнопки verify/dispute/delete,
  что у кандидатов (один клик, запрос к существующим маршрутам, рефреш списка).
- Контрол `injectionGate` — выпадающий список из трёх значений; legacy boolean в
  override-файле показывать как мигрированное значение (normalizeGateMode).
- Числовые поля — по образцу существующих (input + ↺ reset на profile-дефолт,
  см. `resetField` в MemoryPage).

## Не в скоупе

- Изменения бэкенда/семантики записи (готово в 1.12.0);
- верификация записей без участия человека;
- новые маршруты API (переиспользуем существующие).

## Тесты/приёмка

- `npm run build` зелёный (клиент собирается tsdown в `lib/client.js`);
- ручной чек: запись после чтения web-страницы в режиме `candidate` появляется
  в health board с меткой источника; verify повышает до `verified` (метка
  `untrusted` сохраняется — наследование уже реализовано в store), delete удаляет;
- переключение `injectionGate` в панели действует со следующего сообщения
  (live-объект), перезапуск не нужен;
- словарь: все новые ключи присутствуют в zh/en/ru (в UI нет «голых» ключей).

## Оценка

M (панель инерционная: много существующей разметки, но все маршруты и данные готовы).
Риски: только регрессия существующих контролов настроек — трогать их точечно.
