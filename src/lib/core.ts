// Core domain logic: bank types, exact-set grading, deterministic option
// shuffling with letter remapping, balanced mock generation, absolute-deadline
// timer helpers, and versioned localStorage progress with validated import.

export type Domain = 'build' | 'test' | 'deploy' | 'monitor';

export interface BankOption {
  id: string;
  origLetter: string;
  text: string;
}

export interface SourceRef {
  file: string;
  section: string;
  ref: string;
}

export interface BankQuestion {
  id: string;
  domain: Domain;
  topic: string;
  stem: string;
  selectCount: number | null;
  selectType: 'single' | 'multiple';
  options: BankOption[];
  correctOptionIds: string[];
  explanation: string;
  optionExplanations: Record<string, string>;
  takeaway: string;
  docsLinks: string[];
  sources: SourceRef[];
  flags: Record<string, boolean>;
}

export interface Bank {
  version: string;
  generated: string;
  count: number;
  questions: BankQuestion[];
}

export const DOMAINS: Domain[] = ['build', 'test', 'deploy', 'monitor'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  build: 'Building Agents',
  test: 'Testing Agents',
  deploy: 'Deploying Agents',
  monitor: 'Monitoring Agents',
};

export const MOCK_QUESTIONS = 40;
export const MOCK_PER_DOMAIN = 10;
export const MOCK_MINUTES = 120;
export const PASS_SCORE = 28;

// ---------- grading (exact-set, no partial credit) ----------
export function gradeSelections(
  question: BankQuestion,
  selectedIds: string[],
): { correct: boolean; missed: string[]; extra: string[] } {
  const sel = new Set(selectedIds);
  const cor = new Set(question.correctOptionIds);
  const missed = [...cor].filter((id) => !sel.has(id));
  const extra = [...sel].filter((id) => !cor.has(id));
  return { correct: missed.length === 0 && extra.length === 0, missed, extra };
}

export function scoreQuestions(
  questions: BankQuestion[],
  selections: Record<string, string[]>,
): { score: number; total: number; perDomain: Record<Domain, { correct: number; total: number }> } {
  const perDomain = {
    build: { correct: 0, total: 0 },
    test: { correct: 0, total: 0 },
    deploy: { correct: 0, total: 0 },
    monitor: { correct: 0, total: 0 },
  } as Record<Domain, { correct: number; total: number }>;
  let score = 0;
  for (const q of questions) {
    perDomain[q.domain].total += 1;
    const sel = selections[q.id] ?? [];
    if (sel.length === 0) continue; // unanswered scores zero
    if (gradeSelections(q, sel).correct) {
      score += 1;
      perDomain[q.domain].correct += 1;
    }
  }
  return { score, total: questions.length, perDomain };
}

// ---------- deterministic shuffling ----------
// Position-dependent choices (e.g. "all of the above") must keep original
// order. We detect them conservatively and skip shuffling that question.
const POSITION_DEPENDENT =
  /all of the above|none of the above|all of these|none of these|both a and b|options a and b/i;

export function isPositionDependent(q: BankQuestion): boolean {
  return q.options.some((o) => POSITION_DEPENDENT.test(o.text));
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic display order for one question. Stable across refreshes. */
export function shuffledOrder(
  question: BankQuestion,
  sessionKey: string,
  shuffleEnabled: boolean,
): { order: string[]; wasShuffled: boolean } {
  const original = question.options.map((o) => o.id);
  if (!shuffleEnabled || isPositionDependent(question)) {
    return { order: original, wasShuffled: false };
  }
  const rand = mulberry32(hashSeed(sessionKey + '::' + question.id));
  const arr = [...original];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Avoid returning the identity permutation for 4+ options so the default
  // experience actually decorrelates the source's A-heavy answer pattern.
  if (arr.length >= 4 && arr.every((id, i) => id === original[i])) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return { order: arr, wasShuffled: true };
}

/** Displayed letter (A, B, C…) for a stable option id in a given order. */
export function displayLetter(order: string[], optionId: string): string {
  return String.fromCharCode(65 + order.indexOf(optionId));
}

/**
 * Remap original-letter references (e.g. "Correct: A, B") to displayed
 * letters. Only rewrites standalone A–F tokens that clearly denote options.
 */
export function remapLetters(
  text: string,
  order: string[],
  idByOrigLetter: Record<string, string>,
): string {
  const origToDisplay: Record<string, string> = {};
  for (const [orig, id] of Object.entries(idByOrigLetter)) {
    origToDisplay[orig.toUpperCase()] = displayLetter(order, id);
  }
  return text.replace(
    /(?<=\b(?:options?|answers?|correct|choices?)\s*:?\s*)([A-F])((?:\s*,?\s*[A-F])*)/gi,
    (m) => {
      const letters = m.replace(/[^A-Fa-f]/g, '').toUpperCase().split('');
      const mapped = letters.map((l) => origToDisplay[l] ?? l);
      // preserve the original separator style loosely with ", "
      return mapped.join(', ');
    },
  );
}

// ---------- mock generation ----------
export interface MockShortage {
  domain: Domain;
  available: number;
  needed: number;
}

export function generateMock(
  bank: BankQuestion[],
  rand: () => number = Math.random,
): { sections: Record<Domain, BankQuestion[]>; order: BankQuestion[] } | { shortage: MockShortage[] } {
  const shortage: MockShortage[] = [];
  const sections = {} as Record<Domain, BankQuestion[]>;
  for (const d of DOMAINS) {
    const pool = bank.filter((q) => q.domain === d);
    if (pool.length < MOCK_PER_DOMAIN) {
      shortage.push({ domain: d, available: pool.length, needed: MOCK_PER_DOMAIN });
      sections[d] = [];
      continue;
    }
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    sections[d] = arr.slice(0, MOCK_PER_DOMAIN);
  }
  if (shortage.length > 0) return { shortage };
  const order = [...sections.build, ...sections.test, ...sections.deploy, ...sections.monitor];
  return { sections, order };
}

// ---------- timer (absolute deadline, survives refresh/close) ----------
export function createDeadline(nowMs: number, minutes: number = MOCK_MINUTES): number {
  return nowMs + minutes * 60 * 1000;
}

export function remainingMs(deadline: number, nowMs: number): number {
  return Math.max(0, deadline - nowMs);
}

export function formatRemaining(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---------- progress persistence ----------
export interface AttemptRecord {
  id: string;
  at: number;
  questionId: string;
  mode: 'practice' | 'mock-learning' | 'mock-exam';
  selectedIds: string[];
  correctIds: string[];
  wasCorrect: boolean;
}

export interface MockResultRecord {
  id: string;
  at: number;
  mode: 'learning' | 'exam';
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  timeUsedMs: number;
  perDomain: Record<Domain, { correct: number; total: number }>;
  missedIds: string[];
}

export interface PracticeSessionState {
  id: string;
  createdAt: number;
  questionIds: string[];
  orderMap: Record<string, string[]>;
  index: number;
  selections: Record<string, string[]>;
  checked: Record<string, boolean>;
  filterLabel: string;
}

export interface MockSessionState {
  id: string;
  mode: 'learning' | 'exam';
  createdAt: number;
  deadline: number;
  questionIds: string[];
  orderMap: Record<string, string[]>;
  index: number;
  selections: Record<string, string[]>;
  flagged: Record<string, boolean>;
  checked: Record<string, boolean>;
  submitted: boolean;
}

export interface ProgressData {
  version: 1;
  bankVersion: string;
  bookmarks: string[];
  attempts: AttemptRecord[];
  mocks: MockResultRecord[];
  activePractice: PracticeSessionState | null;
  activeMock: MockSessionState | null;
  settings: { shuffle: boolean; theme: 'system' | 'light' | 'dark' };
}

export const PROGRESS_KEY = 'lcae-progress-v1';

export function blankProgress(bankVersion: string): ProgressData {
  return {
    version: 1,
    bankVersion,
    bookmarks: [],
    attempts: [],
    mocks: [],
    activePractice: null,
    activeMock: null,
    settings: { shuffle: true, theme: 'system' },
  };
}

export function loadProgress(raw: string | null, bankVersion: string): ProgressData {
  if (!raw) return blankProgress(bankVersion);
  try {
    const p = JSON.parse(raw) as ProgressData;
    if (typeof p !== 'object' || p === null || p.version !== 1) return blankProgress(bankVersion);
    const clean: ProgressData = {
      version: 1,
      bankVersion: typeof p.bankVersion === 'string' ? p.bankVersion : bankVersion,
      bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks.filter((x) => typeof x === 'string') : [],
      attempts: Array.isArray(p.attempts) ? p.attempts.filter(isAttempt) : [],
      mocks: Array.isArray(p.mocks) ? p.mocks.filter(isMockResult) : [],
      activePractice: isPracticeSession(p.activePractice) ? p.activePractice : null,
      activeMock: isMockSession(p.activeMock) ? p.activeMock : null,
      settings: {
        shuffle: p.settings?.shuffle !== false,
        theme: p.settings?.theme === 'light' || p.settings?.theme === 'dark' ? p.settings.theme : 'system',
      },
    };
    // Bank version change: drop references to unknown questions lazily at use
    // sites (filters), but keep the stored data intact.
    return clean;
  } catch {
    return blankProgress(bankVersion);
  }
}

function isAttempt(x: unknown): x is AttemptRecord {
  if (typeof x !== 'object' || x === null) return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.at === 'number' &&
    typeof a.questionId === 'string' &&
    Array.isArray(a.selectedIds) &&
    Array.isArray(a.correctIds) &&
    typeof a.wasCorrect === 'boolean'
  );
}

function isMockResult(x: unknown): x is MockResultRecord {
  if (typeof x !== 'object' || x === null) return false;
  const m = x as Record<string, unknown>;
  return typeof m.id === 'string' && typeof m.score === 'number' && typeof m.total === 'number';
}

function isPracticeSession(x: unknown): x is PracticeSessionState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return typeof s.id === 'string' && Array.isArray(s.questionIds);
}

function isMockSession(x: unknown): x is MockSessionState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    (s.mode === 'learning' || s.mode === 'exam') &&
    Array.isArray(s.questionIds) &&
    typeof s.deadline === 'number'
  );
}

/** Validate an imported progress file; returns clean data or an error. */
export function validateImport(
  raw: string,
  knownIds: Set<string>,
): { ok: true; data: ProgressData; warnings: string[] } | { ok: false; error: string } {
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (typeof p !== 'object' || p === null) return { ok: false, error: 'File is not a progress object.' };
  const v = p as Partial<ProgressData>;
  if (v.version !== 1) return { ok: false, error: 'Unsupported progress version (expected 1).' };
  const warnings: string[] = [];
  const data = loadProgress(JSON.stringify(v), typeof v.bankVersion === 'string' ? v.bankVersion : 'unknown');
  const before = {
    bookmarks: data.bookmarks.length,
    attempts: data.attempts.length,
  };
  data.bookmarks = data.bookmarks.filter((id) => knownIds.has(id));
  data.attempts = data.attempts.filter((a) => knownIds.has(a.questionId));
  if (data.bookmarks.length !== before.bookmarks)
    warnings.push(`Dropped ${before.bookmarks - data.bookmarks.length} bookmark(s) for unknown questions.`);
  if (data.attempts.length !== before.attempts)
    warnings.push(`Dropped ${before.attempts - data.attempts.length} attempt(s) for unknown questions.`);
  if (data.bankVersion !== '1.0.0') warnings.push(`Bank version is ${data.bankVersion}; current bank is 1.0.0. Unknown questions were dropped.`);
  return { ok: true, data, warnings };
}

/** Incorrect-question ranking derived from attempts (most-missed first). */
export function incorrectRanking(attempts: AttemptRecord[]): { id: string; wrong: number; total: number }[] {
  const map = new Map<string, { wrong: number; total: number }>();
  for (const a of attempts) {
    const e = map.get(a.questionId) ?? { wrong: 0, total: 0 };
    e.total += 1;
    if (!a.wasCorrect) e.wrong += 1;
    map.set(a.questionId, e);
  }
  return [...map.entries()]
    .filter(([, v]) => v.wrong > 0)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total);
}

/** Minimal inline-code/bold renderer for stems, options, and explanations. */
export function renderRich(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}
