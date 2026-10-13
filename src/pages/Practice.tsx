import { useEffect, useMemo, useState } from 'react';
import QuestionView from '../components/QuestionView';
import type { Domain, PracticeSessionState } from '../lib/core';
import { DOMAINS, DOMAIN_LABELS, gradeSelections, incorrectRanking, shuffledOrder } from '../lib/core';
import { BANK, questionById, useStore } from '../lib/store';
import { navigate } from '../nav';

type Subset = 'all' | 'unanswered' | 'incorrect' | 'bookmarked';

export default function Practice() {
  const { progress, setPractice } = useStore();
  const [domain, setDomain] = useState<Domain | 'all'>('all');
  const [subset, setSubset] = useState<Subset>('all');
  const [length, setLength] = useState<string>('20');
  const [started, setStarted] = useState(false);

  const incorrectIds = useMemo(
    () => new Set(incorrectRanking(progress.attempts).map((r) => r.id)),
    [progress.attempts],
  );
  const answeredIds = useMemo(() => new Set(progress.attempts.map((a) => a.questionId)), [progress.attempts]);
  const known = useMemo(() => new Set(BANK.questions.map((q) => q.id)), []);

  // resume existing session on mount
  useEffect(() => {
    if (progress.activePractice && progress.activePractice.questionIds.length > 0) {
      setStarted(true);
    }
  }, []);

  const matching = useMemo(() => {
    let qs = BANK.questions.filter((q) => known.has(q.id));
    if (domain !== 'all') qs = qs.filter((q) => q.domain === domain);
    if (subset === 'unanswered') qs = qs.filter((q) => !answeredIds.has(q.id));
    if (subset === 'incorrect') qs = qs.filter((q) => incorrectIds.has(q.id));
    if (subset === 'bookmarked') qs = qs.filter((q) => progress.bookmarks.includes(q.id));
    return qs;
  }, [domain, subset, answeredIds, incorrectIds, progress.bookmarks, known]);

  function start() {
    const pool = [...matching];
    if (pool.length === 0) return;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const n = length === 'all' ? pool.length : Math.min(parseInt(length, 10), pool.length);
    const picked = pool.slice(0, n);
    const sid = 'p-' + Date.now().toString(36);
    const orderMap: Record<string, string[]> = {};
    for (const q of picked) {
      orderMap[q.id] = shuffledOrder(q, sid, progress.settings.shuffle).order;
    }
    const s: PracticeSessionState = {
      id: sid, createdAt: Date.now(), questionIds: picked.map((q) => q.id),
      orderMap, index: 0, selections: {}, checked: {},
      filterLabel: `${domain === 'all' ? 'All domains' : DOMAIN_LABELS[domain]} · ${subset} · ${n}Q`,
    };
    setPractice(s);
    setStarted(true);
  }

  if (!started || !progress.activePractice) {
    return (
      <div>
        <h1>Practice</h1>
        <p className="muted">The default experience: answer, press Check, and learn why — including why each wrong option is wrong.</p>
        <div className="card grid" style={{ gap: 12 }}>
          <label className="field">Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain | 'all')}>
              <option value="all">Entire bank ({BANK.count})</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{DOMAIN_LABELS[d]} ({BANK.questions.filter((q) => q.domain === d).length})</option>
              ))}
            </select>
          </label>
          <label className="field">Subset
            <select value={subset} onChange={(e) => setSubset(e.target.value as Subset)}>
              <option value="all">All matching</option>
              <option value="unanswered">Unanswered</option>
              <option value="incorrect">Previously incorrect ({incorrectIds.size})</option>
              <option value="bookmarked">Bookmarked ({progress.bookmarks.length})</option>
            </select>
          </label>
          <label className="field">Session length
            <select value={length} onChange={(e) => setLength(e.target.value)}>
              <option value="10">10 questions</option>
              <option value="20">20 questions</option>
              <option value="40">40 questions</option>
              <option value="all">All matching ({matching.length})</option>
            </select>
          </label>
          <p className="muted small">{matching.length} question(s) match. Answer shuffling is {progress.settings.shuffle ? 'ON' : 'OFF'} (change in Progress → Settings).</p>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={start} disabled={matching.length === 0}>Start practice</button>
            {progress.activePractice && (
              <button className="btn" onClick={() => setStarted(true)}>Resume saved session</button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return <Runner key={progress.activePractice.id} />;
}

function Runner() {
  const { progress, setPractice, recordAttempt, toggleBookmark } = useStore();
  const s = progress.activePractice!;
  const [tick, setTick] = useState(0);
  void tick;

  const qid = s.questionIds[s.index];
  const q = questionById(qid)!;
  const order = s.orderMap[qid] ?? q.options.map((o) => o.id);
  const selection = s.selections[qid] ?? [];
  const checked = !!s.checked[qid];

  function update(patch: Partial<PracticeSessionState>) {
    setPractice({ ...s, ...patch });
  }

  // keyboard: arrows move, digits select
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && e.key !== 'Enter') return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (/^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (order[i] && !checked) toggle(order[i]);
      } else if (e.key === 'Enter' && !checked && selection.length > 0) {
        check();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, checked, selection, s.index]);

  function toggle(oid: string) {
    if (checked) return;
    let nextSel: string[];
    if (q.selectType === 'single') nextSel = [oid];
    else nextSel = selection.includes(oid) ? selection.filter((x) => x !== oid) : [...selection, oid];
    update({ selections: { ...s.selections, [qid]: nextSel } });
  }

  function check() {
    if (checked || selection.length === 0) return;
    const r = gradeSelections(q, selection);
    recordAttempt({
      id: 'a-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      at: Date.now(), questionId: qid, mode: 'practice',
      selectedIds: [...selection], correctIds: [...q.correctOptionIds], wasCorrect: r.correct,
    });
    update({ checked: { ...s.checked, [qid]: true } });
    setTick((t) => t + 1);
  }

  function retryAsNew() {
    // keep original attempt; unlock this question for a fresh attempt
    const ns = { ...s.selections, [qid]: [] };
    const nc = { ...s.checked };
    delete nc[qid];
    update({ selections: ns, checked: nc });
  }

  function next() {
    if (s.index < s.questionIds.length - 1) update({ index: s.index + 1 });
  }
  function prev() {
    if (s.index > 0) update({ index: s.index - 1 });
  }
  function endSession() {
    setPractice(null);
    navigate('#/');
  }

  const doneCount = Object.keys(s.checked).length;
  return (
    <div>
      <div className="toolbar">
        <span className="small muted">{s.filterLabel}</span>
        <span className="spacer" />
        <span className="small">Question {s.index + 1} of {s.questionIds.length} · {doneCount} checked</span>
      </div>
      <div className="progressbar" aria-hidden="true"><div style={{ width: `${((s.index + 1) / s.questionIds.length) * 100}%` }} /></div>
      <div className="card" style={{ marginTop: 12 }}>
        <QuestionView
          question={q}
          order={order}
          selection={selection}
          checked={checked}
          showFeedback={true}
          locked={checked}
          bookmarked={progress.bookmarks.includes(qid)}
          onToggleSelect={toggle}
          onCheck={check}
          onToggleBookmark={() => toggleBookmark(qid)}
        />
        {checked && (
          <div className="toolbar">
            <button className="btn" onClick={retryAsNew}>Retry as a new attempt</button>
          </div>
        )}
      </div>
      <div className="toolbar">
        <button className="btn" onClick={prev} disabled={s.index === 0}>← Previous</button>
        <button className="btn" onClick={next} disabled={s.index === s.questionIds.length - 1}>Next →</button>
        <span className="spacer" />
        <button className="btn" onClick={endSession}>End session</button>
      </div>
      <div className="navigator" aria-label="Session questions">
        {s.questionIds.map((id, i) => (
          <button
            key={id}
            className={`navbtn ${s.checked[id] ? 'answered' : ''} ${i === s.index ? 'current' : ''}`}
            onClick={() => update({ index: i })}
            aria-label={`Question ${i + 1}${s.checked[id] ? ' (checked)' : ''}`}
          >{i + 1}</button>
        ))}
      </div>
    </div>
  );
}
