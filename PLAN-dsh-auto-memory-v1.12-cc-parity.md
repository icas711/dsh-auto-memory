# PLAN: dsh-auto-memory v1.12 — паритет с Claude Code (8 пунктов)

План имплементации идей из слитых исходников Claude Code в плагин
`dsh-auto-memory` (клон icas711, рабочая версия 1.10.0-v3).
Ссылки `src/...` — файлы плагина; `CC <файл>:<строка>` — референс из исходников
Claude Code (в workspace, `query.ts` и т.д.).

> **Правки ревизии 2 (по решению владельца):**
> 1. **П.7 (dream) — полностью автоматический с первого релиза**: `dream: true`,
>    `dreamDryRun: false` по умолчанию; dry-run остаётся режимом превью/отладки.
>    Исключение из принципа 5, безопасность — через guardrails П.7.
> 2. **П.4 — merge вместо скипа**: прямая запись больше не заставляет фоновую
>    консолидацию пропускать диапазон; пересекающиеся факты доливаются в
>    существующие памяти через merge-якоря (update по точному имени), удаления
>    уважаются (имя не воскрешается).

## 0. Принципы (не нарушать)

1. **Fail-open**: любой сбой нового кода — тихий пропуск, сессия никогда не
   падает из-за памяти (дисциплина `src/recall.ts:20-25`).
2. **KV-стабильность**: всё новое в recall — доложивание в хвост решения
   `enter`; изменения системного промпта — только на границе релиза.
3. **Бюджет-бухгалтерия**: байты любых новых текстов (caveat, note) считаются
   в существующих бюджетах (`renderRecallBlock`, `indexByteBudget`).
4. **Единая точка записи**: всё через `store.write` (модерация shared,
   directive-guard, секреты — не обходить).
5. **Флаг по умолчанию**: поведение, меняющее запись/удаление (п.6, п.7) —
   opt-in или dry-run на первом релизе. **Исключение (решение владельца,
   ревизия 2): П.7 идёт в первом релизе полностью автоматическим**
   (`dream: true`, `dreamDryRun: false`) — риск закрывают guardrails П.7:
   запрет удалений (supersede вместо delete), skip pinned/disputed/verified,
   cap действий, запись только через `store.write`.
6. **Каждый пункт**: Config-схема (`src/index.ts`) → SETTABLE_FIELDS
   (`src/settings.ts`, live-панель) → тесты `tests/` → README/CHANGELOG/
   LIMITATIONS → прогон `vitest run` + `evals/l0`.

---

## П.1. Человеческий возраст памяти + staleness caveat

**Референс:** CC `memdir/memoryAge.ts:12-21` — «today / yesterday / 47 days
ago», мотивация: «модели плохи в арифметике дат — ISO не триггерит рассуждения
о старости»; `memoryAge.ts:33-50` — caveat для записей старше суток.

**Файлы:** новый `src/age.ts`; правки `src/recall.ts`; тесты `tests/recall.spec.ts`.

**Механика:**
1. `src/age.ts` (чистые функции):
   - `ageDays(ms?: number): number` — floor, негативные clamps в 0;
   - `humanAge(ms?: number): string` — `'today' | 'yesterday' | 'N days ago'`,
     `ms === undefined → ''`;
   - `stalenessNote(ms?: number): string` — `''` для ≤1 дня; иначе одна строка:
     `(This memory is N days old — verify before relying on it.)`.
2. `recall.ts renderRecallBlock` (сейчас `:188` рендерит
   `updated ${dateOf(...)}` ISO):
   - заголовок: `updated ${humanAge(...)}` вместо ISO-даты;
   - после `body` — `stalenessNote(record.updatedMs ?? record.createdMs)`;
   - байты note входят в `used` (бюджет-бухгалтерия): считать block целиком,
     существующая логика обрезки не меняется.
3. `dateOf` остаётся (используется в логах/аудите), из рендера уходит.

**Edge cases:** запись с `validUntil` в будущем; `updatedMs` отсутствует
(старые файлы) → человеческий возраст от `createdMs`; оба отсутствуют → без
возраста, без note.

**Тесты:** сегодня/вчера/47 дней; note отсутствует для свежих; note попадает
в бюджет (блок обрезается вместе с note); reset часов (fake timers).

**Приёмка:** в `<memory_recall>` нет ISO-дат; для записей >1 суток виден caveat.

---

## П.2. Блок «verify before recommending» в промптах

**Референс:** CC `memdir/memoryTypes.ts:245-253` («память, называющая
файл/функцию/флаг — утверждение о моменте записи; проверь существование /
сделай grep; "memory says X exists" ≠ "X exists now"») и `:255` (про «recent»
вопросы лучше `git log`).

**Файлы:** `src/prompt.ts` (MEMORY_POLICY_TEXT, RECALL_NOTE в recall.ts); 
тесты `tests/prompt.spec.ts`, `tests/recall.spec.ts`; `evals/l0/index-budget.spec.ts`.

**Механика:**
1. В `MEMORY_POLICY_TEXT` (`prompt.ts:176-211`) добавить секцию после Rules:

   ```
   Recalled memories are claims from the past:
   - A memory naming a file, function, or flag is a claim that it existed when
     the memory was written. Before recommending it: check the file exists /
     grep for the symbol.
   - If a recalled memory conflicts with what you observe now, trust the
     observation — and update or delete the stale memory (memory_write with
     the same name).
   - For questions about recent/current state prefer git log and reading the
     code over recalling a memory snapshot.
   ```

2. `RECALL_NOTE` (`recall.ts:76`) дополнить одним предложением:
   `Memories name files and facts as they were when written; verify before
   relying on them.`

**Бухгалтерия:** `indexByteBudget` (`prompt.ts:217-219`) вычитает
`MEMORY_POLICY_TEXT` автоматически — бюджет индекса уменьшится на ~400B; 
обновить ожидания `index-budget.spec.ts` и usage-бар панели (тот же расчёт).

**KV:** системный промпт меняется один раз на релиз — допустимо (принцип 2).

**Приёмка:** policy-текст содержит секцию; L0 index-budget зелёный с новым
размером; в recall-сообщении видна новая строка note.

---

## П.3. recentTools в селектор recall

**Референс:** CC `memdir/findRelevantMemories.ts:23, 87-95` — селектору
передаются недавно использованные инструменты; reference/API-доки этих
инструментов не подмешивать (шум: рабочее usage уже в контексте), но
предупреждения/gotchas про них — подмешивать.

**Файлы:** новый `src/recent-tools.ts`; правки `src/recall.ts` 
(`buildSelectorPrompt`, `createRecaller`), `src/index.ts` (регистрация);
тесты `tests/recall.spec.ts` + новый `tests/recent-tools.spec.ts`.

**Механика:**
1. `src/recent-tools.ts`:
   ```ts
   export interface RecentToolsHandle {
     record(sessionId: string, toolName: string): void
     get(sessionId: string): readonly string[]   // последние до 10, без дублей
     cleanup(sessionId: string): void
   }
   export function createRecentTools(): RecentToolsHandle
   ```
   Внутри `Map<string, string[]>` (упорядоченный список, уникальные,
   cap 10 — «most recent last»).
2. Заполнение: в `registerRecall` добавить слушатель `tools/pre-execute`
   (событие подтверждено хостом; плагин уже слушает его в
   `injection-gate.ts:49`): после `await next()` при
   `decision.kind === 'allow'` → `record(sessionId, exec.name)`.
   Скользящее окно никогда не чистится до cleanup сессии — семантика
   «недавно использованные в сессии».
3. `buildSelectorPrompt(query, candidates, maxMemories, recentTools?)`:
   перед `</user_message>` секция
   `Recently used tools: ${recentTools.join(', ')}` и правило из CC:
   do not select reference/API-documentation memories for these tools;
   DO select memories with warnings, gotchas, or known issues about them.
4. `createRecaller` получает `recentTools` через новый колбэк-параметр
   `getRecentTools: (sessionId) => readonly string[]` (DI для тестов).
5. `memory_*` имена в окно можно не писать — они и так не reference-доки.

**Конфиг:** без нового поля (бесплатно, всегда включено).

**Тесты:** окно копится/уникализируется/cap 10; cleanup; промпт содержит
секцию при непустом окне и не содержит при пустом; селекторный тест с
reference-памятью об используемом tool → не выбрана (fake selector на строку
промпта), gotcha-память про тот же tool → выбрана.

**Приёмка:** при активной работе с tool X его API-дока не всплывает в recall.

---

## П.4. Прямая запись ↔ консолидация: merge вместо скипа (ревизия 2)

**Референс:** CC `services/extractMemories/extractMemories.ts:121-148`
(`hasMemoryWritesSince`) и `:345-360` — если основной агент уже писал память
в обработанных ходах, фоновый экстрактор пропускает диапазон целиком.
**Отступление от CC (решение владельца): скип-range терял факты, которые
модель не записала, но которые были в этих ходах. Вместо исключения —
слияние:** консолидация выполняется как обычно, а памяти, записанные напрямую,
становятся merge-якорями (обновление по точному имени), прямые удаления —
запретом на воскрешение имени.

**Почему merge безопасен уже сейчас (существующая база):**
- `store.write` по существующему имени = update: замена тела с сохранением
  статусов echo-update (`consolidate.ts:547-550`), нового файла-дубля нет;
- промпт консолидации уже требует переиспользовать ТОЧНОЕ имя существующей
  памяти при обновлении факта (`consolidate.ts:294-296`), а список `known`
  к моменту прогона уже содержит напрямую записанные памяти (они прошли через
  `store.write`);
- противоречие решается двухшаговой supersede-цепочкой (`consolidate.ts:506-546`).

**Файлы:** `src/consolidate.ts` (SessionCapture, startConsolidation,
buildConsolidationPrompt, регистрация); тесты
`tests/incremental-consolidation.spec.ts`.

**Механика:**
1. `SessionCapture` (`consolidate.ts:327-339`) вместо `sawMemoryWrite: boolean` —
   два списка:
   - `directWrites: string[]` — имена, записанные `memory_write` в диапазоне
     (дедуп, cap 20, только непустые строковые `exec.input.name`);
   - `directDeletes: string[]` — имена, удалённые `memory_delete` в диапазоне
     (те же ограничения).
2. Регистрация: в `registerConsolidation` слушать `tools/pre-execute`;
   после `await next()` при `decision.kind === 'allow'` и
   `exec.name === 'memory_write' | 'memory_delete'` и
   `options.autoSummarize` → push имени в соответствующий список
   (создать capture при отсутствии — как `record()`).
   Deny/ошибка (decision не allow) — НЕ фиксируется. Запись в чужой сессии —
   изоляция по sessionId.
3. `startConsolidation` (`consolidate.ts:403-…`) скипа диапазона больше НЕТ:
   depth-проверка и порог `pendingUsers` — как раньше; списки передаются в
   промпт. В `buildConsolidationPrompt` два новых опциональных блока
   (пустой список → блок не рендерится, байты не тратятся):

   ```
   - Merge anchors — memories the agent wrote DIRECTLY this session:
     ${directWrites.join(', ')}. If your extracted fact overlaps one of them,
     reuse that EXACT name (update), never create a near-duplicate. If the
     fact contradicts one, still reuse the name — the store resolves the
     supersede chain.
   - Names deleted DIRECTLY this session: ${directDeletes.join(', ')}.
     Do NOT recreate them under the same name; a genuinely new fact gets a
     new kebab-case name.
   ```

4. Детерминированный guard в цикле применения (страховка поверх промпта):
   - кандидат `create` с именем из `directWrites` → форсится в update-ветку
     (reuse имени), лог `consolidation merge-anchor update`;
   - кандидат с именем из `directDeletes` → skip, лог
     `consolidation resurrect-blocked`.
5. Reset: списки очищаются после успешного прогона; при неуспешном
   (restored pending `:582`) — сохраняются (повторный merge идемпотентен:
   update по имени дубля не создаст, resurrect-guard повторится).
6. Хвостовой флаш на `agent/disposed`/`session/disposed` — тот же merge-путь.
7. Лог после прогона: `merge anchors: N, resurrect-blocked: M` (наблюдаемость).

**Edge cases:** подтверждённая человеком запись (injection-gate ask) —
считается (decision allow); «тихая» candidate-запись П.9 — тоже считается,
update поверх candidate не лифтит статус (echo-update, `consolidate.ts:547-550`);
пустой диапазон без прямых записей — поведение идентично текущему (блоков в
промпте нет).

**Тесты:** буфер с `memory_write` в ходе → LLM ВЫЗЫВАЕТСЯ (не скип),
перекрывающийся факт с тем же именем → update-ветка, дубля нет;
непересекающийся факт → обычный create; имя из `directDeletes` → skip;
create-кандидат с именем якоря → форс update; deny-запись → список пуст,
поведение прежнее; reset списков только после успеха; пустые списки → промпт
без новых блоков (снапшот байт).

**Приёмка:** двойных записей одного факта нет; факты из ходов с прямой
записью доливаются (update по имени) или создаются как новые без пересечения;
ни одно имя из прямых удалений не воскресло; в логе видны счётчики merge.

---

## П.5. Кумулятивный бюджет recall на сессию

**Референс:** CC `utils/attachments.ts:2251-2266` (`collectSurfacedMemories`
возвращает `paths` + `totalBytes` за сессию) — per-message бюджет у нас уже
есть (`recallMaxBytes`), кумулятивного нет.

**Файлы:** `src/recall.ts`, `src/index.ts` (Config), `src/settings.ts`
(SETTABLE_FIELDS), `src/memory-api.ts` (панель); тесты `tests/recall.spec.ts`,
`tests/settings.spec.ts`.

**Механика:**
1. Config: `recallSessionMaxBytes: number` default `12000`; `0` = выключено.
   По образцу `recallMaxBytes` — schemastery-поле + SETTABLE_FIELDS
   (live-объект: изменение на лету действует со следующего сообщения).
2. `createRecaller`: рядом с `surfaced` — `shownBytes = Map<sessionId, number>`.
3. В `recall()` после отбора picked и ДО рендера:
   ```ts
   const sessionBudget = options.recallSessionMaxBytes > 0
     ? options.recallSessionMaxBytes - (shownBytes.get(id) ?? 0)
     : Infinity
   const effective = Math.max(0, Math.min(perMessageBudget, sessionBudget))
   if (effective < 512) return null
   const { text, included } = renderRecallBlock(picked, effective)
   shownBytes.set(id, (shownBytes.get(id) ?? 0) + Buffer.byteLength(text))
   ```
4. Reset: в `cleanup(sessionId)` (уже вызывается на `session/disposed`,
   `recall.ts:309`). Компакт-эвристики не нужно: дедуп surfaced и так
   запрещает повторный показ, байты — только топ-ап контроль.

**Edge cases:** confluence per-message и per-session бюджетов (берём min);
последняя запись не влезает целиком — существующая логика обрезки в
`renderRecallBlock` работает и на effective-бюджете.

**Тесты:** накопление по трём сообщениям; отсечка на середине; reset после
cleanup; `0` отключает; live-изменение бюджета подхватывается.

**Приёмка:** суммарные байты recall за сессию ≤ `recallSessionMaxBytes`.

---

## П.6. Верификация фактов при записи (claim-verify)

**Референс:** CC проверяет факты инструментами на записи (форк-агент с
Read/Grep, `extractMemories.ts:171-222`) и требует «fix it at the source» в
dream (`consolidationPrompt.ts:51`). Полный форк-агент в dsh-плагине дорог;
эквивалент CC-совета «check the file exists / grep for it» делается
**детерминированно в плагине** без LLM.

**Файлы:** новый `src/verify.ts`; правки `src/consolidate.ts`; опционально
`src/tools.ts` (тот же гейт для `memory_write` с `auto`-источником — НЕТ:
прямые записи не трогаем, верим модели; только консолидация); тесты 
`tests/verify.spec.ts`, `tests/consolidate.spec.ts`.

**Механика:**
1. `src/verify.ts` (чистые функции, тестируемые):
   - `extractPathClaims(body: string): string[]` — regex по путям с
     расширениями из белого списка (`ts|tsx|js|mjs|py|go|rs|md|json|ya?ml|toml|sh`),
     дедуп, cap 20, только относительные и известные префиксы (`src/`, `packages/`, 
     `./`, `~/`); URL и `node_modules` игнорировать;
   - `verifyPathClaims(claims, cwd): Promise<{claim: string, exists: boolean}[]>`
      — `fs.stat` относительно cwd; отсутствующий cwd → все `exists: true`
      (не верифицируем, не блокируем);
   - `stripFailedSentences(body, failedClaims): {body: string, stripped: number}` —
     разбивка по `[.!?\n]`, удаление предложений, содержащих несуществующий
     claim; остаток < 80 символов → body считается несохранимым.
2. Точка применения — `startConsolidation`, в цикле кандидатов
   (`consolidate.ts:478-…`) после `sanitizeCandidate` и `decideConsolidationAction`,
   только для `type: 'project' | 'reference'` и только в ветке `create`
   (update-ветку не трогаем: там якорь — существующая память):
   ```ts
   if (options.verifyWrites && (candidate.type === 'project' || candidate.type === 'reference')) {
     const claims = extractPathClaims(candidate.body)
     const failed = (await verifyPathClaims(claims, cwd)).filter(r => !r.exists)
     if (failed.length > 0) {
       const stripped = stripFailedSentences(candidate.body, failed.map(f => f.claim))
       if (stripped.stripped > 0 && stripped.body.length >= 80) {
         candidate = { ...candidate, body: stripped.body }  // честная деградация
       } else {
         ctx.logger.info(`[dsh-auto-memory] candidate "${candidate.name}" dropped: stale path claims`)
         continue
       }
     }
   }
   ```
3. Config: `verifyWrites: boolean` default `true` (детерминированный fs-stat
   дёшев; при желании выключается); в SETTABLE_FIELDS.
4. Аннотация: если stripped > 0 — добавить в `evidence` суффикс
   `(path claims stripped: N)` НЕ нужно; вместо этого лог + счётчик в health
   API (`memory-api.ts`: добавить `verifyStripped`/`verifyDropped` в stats —
   опционально, п.приёмки не блокирует).

**Почему не mini-agent с инструментами:** `GenerateOptions.tools` в dsh-llm
есть (`packages/llm/llm/src/types.ts:395`), но цикл tool-use потребовал бы
самостоятельный исполнитель в плагине. Зарезервировать как Phase C
(отдельный вопрос после v1.12): pseudo-tools `check_path` / `grep_repo`,
исполняемые плагином, для кандидатов, где sentence-strip недостаточен.

**Тесты:** extractPathClaims (URL, node_modules, cap, дедуп); verify с
fixtures tmpdir; strip-ветки (остаток ≥80 / <80 → drop); update-ветка не
верифицируется; `verifyWrites: false` — путь не трогается.

**Приёмка:** кандидат с несуществующим путём не попадает в память целиком
или попадает без «битого» предложения.

---

## П.7. Dream — глубокий периодический проход (полностью автоматический, ревизия 2)

**Референс:** CC `services/autoDream/` (гейты 24ч/5 сессий, lock с mtime) и
`consolidationPrompt.ts:26-61` (4 фазы: Orient → Gather (дневники → 
поплывшие памяти → узкий grep транскриптов) → Consolidate → Prune index).

**Решение владельца (ревизия 2): dream включён и пишет автоматически с
первого релиза** — без opt-in и без dry-run по умолчанию. Риск компенсируется
guardrails: никаких удалений (только supersede), skip
pinned/disputed/verified, cap `dreamMaxActions`, запись только через
`store.write`, один LLM-вызов на слой, fail-open, интервал 7 дней.
`dreamDryRun: true` остаётся доступным режимом превью/отладки.

**Файлы:** новый `src/dream.ts`; правки `src/index.ts`; тесты `tests/dream.spec.ts`;
eval `evals/runners/l3-consolidation.mjs` — сценарий dream.

**Механика:**
1. Конфиг (ревизия 2: автоматом с первого релиза):
   - `dream: boolean` default `true` (выключается одной настройкой);
   - `dreamIntervalHours: number` default `168` (7 дней; CC 24ч — у нас реже,
     т.к. curate закрывает дедуп каждые 24ч);
   - `dreamMaxActions: number` default `5` (жёсткий cap записи за проход);
   - `dreamDryRun: boolean` default `false` (`true` = режим превью:
     только лог предложений, ничего не пишет);
   - `dreamTranscripts: number` default `3` (сколько последних сессий читать).
2. Расписание — копия паттерна curate (`curate.ts:247-280`): на первом
   завершённом ходе сессии, depth 0, штамп `.dream` в каталоге слоя,
   не чаще `dreamIntervalHours`; порядок слоёв: user → project. До прохода
   dream вызвать `curateLayer` (сначала механический дедуп, потом семантика).
3. Фазы (один LLM-вызов на слой):
   - **Orient** (без LLM): `store.list(scope)` → манифест name/type/description/
     updated + humanAge (п.1);
   - **Gather** (без LLM): дайджест последних сессий — получить пути jsonl:
     (а) сервис `sessions` (`ctx.get('sessions')`; в хосте jsonl-persistence
     объявляет `static inject = ['sessions']` и умеет листать сессии — 
     `session-persistence-jsonl/src/index.ts:124,454`); fallback (б) —
     каталог по `resolveDshHome()` (уточнить layout при имплементации).
     Для каждой из `dreamTranscripts` сессий по mtime: читать хвост,
     извлечь `USER:`/`ASSISTANT:` строки тем же `captureText` — дайджест
     ≤16k символов;
   - **Consolidate**: промпт по CC-фазам: обновить устаревшие (name → новое
     содержание), пометить противоречия, предложить удаления с причиной,
     добавить недостающее; НИКОГДА не терять факты при merge; только JSON:
     `{actions: [{action: 'update'|'supersede'|'delete'|'create', name, ...MemoryWriteInput, reason}]}`;
   - **Apply** (ревизия 2: при дефолтном `dreamDryRun: false` — выполняется
     всегда; `dreamDryRun: true` → предложения только в лог): через
     `store.write`:
     `update` — по существующему name; противоречие/`supersede` — двухшаговая
     цепочка как в `consolidate.ts:506-546` (новое имя + старое в superseded);
     `delete` — запрет: заменять на `superseded` без указателя (обратимо,
     панель умеет restore); skip для pinned/disputed/verified (verified —
     только предложить в лог). Каждое применённое действие — строка- receipt
     в логе (`dream applied: update <name>`, `dream supersede: <old> → <new>`,
     `dream skipped: <name> pinned`).
4. Бюджеты: один вызов ≤ `dreamMaxTokens` (переиспользовать
   `autoSummarizeMaxTokens` или отдельное поле, default 3000).
5. Всё в общем стиле fail-open; штамп пишется даже при нуле действий
   (`curate.ts:274`).

**Отличие от curate:** curate — лексические дубли внутри слоя; dream —
семантический пересмотр против свежих транскриптов + устаревание + нормализация.

**Тесты:** fixture-каталог сессий; fake selector по фазам; `dream: false` —
проход не запускается; `dreamDryRun: true` не пишет (но штамп ставит);
дефолт (true/false) пишет и логирует receipts; supersede-цепочка;
skip pinned/verified; штамп-интервал; cap `dreamMaxActions`.

**Приёмка:** на дефолтных настройках включённый dream автоматически
обновляет/заменяет устаревшие записи и ни разу не теряет факт без
supersede-указателя; в логах — читаемые receipts по каждому действию;
отключение — только через `dream: false`.

---

## П.8. Per-agent слои памяти (изолированные субагенты)

**Референс:** CC `utils/attachments.ts:2204-2213` — @-упоминание агента
сужает поиск памяти до каталога этого агента; у агентов свои memory-каталоги
(`buildMemoryPrompt(agent memory)` в `memdir.ts:269-272`).

**Файлы:** `src/store.ts` (scope 'agent'), `src/types.ts`, `src/recall.ts`,
`src/tools.ts`, `src/index.ts`; тесты `tests/store.spec.ts`,
`tests/recall.spec.ts`, `tests/multiuser.spec.ts` (изоляция).

**Механика:**
1. Конфиг: `agentMemory: boolean` default `false`;
   `agentMemoryAllow: string[]` default `[]` (метки субагентов, которым
   разрешён собственный слой; пусто = всем разрешённым через `agentMemory`).
2. `MemoryScope` + `'agent'`; каталог `<root>/_agents/<label>/` (label через
   `projectKey`-подобный slug). Права: агент с depth>0 пишет/читает ТОЛЬКО
   свой layer; `withOwner`-логика не применяется к 'agent' (общесистемный,
   не персональный слой — модель-субагент не знает owner).
3. Идентификация метки: `agent.session.header` / `agent.options` субагента —
   при имплементации взять фактическое поле из `dsh-subagent` (label/name);
   нет метки → слой не активен.
4. Recall: сейчас depth>0 всегда `return null` (`recall.ts:238-239`). Изменить:
   если `agentMemory` и метка в allow → кандидаты ТОЛЬКО из
   `store.list('agent', label)`; без user/project/shared (изоляция как в CC);
   лимиты/таймауты те же.
5. Инъекция индекса: в системный промпт субагента индекс `memory:index`
   не попадает (секция строится по cwd основного агента) — индекс agent-слоя
   докидывать в recall-сообщение (заголовок списка) или отдельным хвостовым
   сообщением при первом ходе агента (проще: recall и так таляет тела;
   индекс-строка для ориентира добавляется в `renderRecallBlock` head).
6. Инструменты: `memory_write` от агента с depth>0 → scope жёстко 'agent'
   (в `tools.ts` схема допускает scope:shared — валидация в store уже
   единая точка: добавить правило depth>0 → только 'agent', label из сессии).
7. Консолидация для субагентов — НЕ делаем (как в CC: их контекст течёт в
   родителя; extractMemories main-only, `extractMemories.ts:531-534`).

**Риски:** самый инвазивный пункт; поэтому флаг-выкл по умолчанию и после
стабилизации остальных. Не активировать до завершения П.1-П.6.

**Тесты:** маршрутизация scope 'agent' в store; recall субагента видит только
свой слой; основной агент не видит agent-слой; запись субагента не может
уйти в shared/user.

**Приёмка:** помеченный субагент с собственными памятями; перекрёстного
утекания нет.

---

## П.9. «Тихая» запись: injection-gate без попапов (режимы)

**Референс:** у CC подтверждений нет вовсе — запись памяти всегда тихая,
видимость обеспечивают неблокирующие receipt'ы («Saved N memories»,
`createMemorySavedMessage` в `utils/messages.ts`) и последующая уборка.
Решение пользователя: всплывающие подтверждения при записи не нужны.

**Где сегодня попапы** (полная инвентаризация ask в плагине):
1. `injection-gate.ts:55-59` — `memory_write` в «заражённом» ходе (после
   чтения web/документов) → `askHuman` — **единственный попап в write-path**,
   его и убираем;
2. `tools.ts:635` — `memory_delete_all` → ask (необратимо);
3. `tools.ts:646` — `memory_prune dryRun=false` → ask (необратимо);
4. `tools.ts:642` — `memory_review` админа общего слоя → ask (командное
   действие).

   Пункты 2–4 — **остаются**: редкие, необратимые/командные. Shared-модерация
   записи — не попап (тихая async-очередь), остаётся.

**Файлы:** `src/injection-gate.ts`, `src/tools.ts`, `src/types.ts`,
`src/store.ts`, `src/settings.ts`, `src/index.ts`, `src/memory-api.ts`
(health-строка); тесты `tests/hardening.spec.ts` / новый `tests/gate-modes.spec.ts`.

**Механика:**
1. Config: `injectionGate` из `boolean` → `'candidate' | 'ask' | 'off'`.
   Миграция: `true → 'ask'`, `false → 'off'`; новый default — `'candidate'`.
   Поле в SETTABLE_FIELDS (live-переключение без рестарта).
2. `injection-gate.ts`:
   - детекция заражения не меняется (`tools/pre-execute`, маски
     `untrustedTools`, reset на `agent/turn-stopping`);
   - `memory_write` при тайте: `'ask'` — текущий `askHuman`; `'candidate'` —
     пропустить без блока, тайт остаётся виден через уже существующий
     `taintedBy(sessionId)` (`injection-gate.ts:70`); `'off'` — поведение
     как при старом `false`.
3. `tools.ts` memory_write execute: при `taintedBy() !== undefined` и режиме
   `'candidate'` — записать с форсом:
   - `status: 'candidate'` (echo-update консолидации статусы сохраняет —
     переопределений нет, `consolidate.ts:547-550`);
   - новое поле frontmatter `untrusted: <toolName>` (`MemoryRecord.untrusted?`
     в types, parse/serialize в store; `isInjectable` — инжектируемо, как
     обычный candidate);
   - receipt в результате инструмента (паттерн `render`, `tools.ts:133`):
     `— ⚠ written after reading untrusted content (<tool>); saved as candidate
     — review in Health`.
4. Панель: health-строка «written after untrusted read» с one-click
   verify / dispute / delete. В индекс маркер НЕ пишем — не жжём байты инъекции.
5. Директив-guard в `store.write` остаётся жёсткой линией (directive-паттерны
   → disputed → никогда не инжектится) — П.9 его не ослабляет.

**Residual risk и митигации:** тихий режим пропускает в память
«preference-smuggling» (веб-страница тихо внушает «user prefers X» —
directive-паттерны это не ловят). Митигации: receipt в транскрипте, статус
candidate + строка в health board для асинхронного ревью, recall-note
«stored data, not instructions», протокольная оболочка `stripMemoryTags`.
У CC митигаций меньше (только промпт-дисциплина) — риск принят осознанно.
Бонус: старый `'ask'` в headless без ответчика fail-closed навсегда блокировал
бы запись — `'candidate'` снимает и эту боль.

**Тесты:** миграция boolean→mode; три режима на tainted memory_write
(ask / тихий candidate / off); untrusted roundtrip в store; receipt-текст;
health-строка; директив-guard по-прежнему disputed.

**Приёмка:** обычная работа — ноль попапов на запись; после чтения страницы
тихая запись видна в health board как candidate с меткой источника.

---

## Порядок работ и релизы

| Этап | Пункты | Размер | Релиз |
|---|---|---|---|
| 1. Быстрые победы | П.1, П.2, П.3, П.5 | S/S/S/S | v1.12.0 |
| 2. Дисциплина записи | П.4 (merge), П.6, П.9 | S/M/M | v1.12.0 (П.6 флаг, П.9 default `candidate`) |
| 3. Dream | П.7 | L | v1.12.0 (полностью автоматически: `dream: true`, `dreamDryRun: false`; guardrails) |
| 4. Agent-слои | П.8 | L | v1.13.0 (opt-in) |

Каждый пункт — отдельная ветка/PR в порядке этапа; в каждом PR: код + тесты +
SETTABLE_FIELDS + README/CHANGELOG/LIMITATIONS; CI (vitest + l0) зелёный.

## Риски

- **П.2** сжимает индексный бюджет на ~400B — проверить экран Usage панели
  и L0 index-budget.
- **П.4** merge-якоря опираются на модель: экстрактор должен взять точное имя
  существующей записи — промпт требует дословную evidence и точное имя,
  детерминированный guard форсит create→update по имени якоря и блокирует
  воскрешение удалённых; страховка — дедуп curate каждые 24ч и health-панель.
  Скип-range по CC сознательно не копируется: он терял факты ходов без прямой
  записи.
- **П.6** детерминированный strip может резать содержательные предложения с
  легитимным путём из примера — mitigation: только create-ветка, только
  project/reference, порог остатка 80 символов, телеметрия в логе.
- **П.7** автоматическая запись повышает цену ошибки селектора —
  компенсации: cap `dreamMaxActions`, запрет delete (supersede вместо),
  skip pinned/disputed/verified, запись только через `store.write`,
  интервал 7 дней, receipts на каждое действие, `dreamDryRun: true` как
  режим превью, `dream: false` как полный рубильник.
- **П.8** контракты субагентной метки — проверить по `dsh-subagent` при
  имплементации; при отсутствии публичного поля — отложить пункт.
