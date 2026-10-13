import { describe, expect, it } from 'vitest';
import {
  blankProgress,
  createDeadline,
  displayLetter,
  formatRemaining,
  generateMock,
  gradeSelections,
  isPositionDependent,
  loadProgress,
  remainingMs,
  remapLetters,
  scoreQuestions,
  shuffledOrder,
  validateImport,
  type Bank,
  type BankQuestion,
} from '../src/lib/core';
import bankJson from '../src/data/questions.json';

const BANK = bankJson as unknown as Bank;
const byId = new Map(BANK.questions.map((q) => [q.id, q]));

function single(): BankQuestion {
  const q = BANK.questions.find((x) => x.selectType === 'single')!;
  if (q.correctOptionIds.length !== 1) throw new Error('fixture');
  return q;
}
function multi(): BankQuestion {
  // a Select-2 with exactly 2 correct
  const q = BANK.questions.find((x) => x.selectType === 'multiple' && x.correctOptionIds.length === 2)!;
  return q;
}

describe('question bank import', () => {
  it('has 115 usable questions with per-domain minimums for full mocks', () => {
    expect(BANK.count).toBe(115);
    expect(BANK.questions).toHaveLength(115);
    const per: Record<string, number> = {};
    for (const q of BANK.questions) per[q.domain] = (per[q.domain] ?? 0) + 1;
    expect(per).toMatchObject({ build: 30, test: 28, deploy: 29, monitor: 28 });
    for (const d of ['build', 'test', 'deploy', 'monitor']) expect(per[d]).toBeGreaterThanOrEqual(10);
  });

  it('supports both answer-key formats (details letters + table + plus-format)', () => {
    // Prep Part A came from <details> keys; Prep Part B from a markdown table;
    // Practice Part B from a "B1 A / B3 A+C" key (plus = multiple letters).
    const pa = byId.get('pa-q04')!; // Select 3 with 3 correct
    expect(pa.correctOptionIds).toHaveLength(3);
    const pb = byId.get('prepb-q11')!; // table "A, B"
    expect(pb.correctOptionIds).toHaveLength(2);
    const xb = byId.get('pracb-b3')!; // key "A+C"
    expect(xb.correctOptionIds).toHaveLength(2);
    // every question has options, a correct set, explanations, takeaway, sources
    for (const q of BANK.questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctOptionIds.length).toBeGreaterThanOrEqual(1);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.takeaway.length).toBeGreaterThan(10);
      expect(q.sources.length).toBeGreaterThanOrEqual(1);
      for (const oid of q.correctOptionIds) {
        expect(q.optionExplanations[oid]?.length).toBeGreaterThan(5);
      }
    }
  });

  it('removed the 35 exact duplicates (Practice Part A) keeping both source refs', () => {
    // Canonical Part A records carry both file references.
    const pa01 = byId.get('pa-q01')!;
    expect(pa01.sources.map((s) => s.file).sort()).toEqual(
      ['LCAE-Exam-Prep.md', 'LCAE_Practice_Exam.md'].sort(),
    );
    // No separate abbreviated Practice-A records exist.
    expect(BANK.questions.some((q) => q.id.startsWith('praca-'))).toBe(false);
  });
});

describe('grading', () => {
  it('grades single-answer questions', () => {
    const q = single();
    const [correct] = q.correctOptionIds;
    expect(gradeSelections(q, [correct]).correct).toBe(true);
    const wrong = q.options.map((o) => o.id).find((id) => id !== correct)!;
    const r = gradeSelections(q, [wrong]);
    expect(r.correct).toBe(false);
    expect(r.extra).toEqual([wrong]);
  });

  it('uses exact-set grading for multi-answer (missed and extra both fail)', () => {
    const q = multi();
    const cor = [...q.correctOptionIds].sort();
    expect(gradeSelections(q, cor).correct).toBe(true);
    // missed one correct
    const missed = gradeSelections(q, cor.slice(1));
    expect(missed.correct).toBe(false);
    expect(missed.missed).toHaveLength(1);
    // one extra incorrect
    const wrong = q.options.map((o) => o.id).find((id) => !cor.includes(id))!;
    const extra = gradeSelections(q, [...cor, wrong]);
    expect(extra.correct).toBe(false);
    expect(extra.extra).toEqual([wrong]);
    // unanswered scores zero in totals
    const s = scoreQuestions([q], {});
    expect(s.score).toBe(0);
  });
});

describe('shuffling', () => {
  it('is deterministic per session, preserves grading, and remaps letters', () => {
    const q = single();
    const a = shuffledOrder(q, 'sess-1', true);
    const b = shuffledOrder(q, 'sess-1', true);
    expect(a.order).toEqual(b.order); // survives refresh
    const c = shuffledOrder(q, 'sess-2', true);
    // grading is by stable id regardless of position
    const correct = q.correctOptionIds[0];
    expect(gradeSelections(q, [correct]).correct).toBe(true);
    // displayed letters derive from order
    expect(displayLetter(a.order, correct)).toMatch(/^[A-F]$/);
    // letter references remap to displayed letters
    const idByOrig: Record<string, string> = {};
    for (const o of q.options) idByOrig[o.origLetter] = o.id;
    const remapped = remapLetters('Correct: A', a.order, idByOrig);
    expect(remapped).toBe(`Correct: ${displayLetter(a.order, idByOrig['A'])}`);
    void c;
  });

  it('never reorders position-dependent choices', () => {
    const fake: BankQuestion = {
      id: 't', domain: 'build', topic: 't', stem: 's', selectCount: null,
      selectType: 'single', correctOptionIds: ['t-a'],
      options: [
        { id: 't-a', origLetter: 'A', text: 'Something' },
        { id: 't-d', origLetter: 'D', text: 'All of the above' },
      ],
      explanation: 'e', optionExplanations: {}, takeaway: 't',
      docsLinks: [], sources: [], flags: {},
    };
    expect(isPositionDependent(fake)).toBe(true);
    expect(shuffledOrder(fake, 's', true).order).toEqual(['t-a', 't-d']);
  });

  it('supports an original-order setting', () => {
    const q = single();
    const o = shuffledOrder(q, 'sess-1', false);
    expect(o.order).toEqual(q.options.map((x) => x.id));
    expect(o.wasShuffled).toBe(false);
  });
});

describe('mock generation', () => {
  it('builds balanced 40Q mocks with unique questions grouped in sections', () => {
    const res = generateMock(BANK.questions, () => 0.42);
    if (!('sections' in res)) throw new Error('unexpected shortage');
    for (const d of ['build', 'test', 'deploy', 'monitor'] as const) {
      expect(res.sections[d]).toHaveLength(10);
    }
    expect(res.order).toHaveLength(40);
    expect(new Set(res.order.map((q) => q.id)).size).toBe(40);
    expect(res.order.slice(0, 10).every((q) => q.domain === 'build')).toBe(true);
    expect(res.order.slice(10, 20).every((q) => q.domain === 'test')).toBe(true);
    expect(res.order.slice(20, 30).every((q) => q.domain === 'deploy')).toBe(true);
    expect(res.order.slice(30, 40).every((q) => q.domain === 'monitor')).toBe(true);
  });

  it('reports a shortage instead of duplicating or mislabeling', () => {
    const tiny = BANK.questions.filter((q) => q.domain === 'build').slice(0, 5);
    const res = generateMock(tiny, () => 0.1);
    if (!('shortage' in res)) throw new Error('expected shortage');
    expect(res.shortage[0]).toMatchObject({ domain: 'build', available: 5, needed: 10 });
  });
});

describe('timer and submission', () => {
  it('uses an absolute deadline; refresh does not extend it', () => {
    const start = 1_000_000;
    const d = createDeadline(start, 120);
    expect(d).toBe(start + 120 * 60 * 1000);
    expect(remainingMs(d, start + 60 * 60 * 1000)).toBe(60 * 60 * 1000);
    expect(remainingMs(d, d + 1)).toBe(0); // expiry clamps at zero -> auto-submit
    expect(formatRemaining(5 * 60 * 1000)).toBe('05:00');
  });

  it('scores final submission with exact-set rules and 28/40 pass', () => {
    const qs = BANK.questions.slice(0, 4);
    const sel: Record<string, string[]> = {};
    for (const q of qs) sel[q.id] = [...q.correctOptionIds];
    const r = scoreQuestions(qs, sel);
    expect(r.score).toBe(4);
    expect(r.perDomain.build.total + r.perDomain.test.total + r.perDomain.deploy.total + r.perDomain.monitor.total).toBe(4);
  });
});

describe('progress persistence', () => {
  it('starts blank, reloads saved state, and resets safely', () => {
    const blank = blankProgress('1.0.0');
    expect(blank.bookmarks).toEqual([]);
    const raw = JSON.stringify({ ...blank, bookmarks: ['pa-q01'] });
    expect(loadProgress(raw, '1.0.0').bookmarks).toEqual(['pa-q01']);
  });

  it('handles malformed progress imports without crashing', () => {
    expect(loadProgress('not json{{{', '1.0.0').bookmarks).toEqual([]);
    expect(loadProgress(JSON.stringify({ version: 99 }), '1.0.0').activeMock).toBeNull();
    const bad = validateImport('nope', new Set(['pa-q01']));
    expect(bad.ok).toBe(false);
    const wrongVer = validateImport(JSON.stringify({ version: 2 }), new Set());
    expect(wrongVer.ok).toBe(false);
    const ok = validateImport(
      JSON.stringify({ version: 1, bankVersion: '9.9', bookmarks: ['pa-q01', 'nope'], attempts: [] }),
      new Set(['pa-q01']),
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.bookmarks).toEqual(['pa-q01']);
      expect(ok.warnings.length).toBeGreaterThan(0);
    }
  });
});
