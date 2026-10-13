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
