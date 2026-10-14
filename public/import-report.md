# LCAE question-bank import report — v1.0.0

Generated from the two supplied source files. No generated filler questions were added.

## Source files

- `LCAE-Exam-Prep.md` (referred to as Prep)
- `LCAE_Practice_Exam.md` (referred to as Practice)

Both files were read completely, including stems, options, inline `<details>` answers,
tabular/bulleted answer keys, explanations, and non-question material.

## Extracted counts per file and section

| File | Section | Build | Test | Deploy | Monitor | Total |
|---|---|---|---|---|---|---|
| Prep | PART A (web-sourced, `<details>` keys) | 10 | 8 | 9 | 8 | 35 |
| Prep | PART B (author-written mock Q1–Q40 + table key) | 10 | 10 | 10 | 10 | 40 |
| Practice | Part A (abbreviated web-sourced A1–A35, no inline key) | 10 | 8 | 9 | 8 | 35 |
| Practice | Part B (mock B1–B40 + Part C key) | 10 | 10 | 10 | 10 | 40 |
| **Total extracted** | | | | | | **150** |

Prep PART A numbering is out of order in the source
(1, 2, 3, 4, 7, 8, 5, 6, 9, 10, 13, 11, 12, 16, 14, 15, 17, 18,
19, 22, 23, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35)
but all 35 are present. Answer keys were matched by file + section + question
identity, never by number alone.

## Exact duplicates removed (35)

Practice Part A (A1–A35) duplicates Prep PART A (same 35 concepts, abbreviated
wording in Practice). Comparison ignored question numbering, outer formatting,
and insignificant whitespace/articles, while preserving meaningful punctuation
and code, and compared stem + options + selection instructions.

| Practice ref | Prep ref | Disposition |
|---|---|---|
| A1–A10 | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10 | Retained one canonical question each; kept the complete Prep wording/options |
| A11–A18 | Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18 | Same; Practice A10/A11/A16 were abbreviated (1/2/0 options parsed) and repaired via Prep |
| A19–A27 | Q19, Q20, Q21, Q22, Q23, Q24, Q25, Q26, Q27 | Same |
| A28–A35 | Q28, Q29, Q30, Q31, Q32, Q33, Q34, Q35 | Same |

For each duplicate: retained one question, kept all source references on the
canonical record, kept the most complete compatible explanation (Prep `<details>`
per-option explanations), and flagged no conflicting answer keys — Practice Part A
carries no separate key and its abbreviated options are compatible with the Prep key.

Prep PART B (Q1–Q40) vs Practice Part B (B1–B40) were **not** deduplicated:
stems and options differ substantially (different scenarios and angles revisiting
shared concepts by design). Per the rule against removing questions merely for
testing the same concept, all 80 were retained.

## Final usable counts per domain

| Domain | Prep A | Prep B | Practice B | Total |
|---|---|---|---|---|
| Building Agents | 10 | 10 | 10 | **30** |
| Testing Agents | 8 | 10 | 10 | **28** |
| Deploying Agents | 9 | 10 | 10 | **29** |
| Monitoring Agents | 8 | 10 | 10 | **28** |
| **Total** | **35** | **40** | **40** | **115** |

Selection types: **90 single-answer, 25 multiple-answer**
(Select 2 / Select 3 / Select 4, exact-set grading, no partial credit).

Each domain has ≥10 usable questions, so full 40-question mocks
(10 per domain, sampled without replacement, grouped in four sections) are supported.

## Repaired, corrected, or excluded entries

- Repaired: Practice A10 (1 option parsed), A11 (2 options), A16 (0 options) —
  options had collapsed into the stem line in the abbreviated source. Repaired by
  adopting the complete Prep wording; original Practice refs preserved.
- Repaired: minor article/punctuation differences between duplicate wordings
  (e.g. “the relationship” vs “relationship”) treated as insignificant for
  dedup; canonical text uses the complete version.
- Repaired: Prep PART B answer-table parsing — a naive pipe regex matched only
  every other table cell; re-parsed row-wise to recover all 40 keys
  (Q1–Q40: singles all A; multis Q11 A,B; Q20 A,B; Q22 A,B; Q35 A,B; Q38 A,B,D).
- Repaired: multi-select counts derived from both `(Select N)` markers and answer
  cardinality so grading and instructions agree.
- Corrected: nothing overridden. No exact duplicates had conflicting answer keys,
  so no conflict flagging was triggered. Spot-checks against official
  LangChain/LangGraph/LangSmith documentation (middleware ordering, SKILL.md
  naming, trimming vs summarization, dataset versioning/splits/metadata, durability
  modes, auth scoping, thread keys, Input+Sum cost charts, feedback alerts) were
  consistent with supplied answers. Source labels such as “verified” were not
  treated as proof.
- Excluded from question count (never scored): exam logistics, source lists, study
  checklists, Friday checklists, quick-facts sheet, appendices of tech facts,
  and answer-key entries themselves.
- Excluded for missing data: **none**. All 115 usable questions have stems,
  2–6 options, at least one correct option, selection counts, explanations,
  takeaways, docs links, and source refs. Part B per-option explanations absent
  from the sources were authored from the source keys and official docs; supporting
  links are recorded per question. No options or answers were invented or guessed.

## Known source property

Many supplied single-answer questions list “A” as correct. The app shuffles
eligible answer choices by default (stable option IDs; displayed letters derived
from shuffled order; letter references remapped), persists order per session,
and offers an original-order setting, so pattern memorization is prevented
without changing grading.

---

# v1.1.0 — additional practice bank (120 questions, 3 fixed mocks)

## Source files (generic names; private local paths are never committed)

- `LCAE_Additional_Questions.md` — human-readable bank + research notes (editorial review source)
- `LCAE_Additional_Questions.json` — machine-readable copy used for import
  (`correctOptionIds` is the grading authority; display letters may change on shuffle)

The pack contains **120 original practice questions** (30 per domain; **96 single-answer**,
**24 multi-select**: 23 × Select-2 + 1 × Select-3) and defines **three 40-question mocks**
(10 per domain; 32 single + 8 multi each; every focus area twice per mock).
Timer **120 minutes**, practice threshold **28/40**. Exact-set multi-select grading is this
pack's **practice rule** (one point only for the complete correct set, no partial credit),
not a claim about the private exam's partial-credit policy. All scenarios, prices, counts,
and timings are synthetic; difficulty labels are author estimates. These are original
practice items, not official exam questions or verified recalls.

## Imported / skipped counts

- Candidates: **120**. Imported: **120**. Skipped duplicates: **0**.
- Bank before: 115 (build 30 · test 28 · deploy 29 · monitor 28; single 90 · multi 25).
- Bank after: **235** (build 60 · test 58 · deploy 59 · monitor 58; single 186 · multi 49).
- Per-domain additions: **+30 each** (build/test/deploy/monitor).
- No existing questions were deleted or rewritten; no filler copies were created.

## Duplicate handling

- Exact check: incoming IDs (`LCAE-X-*`) vs bank IDs — **0 overlaps**; incoming option IDs
  (493 total) vs bank option IDs — **0 overlaps**.
- Substantive check: normalized stems (lowercased, non-alphanumeric collapsed) — **0 exact
  stem matches**; pairwise Jaccard similarity on stem tokens — **0 pairs above 0.80**.
- Shared syllabus topics alone were **not** treated as duplicates: many new items test a new
  scenario or decision on a known concept (tool visibility vs authorization, backend scope,
  evaluation evidence, paired regressions, biased judges, schema failures, replay-safe side
  effects, regional endpoints, cost accounting, alert coverage).

## Field mapping (meaning preserved, names translated where needed)

- `id` → `id` (stable, kept verbatim); `domain` → `domain` (build/test/deploy/monitor).
- `objective` + `objectiveLabel` → `topic` (e.g. `1.1 create_agent and Deep Agents harness choices`).
- `prompt` → `stem` (full text, code spans and numerical exhibits preserved).
- `type: single/multi` → `selectType: single/multiple`; `selectionCount` → `selectCount`
  (`null` for single-answer, N for multi-select to match the existing schema).
- `options[].id/label/text` → `options[].id/origLetter/text` (IDs kept verbatim; grading keys
  off these IDs, never off display letters).
- `correctOptionIds` → `correctOptionIds` (verbatim; authoritative).
- `explanation` → `explanation` + `takeaway` (pack supplies one overall explanation; no
  per-option breakdowns exist in the source, so `optionExplanations` is `{}` rather than
  invented text).
- `sourceUrls` → `docsLinks` (verbatim, retained for review links).
- Membership/provenance → `sources: [{ file: 'LCAE_Additional_Questions.md', section: 'Mock N · Domain label', ref: id }]`
  plus optional `mockId`, `objective`, `difficulty`, `style`, `verifiedOn`, `provenance` fields.
- Bank-level `mocks[]` registers the three definitions with their **explicit** `questionIds`
  (never inferred from file order), plus `timerMinutes: 120` and `passThreshold: 28`.

## Mock sets (explicit membership)

- `LCAE-X-MOCK-1`: LCAE-X-B01–B10, T01–T10, D01–D10, M01–M10 (40 unique; 10/domain; 32/8).
- `LCAE-X-MOCK-2`: LCAE-X-B11–B20, T11–T20, D11–D20, M11–M20 (same balance).
- `LCAE-X-MOCK-3`: LCAE-X-B21–B30, T21–T30, D21–D30, M21–M30 (same balance).
- The three sets partition the 120 new questions. The Mock page offers them alongside the
  existing random balanced generator (same 120-minute absolute deadline, same 28/40 practice
  threshold, same exact-set grading, same styling). Practice flows, filters, mistakes review,
  bookmarks, and progress import/export include the new questions automatically.

## Grading guarantees

- `gradeSelections` compares **sets of stable option IDs** (missed vs extra); selection order
  is ignored. Single-answer requires the one correct ID; multi-select requires the complete
  set with no extras. Unanswered scores zero.
- `shuffledOrder` is deterministic per session and skips position-dependent items; display
  letters derive from the shuffled order and letter references in explanations remap.
  New-pack verification covers: single correct/incorrect, multi exact/missing/extra/reversed,
  and grading stability under shuffling (see `tests/core.test.ts`).

## Research notes from the pack's Markdown (review flags — no existing answers rewritten)

The Markdown's corrections table was reviewed against the bank. The following existing items
touch the flagged claims and should be **verified against current official docs before any
change**; nothing below was silently edited in this import:

| Pack note (use instead) | Official support | Existing items touching the topic (verify, do not assume guilty) |
|---|---|---|
| Cloud placement follows the org's data region; existing deployments/DBs don't migrate; tracing endpoint is separate (don't treat `LANGGRAPH_HOST_URL` as a region-migration switch) | Cloud platform features | pa-q22, pa-q23, pracb-b23, prepb-q27 |
| Reference-free criteria exist; references depend on the evaluator's needs | Evaluation concepts | pa-q11, pa-q14, pa-q17, pracb-b13, pracb-b18 |
| Insights reports need model config, permissions, job scope (categorization is automatic) | Insights | pracb-b38, pracb-b39, prepb-q36 |
| Cost is a supported alert metric (requires cost tracking configured) | Alerts | pracb-b36, prepb-q38, prepb-q40 |
| Don't pin secret versions to thread age; verify the executing revision | Revisions, Checkpointers | pa-q20, pa-q21, pracb-b22, prepb-q23 |
| Reason about durability `exit` explicitly (persists on error/HITL interrupt; no mid-crash recovery); avoid unverified defaults | Durability modes | pa-q26, pracb-b26, prepb-q22, prepb-q28 |
| Monitoring-thread grouping ≠ app-state persistence | Threads, Persistence | pa-q31, pracb-b34, prepb-q33 |

If any listed item is later corrected, keep a migration note; this import made no such change.

## Verification (v1.1.0)

- `npm test` (vitest): bank counts/domains/types, both key formats, dedup refs, new-pack IDs/
  option-ID uniqueness/answer mapping/selection counts, fixed-mock balance + resolver order +
  rejection of bad defs, single/multi grading incl. new-pack edge cases (missing/extra/reversed/
  shuffled), shuffle determinism + letter remap, balanced random mocks + shortage path, timer,
  submission scoring, progress persistence + malformed-import handling.
- `npm run build` (tsc + vite) and `npm run lint` (oxlint) must pass.
- App checks: representative new questions render/submit/review/link correctly in practice and
  mock flows, including one numerical exhibit (e.g. LCAE-X-T03 weighted 83%, LCAE-X-M05 6% alert)
  and one code scenario (e.g. LCAE-X-B07 `ToolMessage` call-ID matching); answers stay hidden
  until Check/submit; source links open from review.
