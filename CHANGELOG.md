# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions adhere to
[Semantic Versioning](https://semver.org/). Release notes per tag also live on
the [GitHub Releases](https://github.com/AskTheWay/dsh-auto-memory/releases)
page (generated from this file at publish time).

## [1.13.0] - 2026-11-22

### Added
- Restricted panel mode for non-admins in the multi-user web build: instead of a blanket 403, an identified non-admin now sees **only their own records** — their personal layers (user scope and their own workspace project layers) plus their own shared-layer records (`author` = their login), shown with title and description and expandable to the full body. From actions, they can **delete their own records**; shared records only while still unapproved (`candidate`/`disputed`) — approved and other people's records are deleted by an admin (the rule is enforced by the store, the single permission point). Admin sections (stats, health, settings, Claude import, AGENTS.md export) are hidden and their routes keep answering 403; other people's records — including approved shared ones visible in injections — never enter the non-admin panel, and the shared-layer index text is withheld (it lists other people's rows). Unidentified requests still get 403 (fail-closed, as in 1.10.0). Panel dictionaries extended (ru/en/zh); `docs/LIMITATIONS.ru.md` §3 updated.

### Changed
- Panel routing (`groups.list`/`memory.read`/`memory.delete`) now resolves the requester's identity per request and serves non-admins from their own `withOwner` store view; the admin and local (no `webAuth`) builds keep the exact previous behavior. `memory.write`, settings, import, export, audit and health routes remain admin-only from the panel (an employee's agent keeps writing memories via tools as before).
- The built `lib/` bundles are committed again (removed from `.gitignore`): the dsh plugin install resolves GitHub packages to the git tarball, so without committed `lib/` a fresh install would run a stale build.

## [1.11.0] - 2026-11-15

### Added
- Recall across workspaces: per-message recall also considers `project` memories of the owner's OTHER workspaces (same owner only), labelled "из другой области: <область>". Option `recallOtherProjects` (default `true`).

### Fixed
- 1.10.2: a write body over 4000 chars is now rejected with an explicit error instead of being silently truncated.

## [1.10.0] - 2026-11-15

Hardening for the multi-user web build (replacing the built-in memory).

### Added
- Panel routes are admin-only when the host has a `webAuth` service (403 otherwise; fail-closed).
- Admin bridge to `webAuth` (single source of truth; `admins` in config is the fallback).
- Injection gate: `memory_write` after the turn read untrusted content (`untrustedTools`) asks a human.
- `bypassPolicy: true` on every `ask` (delete-all, prune, review, gate).
- Panel mounted as a Settings section (`settings.section`); Russian-only dictionary.
- Tail of the consolidation buffer is flushed on `session/disposed`.

### Changed
- `admins` are compared exactly (case-sensitive), like web-auth.
- Delegated sessions without `owner` are no longer local admins: shared layer is read-only for them.

## [1.12.0] - 2026-11-15

Parity with Claude Code (plan v1.12, revision 2): human memory age, verify-before-recommending discipline, recently-used-tools in recall, cumulative recall budget, merge instead of skip, claim-verify, silent gate modes, and the fully automatic Dream pass. П.8 (per-agent layers) is deferred to 1.13.0 by owner decision.

### Added
- П.1: human memory age in recall — header shows `updated today / yesterday / N days ago` instead of an ISO date, and memories older than a day carry a one-line caveat `(This memory is N days old — verify before relying on it.)`; caveat bytes count against the recall block budget (new `src/age.ts`, pure functions).
- П.2: "verify before recommending" discipline in prompts — `MEMORY_POLICY_TEXT` gains a "Recalled memories are claims from the past" section (check the file exists / grep before recommending; trust observation over a stale memory and update it; prefer git log for recent-state questions), and the `<memory_recall>` note says memories name facts as they were when written. Index byte budget absorbs the ~400 B policy growth automatically.
- П.3: recently used tools feed the recall selector — a sliding per-session window (last 10, `tools/pre-execute`) adds a section to the selector prompt: do not pick reference/API-documentation memories for tools in active use (usage is already in context), do pick memories carrying warnings/gotchas/known issues about them (new `src/recent-tools.ts`; no new config — always on).
- П.5: cumulative per-session recall budget — new `recallSessionMaxBytes` (default 12000, `0` disables) caps the total bytes of `<memory_recall>` messages shown in one session (min of per-message and remaining session budget; reset on session dispose; live-settable via the settings centre).
- П.4: background consolidation MERGES with direct writes instead of skipping the range (deviation from Claude Code's skip semantics, which silently lost facts) — direct `memory_write`/`memory_delete` in a range become merge anchors for the extractor (overlap → update by exact name; contradiction → supersede chain) and deleted names are never resurrected; a deterministic guard enforces both even if the model disobeys the prompt.
- П.6: claim-verify for auto-created memories — path claims in `project`/`reference` candidates (create branch only) are checked with `fs.stat` against the workspace; sentences naming missing files are stripped (honest degradation) or the candidate is dropped when too little remains; direct model writes are not touched (new `src/verify.ts`, pure functions; option `verifyWrites`, default `true`, live-settable).
- П.9: silent writes — the injection gate becomes a mode instead of a boolean: `'candidate'` (new default; a write after reading untrusted content passes without a popup, saved with status `candidate` and an `untrusted: <tool>` frontmatter marker plus a receipt in the tool result, reviewable in the health board), `'ask'` (previous `true` behavior), `'off'` (previous `false`). Legacy booleans migrate automatically (`true → 'ask'`, `false → 'off'`); the directive-pattern guard still forces `disputed` even in the quiet mode; rare destructive asks (delete-all / prune / shared review) are unchanged. This also unblocks headless setups where an unanswerable ask used to block the write forever.
- П.7: Dream — a deep periodic memory review, fully automatic from this release (`dream: true`, `dreamDryRun: false`; plan revision 2, owner decision). On the first completed turn of a session, not more often than `dreamIntervalHours` (default 168 h) per layer (user → project), after a mechanical curate dedup pass, one LLM call per layer reviews the layer manifest (with human ages from П.1) against a digest of the last `dreamTranscripts` (3) session transcripts and proposes `update` / `supersede` / `create` actions (new `src/dream.ts`). Guardrails for automatic writing: no deletions (supersede with a pointer instead, reversible via panel restore), pinned/verified/disputed targets are skipped (verified gets a log-only proposal), hard cap `dreamMaxActions` (5), model-written records carry `candidate` status, receipts for every action, fail-open, stamp written even at zero actions. `dreamDryRun: true` stays as a preview mode (log-only), `dream: false` is the full off switch.
- Panel (task `PLAN-dsh-auto-memory-panel-v1.12.md`): health board rows for silent writes — records saved after reading untrusted content show an "after reading: <tool>" badge with one-click verify / dispute / delete (delete has an inline confirm); the settings centre gains controls for the new v1.12 fields (`injectionGate` mode select with legacy-boolean display, `recallSessionMaxBytes`, `verifyWrites`, `dream`, `dreamIntervalHours`, `dreamMaxActions`, `dreamDryRun`, `dreamTranscripts`); `health.report` now carries the `untrusted` marker; dictionaries updated for zh/en/ru.

### Documentation
- `docs/LIMITATIONS.ru.md`: known limitations of 1.7.0–1.9.0 (in Russian) and a pre-rollout checklist.
- Code comments added in 1.7.0–1.9.0 translated to Russian.

## [1.9.0] - 2026-11-14

Background cleanup: duplicate memories are merged automatically.

### Added
- `src/curate.ts`: lexical duplicate clusters → LLM confirmation and merged text →
  survivor rewritten, the rest marked `superseded` (reversible). Runs after the first
  finished turn of a session, at most once per `curateIntervalHours` per layer.
- Config: `curate`, `curateIntervalHours`, `curateMaxMerges`.

## [1.8.0] - 2026-11-14

Multi-user memory: personal layers per login plus a moderated team-wide layer.

### Added
- Personal `user`/`project` memory is stored per `session.header.owner`
  (`_owners/<key>/`); sessions without an owner keep the old layout.
- Shared layer `_shared/` (`scope: shared`) visible to all employees. Non-admin
  writes (tool or consolidation) become `candidate`s, hidden everywhere until an
  admin approves them; store-level permissions, unforgeable `author`.
- `memory_review` tool (list / approve / reject; approve and reject require human confirmation).
- Config: `admins`, `enableSharedScope`. Consolidation may propose shared facts;
  its dedupe never crosses between personal and shared layers.

### Changed
- `staleAfterDays` / `admins` are read live by every per-owner store view.

## [1.7.0] - 2026-11-14

Memory that is actually used and written without being asked, and that
understands Russian.

### Added

- **Per-message recall** (`src/recall.ts`): an `agent/pre-step` listener picks
  relevant memories for each new user message with a separate LLM call
  (optionally a cheaper `recallProvider`/`recallModel`) and appends their
  bodies as a `plugin/recall` user message after the step's messages. The
  system prompt is untouched, so the KV prefix stays stable. Fail-open on
  timeout/error/invalid output, per-session dedup, subagents skipped,
  selector output validated against the candidate list.
- **Incremental consolidation**: dsh has no session-close event, so
  consolidation now starts at `agent/turn-stopping` after every
  `autoSummarizeEveryTurns` (default 3) new user messages. A per-session cursor
  means each run sees only new text; a failed batch is put back (the counter is
  not reset, so a persistent failure backs off); one run in flight per session;
  `agent/disposed` flushes the tail.
- **Russian support**: the tokenizer treated Cyrillic as separators, so
  relevance ranking, duplicate detection, `memory_search` and contradiction
  detection were blind to Russian. Cyrillic now gets a light stem and a
  stop-word list; Russian dates (`15.10.2026`, `15 октября 2026`) and units
  (руб, лет, дн, шт, чел, ...) feed the contradiction detector; Russian
  greetings are chit-chat; Russian prompt-injection phrasings are recognised.

### Changed

- **The write guidance is always injected**, even with an empty store (the
  section used to vanish, so a fresh install never started writing memories).
  Empty injections are not audited.
- **`autoSummarize` now defaults to `true`.** Set it to `false` to keep the old
  behaviour. Recall adds one small LLM call per user message; disable with
  `recall: false` or point it at a cheap model.

## [1.6.0] - 2026-11-08

### Added

- **Memory shelf life** (`validUntil`, the "still-true" answer): time-sensitive
  facts — plans with dates, prices, versions, schedules — can carry an expiry.
  Expired memories stop being injected (hidden, not deleted — same family as
  mute/stale), surface on a fourth health board with one-click **renew 90d**,
  and the editor gained a shelf-life field. Consolidation prompts the model to
  set days only for genuinely time-sensitive facts; `memory_write` takes
  `validUntilDays` (0 clears). Session-start index refresh is now
  unconditional so expiries take effect without new writes.
- **Recall-feedback ranking**: the reads counter now feeds back into injection
  ordering — a gentle multiplier (1 + 0.15×reads, capped ×4) promotes memories
  the model actually keeps pulling, without letting hot items bury fresh ones.
  KV-safe: scores only change on file writes.
- **Secret-write transparency**: writes carrying high-confidence secrets were
  already redacted at the store choke point — the model now gets an explicit
  receipt ("N secret(s) detected and redacted; do not store credentials"),
  turning silent sanitization into a teachable moment.
- **CJK contradiction fixtures**: the evolution-lineage contradiction detector
  gained common CJK units (元/岁/人/条/万 — Chinese date sets were already
  supported) plus fixtures pinning both, closing a real gap in the plugin's
  home language.
- **Lazy query freezing** for relevance-ranked truncation: the frozen
  per-session word set is now captured at the *first truncation* instead of
  right after the first user message — budget-fitting sessions never freeze
  at all, and the intended "last 6 user messages" window finally sees more
  than one line. Same KV semantics (the injected text still changes exactly
  once per session).
- **Eval system restructured around budget decoupling**: capability
  measurements no longer contaminated by truncation effects, and budget
  research is an explicit axis. L2 runners take `--budget capacity|product`
  (256KB unconstrained vs the real 4096 default) and write to separate
  result files; the LongMemEval runner also gained `--concurrency`
  (question-level parallelism, 30 questions in ~22 min). The capacity
  re-run delivered the decisive split: **43.3% overall vs 20.0% product**
  — budget truncation costs a quantified 23pp; knowledge-update flips
  0/5→4/5 (needles were consolidated but truncated out), while
  multi-session stays 0/8 (consolidation-layer boundary, budget-independent).
  `evals/README` rewritten as a three-axis model with per-axis questions,
  metrics, known boundaries, and a gap roadmap.

## [1.5.0] - 2026-11-08

### Changed

- **Tabbed panel** — the page is no longer one long scroll with the memory
  list buried under four collapsible cards. A compact top bar (title +
  global actions + an always-visible index-usage signal) sits above an
  underline-style tab navigation: **Memories** (the default — search,
  filters and the memory cards are the first screen), **Insights**
  (injection stats and the recall funnel side by side in a two-column
  grid), **Health** (the three checkup lists, badge-counted, every row
  clickable to jump straight to that memory's card), and **Settings**.
  Old hosts degrade exactly as before: a tab disappears when its data
  source is missing; with none available the tab bar itself vanishes and
  the panel falls back to the plain list. Tab panes stay mounted and are
  hidden with CSS — an unsaved editor draft, slider positions and scroll
  state survive tab switches.
- **Visual system, tightened** (adversarially reviewed design): all emoji
  UI glyphs replaced by monochrome SVG icons (theme-following); identity
  recolored to a color-blind-checked pair — user = brand blue, project =
  teal (the old purple was indistinguishable from blue under deuteranopia),
  both = blue/teal gradient, missing = hollow; type tags neutralized to
  monospace chips (color budget now goes to scope identity and chart
  marks only); the six-color project rotation and the stats-card gradient
  are gone — the activity chart is a single blue measure with the latest
  bar emphasized; the dual recall bar is blue/green with a visible legend;
  font sizes below 10px eliminated.

### Fixed

- Adversarial-review findings (29-agent workflow, 24 raw → 21 confirmed,
  deduplicated to 6 root causes, all fixed): health-row and lineage jumps
  to memories in non-current workspaces silently failed (the jump reset
  all group collapse state, leaving the target card unrendered with no
  retry path — jumps now explicitly expand the target group); tab
  switching unmounted in-progress inputs (unsaved editor bodies and
  settings sliders silently reverted); the index-usage signal vanished
  with the tab bar on old hosts; the import-hint button was labeled
  "locate" but opened the import dialog; narrow-container grid overflow;
  focus loss after health-row jumps; assorted dead CSS and locale
  mismatches.

## [1.4.0] - 2026-11-08

### Added

- **Settings center**: the panel gains a Settings card — Focus/Companion
  presets (one-click coding vs daily-companion profiles), sliders for index
  budget / value gate / soft eviction, and an auto-consolidate toggle. Every
  field carries a source badge (`profile` vs `your override`) and a per-field
  ↺ reset back to the profile default. Changes apply **at runtime, no
  restart**: the host merges user overrides over the profile config into a
  single live object handed to the injection / consolidation / tool paths,
  so a budget change lands on the very next request.
  Overrides persist in the memory root's `settings.json` (atomic write,
  0600, lock-serialized read-modify-write; malformed values are dropped
  field-by-field, `memoryDir` is not settable). `config.get` treats disk as
  the single source of truth and converges the live object on every read —
  hand edits and cross-process writes are picked up; the panel saves only
  dirty fields so untouched values never fossilize into overrides.
- **Recall ranking & injection→recall funnel**: a dual-bar leaderboard
  (blue = injections, green = recalls, with `reads/injected` ratios) and a
  four-quadrant funnel — high value / budget hog / buried gem / low
  activity — each quadrant with concrete actions (consider muting the hogs,
  pinning the buried gems). `memory_search` hits now count as reads (top-3
  results touched), making "passively injected yet never pulled" measurable;
  the funnel hides itself below 4 injections instead of passing off
  small-sample noise as quadrants.

### Fixed

- Adversarial-review findings (16-agent workflow, all reproduced before
  fixing): the injection audit path received the frozen profile config, so
  `maxBytes` overrides **never reached injection** (now it receives the live
  object); the soft-eviction refresh hook was gated on the frozen config and
  silently never registered when eviction was enabled at runtime (now
  registered unconditionally, reading live values at session start);
  concurrent `config.set` calls lost disk updates to a read-modify-write
  race (now entirely inside the lock); slider caps matched the whitelist
  (64 KB / 3650 days) instead of silently clamping the browser side.

## [1.3.1] - 2026-11-06

### Added

- **Panel stats, visualized properly**: the injection-activity chart gains a
  real coordinate system (left Y-axis byte scale with three ticks, horizontal
  gridlines, three-point time axis); two new stacked distribution bars —
  scope share (by injections) and type share (whole store) — with in-segment
  percentages; the metric strip grows to four cells (budget-cut count, orange
  when non-zero); the leaderboard carries rank numbers (top-3 highlighted);
  the health summary becomes three colored count pills.
- **Drill-down injection details**: every recent-injection timeline entry is
  now expandable — the exact memory names injected in that event (with scope
  dots), plus the budget-truncated names struck through with a scissors mark.
  The host's `audit.stats` timeline now carries per-event
  `injected`/`truncatedNames` lists (capped at 60); old hosts
  degrade to non-expandable entries.
- **LongMemEval re-run + needle probe** (runner synced to the exact product
  consolidation path — value gate, chitchat suppressor, supersede lineage;
  same seed, same 30-question subset): the score did **not** move (20.0%
  vs 23.3% baseline, within n=30 noise) — the value-gate hypothesis was
  wrong, and we say so. A per-question needle probe then located the real
  boundary as two distinct mechanisms: everyday-trivia needles are filtered
  at consolidation *by design* (the product keeps durable work facts, not
  parking expenses), and correctly-consolidated needles are crowded out of
  the ~14-row injection budget by recency decay among ~80 memories — with
  relevance truncation structurally inapplicable (the benchmark injects
  before the question is known). Both boundaries are conscious product
  choices, now with precise failure coordinates. Full analysis in
  [evals/README](evals/README.md); the probe ships as
  `evals/runners/l2-needle-probe.mjs`.

### Fixed

- README install commands now use the shipped `web` profile — the old
  `--profile demo` referred to this repo's own demo profile, which
  fresh users don't have; the Install section is a proper three-step quick
  start (npm pull → restart → where to look) with the npm package page
  linked, plus the desktop plugin-manager path.


## [1.3.0] - 2026-10-30

### Added

- **Consolidation value filter** (#17): a configurable `minImportance` gate
  (default 4) drops low-value candidates before they hit disk, and a
  **chitchat suppressor** intercepts pure pleasantries — strong-greeting
  signal AND no substantive content after stripping the greeting. The CJK
  side deliberately uses a length gate instead of a closed word list: the
  adversarial review measured a 45% false-positive rate on the first
  word-list cut (function/thread/memory/exception were all missing; 3-char
  entries never match the bigram tokenizer; unpunctuated CJK+Latin runs
  glue into single tokens) — the redesign intercepts only true
  pleasantries (≤5 CJK chars after stripping, no Latin tokens), at the
  cost of letting short-but-real sentences through (miss over false
  positive, per the DIRECTIVE_PATTERNS 40%-FP lesson).
- **Relevance-ranked truncation** (#18) — the last "known limitation" from
  the README is gone. When the injection budget overflows, memory rows are
  scored by query-term coverage (the frozen per-session query built from
  the latest real user turns) and the most relevant survive; pinned rows
  still lead. Direction fixed per adversarial review (query as gold —
  the first cut had it backwards, letting an off-topic one-word row beat
  a precise 30-word row). The query is frozen per session (first non-empty
  set) so KV-prefix stability holds — asserted by tests; user captures
  now run even when `autoSummarize` is off, since the injection side
  needs them.
- **Memory evolution** (#19): when a consolidation candidate matches an
  existing memory AND carries a hard contradiction (date sets disjoint,
  or same-unit numbers differ), the update no longer overwrites — the old
  memory becomes `superseded` with a `supersededBy` back-pointer and the
  new one lands under a `-v2` name with a `supersedes` forward-pointer
  (both capped to the 64-char name limit). `memory_read` of a superseded
  memory carries a banner telling the model to read the successor;
  the panel renders clickable lineage badges with scroll-and-flash jump.
  Superseded files can never be revived by consolidation (store-level
  guard); restoring from the panel clears both sides of the chain.
- Tests 188 → 202; L2 (+77.8% lift) and L3 (recall 100%) re-run to
  confirm no regression.

### Fixed

- Hardened by an adversarial review (17 agents, ~950k tokens, every
  finding reproduced): chitchat false-positive redesign (above);
  relevance direction inversion (above); same-name candidates could
  revive superseded files through the create path; `-v2` suffixes could
  exceed the 64-char name cap creating ghost files; lineage jump could
  navigate to the wrong card on name-suffix collisions; restore left a
  dangling `supersedes` badge; duplicate per-candidate match computation.

## [1.2.0] - 2026-10-25

### Added

- **`memory_search` tool** — keyword search over names, descriptions and
  *bodies* (the injection index only carries descriptions — this is how the
  model reaches facts too large for the index). CJK-aware bigram matching via
  the same matching core as consolidation; top-8 results with body excerpts,
  progressive-disclosure style (search → read for full text).
- **Claude import watcher** — the host now scans the Claude memory directory
  every 5 minutes; when sync-able memories exist, the panel shows an
  "N Claude Code memories ready to sync" hint bar above the list (count
  rides the existing `groups.list` response — no new polling channel;
  silent on failure, timer cleaned up with the plugin scope).
- **Reverse export bridge** — a panel button renders *trusted* memories
  (verified or unset; candidates/disputed never leave) as an AGENTS.md
  snippet copied to the clipboard, so Claude Code / Codex / Cursor — any
  AGENTS.md-convention tool — can consume what this plugin knows. The
  reverse direction of the 0.8.0 import bridge.
- Tests 182 → 188.

## [1.1.0] - 2026-10-25

### Added

- **L2 end-to-end evaluation** (`evals/runners/l2-e2e.mjs`) — the layer above
  the pipeline: full consolidation → injection → QA loop, each probe answered
  twice (with memories / without) and blind-judged against gold facts.
  Results: standard dataset **95.8% with vs 16.7% without — +79.2 points net
  contribution**; abstention correct both ways. This is the first direct
  evidence that the injected memories change model behavior, not just exist.
- **LongMemEval-S alignment runner** (`evals/runners/l2-longmemeval.mjs`) —
  the official benchmark protocol (ICLR 2025; cleaned data via hf-mirror,
  5 official judge templates, stratified 30-question subset with fixed seed).
  First run published honestly: 23.3% overall / 33.9% task-averaged /
  100% abstention — with a root-cause analysis (chat-haystack needle-search
  is outside this plugin's coding-scenario design; 4KB budget discipline
  becomes the wrong discipline on a 122k-token chat sea). Quantifying the
  boundary instead of cherry-picking benchmarks.
- evals/README updated with the L2 methodology, results tables and honest
  declarations (subset non-comparability, judge model difference).

## [1.0.0] - 2026-10-23

### Added

- **Trustworthy memory** — memories now carry a trust status
  (`candidate` / `verified` / `disputed` / `superseded`) and an evidence chain
  (`{sessionId, quote}`). Legacy files and explicit user writes keep their
  trust (no status = trusted, behavior unchanged); consolidation products are
  born `candidate` (still injected — zero behavior change, surfaced for
  review); **disputed/superseded are never injected**. `verified` can only be
  granted by the user, from the panel — the model cannot self-endorse.
- **Evidence chain**: the consolidation prompt asks for a 1-2 sentence
  verbatim quote supporting each fact; the quote is checked against the
  transcript (fabricated citations are dropped), stored in frontmatter, and
  shown in the panel as the basis for verification decisions.
- **Injection guard at the store choke point**: every write path
  (consolidation *and* direct `memory_write`) runs directive-pattern
  detection over body and description — hits are marked `disputed` and kept
  for human review, never silently dropped. The pattern list is deliberately
  conservative (every rule requires an imperative verb plus its target; bare
  nouns like "system prompt" as a *research topic* don't trigger) — tuned
  after an adversarial review measured a 40% false-positive rate on the
  first cut.
- **Memory health panel** (`🩺`): three review boards — unverified
  (candidates, with/without evidence), zombies (30 days, zero reads), and
  conflict suspects (same name across scopes; near-duplicate descriptions ≥
  0.9 similarity). Status badges and one-click verify / dispute / restore
  actions live on every memory card; restore returns to *candidate* (a
  disputed memory must be re-verified, not blindly trusted again).
- **KV-safe by assertion**: a regression test pins the guarantee that two
  renders within a day are byte-identical (the day-granularity ranking was
  already the design; now it can't silently regress — upstream Claude Code
  and claude-mem both shipped cache-breaking bugs here).

### Fixed

- Hardened by the largest adversarial review so far (17 agents, ~930k tokens,
  every finding reproduced before fixing): a verified badge could be
  laundried by overwriting content through `memory_write` (status now
  downgrades to candidate whenever content changes without an explicit
  status); a pure echo/refresh during consolidation stripped verification
  (content-unchanged writes now preserve status); the directive-pattern
  guard was bypassable and misfired on legitimate technical memories; old
  evidence could cloak new content (evidence invalidated on content change);
  consolidation `max_tokens` truncation was indistinguishable from a model
  format error (now its own warning; L3 runner budget raised).
- Tests 168 → 182.

## [0.10.0] - 2026-10-20

### Added

- **Revocable Claude Code import** — the import dialog is now a per-memory sync
  instead of a one-way, per-project import. Every imported file carries an
  `origin` block in its frontmatter (`kind`, source `slug`, source `file`,
  import time, content fingerprint). The scan annotates each row as
  *pending* / *imported* / *modified* / *conflict*; **Apply** imports ticked
  new entries and deletes unticked previously-imported ones in the same round
  trip. Same-name skipping and the store security layer are unchanged.
- **Edit-safe revocation** — the delete predicate (`origin` match + content
  fingerprint) runs inside the same store lock as the unlink, so a memory
  edited after import is kept and labelled **modified** instead of being
  silently destroyed. Metadata-only changes (pin/mute) keep the memory
  revocable; cross-layer revocation finds imports that landed in user scope via
  `all-to-user` or a cold source project.
- **Legacy imports are revocable too** — memories imported by 0.8.0/0.9.x have
  no `origin` block. They are matched by exact content equality with the source
  and labelled **legacy import**, so unchecking revokes them as well; as soon as
  the content diverges they fall back to **name taken** and are kept.
- **Panel display logic** — memory cards now sort exactly like the injected
  index (pinned → importance×recency → name) instead of alphabetically; the
  usage bar measures only the user + current-project indexes actually injected,
  against the net budget after policy/shell overhead; stale memories get their
  own **stale (not in index)** state; non-current workspaces render read-only
  instead of failing with a save error; project slugs are shortened with the
  full value in a tooltip.
- **Panel interactions** — per-type filter chips next to the scope chips,
  "shown / total" counts while filtering, click-to-expand card bodies (lazy
  `memory.read`, cached), and compact byte counts per group.
- **Panel layout rebuilt** — the two-column card grid is gone: one column of
  collapsible group sections (non-current workspaces start collapsed), compact
  memory rows with hover/focus action icons and inline body expansion, a
  header with primary actions, a segmented scope control plus a type select,
  a modal import dialog (backdrop/Escape to close), and a cleaner empty state.
  The whole panel is left-aligned in a max-width shell (no centered column),
  and the injection-stats card sits above the memory groups. Exact timestamps
  live in the row tooltip; group headers keep icon/title/meta columns aligned.
- **Redesigned injection stats** — the three boxed metrics merge into one
  segmented strip; the dot matrix is replaced by per-memory ratio bars on a
  fixed-column grid (scope dot / name / bar / count / warning), so mixed
  user/project rows line up regardless of glyph widths; the truncation board
  and timeline use the same alignment and compact pills. Group headers reserve
  fixed icon/name/meta columns, so the counts on the right align across groups.
- **Per-project statistics** — `audit.stats` now aggregates by workspace
  (`sessions`, `injections`, `avgBytes`, distinct `memories`, `truncated`,
  `lastTs`); the panel renders a **By project** table with a relative injection
  bar in a stable per-project color, answering "which workspace drives prompt
  cost and truncation".
- **Scope/type color coding** — user (blue), project (violet), both
  (blue→violet gradient), not-in-index (slate); type filter chips carry their
  own colors; group cards get a left accent (user blue, project violet, current
  project green) so layers are distinguishable at a glance.
- Panel memory cards mark Claude-imported entries with 📥.

### Changed

- `import.claude.run` (slug-level) is replaced by `import.claude.apply`
  (`items` / `revoke` arrays of `{slug, file}`). Malformed payloads are rejected
  with 400 instead of degrading to "all".
- `groups.list` now returns `budgetBytes` (net index budget) and per-memory
  `stale`, and sorts memories by the injection score.
- Tests 150 → 168: store origin inheritance/round-trip, annotate state machine,
  revocation semantics (including legacy content-match), host route round trip,
  panel ordering/stale/budget.

## [0.9.0] - 2026-10-19

### Added

- **Injection audit log** (#11) — every prompt assembly now records *which
  memories were injected into which session* to `audit.jsonl`: per session,
  deduplicated by injection-set signature (set changes re-record; empty
  windows reset), with the actually-injected names, the budget-truncated
  names, and the byte cost. Writes are cross-process locked with orphan
  recovery (shares the store's lock layer), serialized in-process, silent on
  failure, capped at 1 MB with tail-preserving rotation, and never touch the
  injection path itself.
- **📊 Injection stats in the panel**: a collapsible section with metric
  cards (sessions / injections / average segment size), a most-injected
  leaderboard drawn as a dot-matrix — one dot per injection plus an `n/m`
  ratio, so equal counts still read as a tidy row instead of identical full
  bars — per-memory truncation counts, a dedicated budget-truncation board
  (the real signal once a session's injection set stabilizes), and a vertical
  timeline with the latest event highlighted (per session: time, workspace,
  count, KB, truncation markers). All hand-drawn CSS — no third-party libs
  cross the browser baseline. `audit.stats` also aggregates per-memory
  `truncatedCount` and `avgBytes` behind the authenticated fence; a failed
  fetch simply hides the section.

### Fixed

- Hardened by an adversarial review (9 agents, all findings reproduced):
  name extraction from index lines is now line-anchored with greedy
  backtracking (a title containing a literal `](fake.md)` hijacked the
  leftmost match and credited a phantom memory in the leaderboard);
  truncated-name diff is multiset-based (same-name memories across scopes
  broke the conservation invariant); an empty injection resets the session
  signature (a same-set return after a mid-session delete-all was silently
  skipped); audit file rotation bounds the only ever-growing file.
- Tests 139 → 150.

## [0.8.0] - 2026-10-19

### Added

- **Claude Code memory import bridge** — the #1 community request (migration) at
  the lowest cost in the ecosystem, since this plugin's data model is
  same-origin with Claude Code auto-memory. One button in the panel
  («Import from Claude Code»): a read-only scan previews every project found
  under `~/.claude/projects/*/memory` (count + target scope), you tick what to
  import, and execution maps fields (same four type enums, H1 → title, ISO
  modified → epoch, original timestamps preserved), routes every write through
  the existing store security layer, and rebuilds indexes automatically.
  Project layering resolves each source project's real path from its session
  `.jsonl` (streamed head, never fully read — the slug encoding is lossy);
  projects without sessions land in user scope. Same-name memories are skipped
  — never overwritten; re-running is idempotent.
- Panel layout pass: the memory list now scrolls inside the panel (content
  beyond the viewport was cut off), user-scope and project-scope groups render
  in two columns (each side full-width when the other is empty, stacking on
  narrow screens).

### Fixed

- Hardened by an adversarial review (10 agents, all findings verified by
  reproduction): import's same-name check moved inside the store lock
  (`onlyIfAbsent`) — a concurrent write between the pre-check snapshot and the
  import write could previously overwrite a same-name memory; `slugs` payload
  strictness (non-array now rejects with 400 instead of silently meaning
  "import everything"); failed-count semantics aligned with the scan preview;
  run-stage failures get their own message and always refresh the list
  (partial imports did land); a late scan response can no longer resurrect a
  closed dialog; import and editor dialogs are mutually exclusive (both being
  sticky, they overlapped).
- Tests 124 → 139.

## [0.7.2] - 2026-10-14

### Added

- **Consolidation now sees the workspace instruction chain**: before the
  end-of-session LLM pass, the plugin discovers AGENTS.md/CLAUDE.md files by
  the same rules as the official `dsh-agent-instructions` layer (user-global
  `$DSH_HOME/AGENTS.md` → project root (`.git` marker) → session cwd, `.local`
  overlays, same-directory trimmed-duplicate dedup) and feeds a bounded digest
  (≤ 2 KB) into the consolidation prompt. Facts already recorded in
  instruction files are no longer re-consolidated as memories — enforcing the
  "hand-written constraints live in AGENTS.md, model-managed facts live in
  memory, one fact in exactly one place" split. Read failures degrade
  silently to no-digest; consolidation is never affected.
- Injection policy gains the matching rule (stable constraints belong in the
  injected instruction chain, never duplicated into memories).

### Fixed

- Hardened by an adversarial review (8 agents, findings verified by
  reproduction): literal `</workspace-instructions>` in instruction content is
  escaped so repository-controlled text cannot close the plugin-owned prompt
  frame and smuggle top-level directives into persistent memories (mirrors
  upstream `escapeInstructionFrameBody` and this repo's `stripMemoryTags`
  discipline); project-root discovery is fully async (no event-loop blocking
  on UNC shares or offline mapped drives); files over 1 MB are skipped whole
  (upstream `maxSourceBytes` semantics — no unbounded read before
  truncation); empty instruction files no longer consume digest budget.

## [0.7.1] - 2026-10-10

### Fixed

- Panel **mute toggle had no effect**: the write route only forwarded
  `disabled: true`, so "un-mute" was silently dropped and the inherited flag
  stuck forever. The flag is now forwarded both ways; action failures surface
  inline on the page instead of vanishing into the console.

### Changed

- Panel list state encoding: muted rows get a grey bar with a dimmed
  background, pinned rows an amber bar, active rows their type color — plus
  explicit `● active` / `⊘ muted` badges. Which memories will be injected is
  now readable at a glance.

## [0.7.0] - 2026-10-09

### Added

- **Update-replace semantics**: consolidation no longer lets new and old
  versions of the same fact coexist. A name-anchored matcher (prefix-tolerant
  token coverage, order-insensitive — `ignore-err-x` matches `err-x-ignore`)
  plus description-echo matching routes matched candidates to an in-place
  UPDATE (reusing the existing name/scope and lifecycle) instead of skipping
  or duplicating. The consolidation prompt also instructs the model to reuse
  the existing name when updating.
- `src/matching.ts` — the matching core shared by product and eval harness:
  the L3-validated mapping (name anchoring ∪ CJK-bigram coverage) is now a
  single implementation point. Evaluation methodology feeding back into
  product, round three.
- New L3 metric **duplicates** (gold facts still covered by >1 produced
  memory): mini 0 (was 1); standard 26→25 products with 2 remaining; mini
  precision 70→87.5%. Standard recall measured 75% in this single run —
  recorded honestly, run-to-run variance not yet measured.

### Changed

- Panel UX pass: overview header (totals + pinned/muted + budget bar),
  colored type badges (user/feedback/project/reference), search filter,
  relative timestamps, icon actions (✏️📌🔇🗑), empty-state 3-step onboarding,
  per-group summary lines, current-workspace badge.

## [0.6.1] - 2026-10-08

### Fixed

- **dsh 0.2.x compatibility** (first external contribution, #4 by @hh-wu):
  injected messages now use the producer-owned `source kind` (v4 shape).

### Changed

- Peer ranges relaxed: `@deepseek-ai/*` peers `<0.3.0`, cordis
  `>=4.0.2 <5.0.0` (the old `^4.0.2` mis-flagged `4.0.5-alpha.1`).
  Verified against the official desktop client 0.2.0-rc.2.

## [0.6.0] - 2026-10-07

### Added

- **harness-sessions evaluation datasets** (`evals/datasets/`): synthetic
  multi-session developer transcripts with gold-labeled facts
  (durable / ephemeral-trap / updated, evidence sessions, abstention probes) —
  the coding-agent memory scenario no public benchmark covers.
- **L1 injection recall** (zero-API runner): 100% on both datasets at the
  perfect-consolidation ceiling — the injection side loses nothing.
- **L3 consolidation quality** (one LLM call per session, same code path as
  the plugin): mini recall 100% / update-correctness 100% / pollution 0%;
  standard recall 83.3% / precision 84.6% / update-correctness 100% /
  pollution 0% (deepseek-chat, temperature 0). Ephemeral traps refused in
  every run.
- **Soft-mute** — a third state between keep and delete (muted memories stay
  on disk but are never injected) (#15).

### Fixed

- Consolidation now writes title/description in the transcript's language
  (Chinese transcripts used to produce English memories — measured, then
  fixed). Surfaced by the new eval.
- Panel resolves the current workspace from the running/most-recent session
  (#14).

## [0.5.2] - 2026-10-06

### Fixed

- CJK bigram tokenization for description similarity (#6) — Chinese echo
  dedup used to miss near-identical descriptions.
- Panel editor: buttons disabled while busy; action failures surfaced inline
  instead of dying as unhandled rejections (#12).
- GB11643 checksum validated before redacting 18-digit strings (#13) —
  ordinary 18-digit numbers (order IDs) are no longer eaten as id-cards.

## [0.5.1] - 2026-10-05

### Fixed

- Third adversarial review round (14 agents): 11 fixes, zero features.

## [0.5.0] - 2026-10-05

### Added

- **Three-factor ranking** (Generative Agents formula, embedding-free):
  injection index and memory_list order by pin → importance × recency
  (0.995^days, day-granular so index text stays stable within a day for
  KV-prefix caches). Auto-consolidation has the model assign importance 1-10;
  types carry sensible defaults.
- **Security pack**: every write path passes through redaction
  (`[REDACTED:github-token/npm-token/openai-key/aws-key/phone/id-card]` — the
  exact shapes that leaked in this project's own history) and protocol-tag
  escaping — the injected section is wrapped in `<memory_context>` and content
  can no longer forge the wrapper. Consolidation dedupes near-identical
  descriptions (Jaccard ≥ 0.7) instead of piling up echoes.

### Changed

- Eval arc completes: probe retention under half-budget pressure
  38% (positional) → 80% (pinned) → ≥90% (three-factor, unpinned) — same
  budget, same seed, better memories.

## [0.4.0] - 2026-10-04

### Added

- **Web UI memory panel** (dual-half plugin): the host registers authenticated
  `/api/auto-memory/*` routes over the existing locked store; the browser half
  registers a sidebar entry and a management page (grouped list with
  types/pins/read counts, per-scope capacity bars with budget warnings, inline
  editing, pin toggle, delete-with-confirm). One bundle serves Web and desktop
  clients; non-Web compositions stay no-op.
- CD pipeline: pushing a `v*` tag now builds, tests, smoke-loads both halves
  and publishes to npm with provenance.

### Fixed

- Panel routes register via a connection-ready callback (host load order used
  to skip them); the editor uses official theme variables (`--dsw-alias-*`)
  instead of hardcoded white — readable in dark mode.

## [0.3.0] - 2026-09-26

### Added

- **Pinned memories** (`pinned: true` on memory_write): pinned entries lead
  the index, survive budget truncation, and are exempt from staleness
  eviction — a trust anchor the user controls.
- Deterministic evaluation layer ([evals/](evals/README.md)) in CI: injection
  budget curves, eviction zero-misfire, link-expansion bounds, signal-to-noise
  characterization.

### Fixed

- Injection budget now covers the *whole* section (index + guidance); it used
  to overshoot by ~800 bytes. Caught by the new eval layer on its first run.
  Pinned-priority truncation lifted probe retention under half-budget
  pressure from 38% to ≥80%.

## [0.2.0] - 2026-09-25

### Added

- **Auto-consolidation** (`autoSummarize: true`): when a root session ends, a
  background LLM pass extracts durable new facts and files them as memories —
  deduplicated, capped, silent on failure.
- **Forgetting & eviction**: lifecycle metadata (created/updated/reads);
  `memory_read` counts references; `staleAfterDays` soft-hides zero-reference
  stale memories from the index (files kept); `memory_prune` dry-runs or
  deletes aged memories.
- **Recall expansion**: `memory_read` resolves `[[name]]` cross-links one
  level and attaches linked summaries.
- `memory_delete_all` — guarded by `tools/pre-execute` human approval: the
  model cannot self-confirm irreversible bulk deletes.

### Fixed

- Hardened by a second adversarial review (11 agents): single-lock `clear`
  window (no concurrent-write escape), conditional index rebuild on `touch`
  (no O(N) amplification), session-start stale refresh, subagent capture
  cleanup, abortable consolidation.

## [0.1.0] - 2026-09-22

### Added

- Initial release: typed store (user / feedback / project / reference),
  four tools (`memory_write` / `memory_read` / `memory_list` /
  `memory_delete`), single system-prompt injection section (order 4000,
  byte-budgeted, zero tokens when empty), workspace + user scope layers,
  cross-process lock with orphan recovery.
- Survived a 12-agent adversarial review before first publish: five
  production-grade traps fixed with regression tests, including the NTFS
  `memory`/`MEMORY.md` case-insensitive collision (silent data destruction)
  and the `{{{ }}}` prompt-crash bomb.

[0.1.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.1.0
[0.2.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.2.0
[0.3.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.3.0
[0.4.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.4.0
[0.5.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.5.0
[0.5.1]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.5.1
[0.5.2]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.5.2
[0.6.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.6.0
[0.6.1]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.6.1
[0.7.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.7.0
[0.7.1]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.7.1
[0.7.2]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.7.2
[0.8.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.8.0
[0.9.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.9.0
[0.10.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v0.10.0
[1.0.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v1.0.0
[1.1.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v1.1.0
[1.2.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v1.2.0
[1.3.0]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v1.3.0
[1.3.1]: https://github.com/AskTheWay/dsh-auto-memory/releases/tag/v1.3.1
