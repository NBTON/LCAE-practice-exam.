# LCAE Practice Exam — Independent Practice Tool

Static study site for the LangChain Certified Agent Engineer (LCAE) exam:
115-question bank, explanation-first practice mode, and 40-question / 120-minute
mock exams (learning + exam-simulation). No backend, no login, no AI API —
explanations ship with the site.

Live site: `https://NBTON.github.io/LCAE-practice-exam./`
(project site; note the repository name ends with a trailing period).

> Independent practice tool. Not affiliated with LangChain, not an official
> simulator, and not a reproduction of Talview's interface.

## Local development

Requires Node 20+.

```bash
npm install
npm run dev      # local server
npm test         # vitest unit tests (bank, grading, shuffle, mocks, timer, storage)
npm run build    # TypeScript + production build into dist/
npm run preview  # serve the production build locally
```

## Question-bank updates

- Source of truth at runtime: `src/data/questions.json`
  (bank `version`, `count`, and `questions[]` with stable IDs, domain, topic,
  stem, options with stable IDs, correct IDs, select type/count, explanations,
  per-option explanations, takeaway, docs links, and source refs).
- The bank was imported from two local prep files (kept out of this repo —
  personal preparation material is never committed):
  `LCAE-Exam-Prep.md` and `LCAE_Practice_Exam.md`.
- Import rules (see `public/import-report.md`): match keys by file + section +
  question identity (numbers restart across files); exact duplicates removed
  (35: Practice Part A → canonical Prep wording, both refs kept); no invented
  options/answers; missing Part-B per-option explanations authored from source
  keys + official docs with links recorded.
- To rebuild after editing sources, re-run the importer against the two files
  and replace `src/data/questions.json` (keep the schema), then:
  1. `npm test` (validates counts, both key formats, dedup refs, grading,
     shuffle/remap, mock balance, timer, storage/import validation),
  2. `npm run build`.

## Validation

`tests/core.test.ts` covers: both answer-key formats + duplicate removal,
single-answer grading, exact-set multi-answer grading (missed + extra),
grading/explanations after shuffling (stable IDs, displayed-letter remapping,
position-dependent order preservation), balanced mock generation without repeats
(10/domain, grouped sections) plus the shortage path, absolute-deadline timer
(refresh-safe, expiry clamp) and submission scoring, and progress persistence
with malformed-import handling.

## Deployment

- Static Vite build (`base: '/LCAE-practice-exam./'`, hash routing so refreshes
  work on Pages). Pushed to `main`; `.github/workflows/deploy.yml` builds,
  tests, and deploys `dist/` to GitHub Pages automatically.
- Repository name `LCAE-practice-exam.` (trailing period) is preserved in the
  remote URL and the Pages base path.
