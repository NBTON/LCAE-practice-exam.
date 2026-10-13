import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Bank, BankQuestion, Domain, MockResultRecord, MockSessionState,
  PracticeSessionState, ProgressData, AttemptRecord,
} from './core';
import {
  DOMAIN_LABELS,
  PROGRESS_KEY,
  blankProgress, loadProgress,
} from './core';
import bankData from '../data/questions.json';

const BANK = bankData as unknown as Bank;
const BY_ID = new Map<string, BankQuestion>(BANK.questions.map((q) => [q.id, q]));

export function useBank(): Bank {
  return BANK;
}

export function questionById(id: string): BankQuestion | undefined {
  return BY_ID.get(id);
}

interface Store {
  progress: ProgressData;
  save: (p: ProgressData) => void;
  toggleBookmark: (qid: string) => void;
  recordAttempt: (a: AttemptRecord) => void;
  addMockResult: (m: MockResultRecord) => void;
  setPractice: (s: PracticeSessionState | null) => void;
  setMock: (s: MockSessionState | null) => void;
  setSetting: (k: 'shuffle' | 'theme', v: boolean | string) => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressData>(() =>
    loadProgress(localStorage.getItem(PROGRESS_KEY), BANK.version),
  );
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // storage full/blocked: keep in-memory state
    }
  }, [progress]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = progress.settings.theme;
      const dark = t === 'dark' || (t === 'system' && !!mq?.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [progress.settings.theme]);

  const save = useCallback((p: ProgressData) => setProgress(p), []);
  const toggleBookmark = useCallback((qid: string) => {
    setProgress((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(qid) ? p.bookmarks.filter((b) => b !== qid) : [...p.bookmarks, qid],
    }));
  }, []);
  const recordAttempt = useCallback((a: AttemptRecord) => {
    setProgress((p) => ({ ...p, attempts: [...p.attempts.slice(-1999), a] }));
  }, []);
  const addMockResult = useCallback((m: MockResultRecord) => {
    setProgress((p) => ({ ...p, mocks: [...p.mocks, m], activeMock: null }));
  }, []);
  const setPractice = useCallback((s: PracticeSessionState | null) => {
    setProgress((p) => ({ ...p, activePractice: s }));
  }, []);
  const setMock = useCallback((s: MockSessionState | null) => {
    setProgress((p) => ({ ...p, activeMock: s }));
  }, []);
  const setSetting = useCallback((k: 'shuffle' | 'theme', v: boolean | string) => {
    setProgress((p) => ({ ...p, settings: { ...p.settings, [k]: v } as ProgressData['settings'] }));
  }, []);
  const resetAll = useCallback(() => {
    setProgress(blankProgress(BANK.version));
  }, []);

  const value = useMemo(
    () => ({ progress, save, toggleBookmark, recordAttempt, addMockResult, setPractice, setMock, setSetting, resetAll }),
    [progress, save, toggleBookmark, recordAttempt, addMockResult, setPractice, setMock, setSetting, resetAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('Store missing');
  return s;
}

export { BANK, BY_ID, DOMAIN_LABELS };
export type { Domain };
