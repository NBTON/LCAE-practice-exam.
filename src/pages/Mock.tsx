import { useEffect, useMemo, useState } from 'react';
import QuestionView from '../components/QuestionView';
import type { Domain, FixedMock, MockSessionState, PracticeSessionState } from '../lib/core';
import {
  DOMAINS, DOMAIN_LABELS, MOCK_MINUTES, MOCK_PER_DOMAIN, PASS_SCORE,
  createDeadline, formatRemaining,
  generateMock, gradeSelections, remainingMs, resolveFixedMock, scoreQuestions, shuffledOrder,
} from '../lib/core';
import { BANK, questionById, useStore } from '../lib/store';
import { Link, navigate } from '../nav';

const DETAIL_KEY = 'lcae-mock-detail-v1';

interface MockDetail {
  id: string;
  mode: 'learning' | 'exam';
  questionIds: string[];
  selections: Record<string, string[]>;
  orderMap: Record<string, string[]>;
  submittedAt: number;
  timeUsedMs: number;
}

function saveDetail(d: MockDetail) {
  try {
    const raw = localStorage.getItem(DETAIL_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, MockDetail> : {};
    all[d.id] = d;
    localStorage.setItem(DETAIL_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function loadDetail(id: string): MockDetail | null {
  try {
    const raw = localStorage.getItem(DETAIL_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, MockDetail>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

export function MockSetup() {
  const { progress, setMock } = useStore();
  const [mode, setMode] = useState<'learning' | 'exam'>('learning');
  const [setChoice, setSetChoice] = useState<string>('random');
  const [shortage, setShortage] = useState<{ domain: Domain; available: number; needed: number }[] | null>(null);
  const [fixedError, setFixedError] = useState<string | null>(null);

  const active = progress.activeMock && !progress.activeMock.submitted ? progress.activeMock : null;
  const fixedMocks: FixedMock[] = BANK.mocks ?? [];

  function startQuestions(): ReturnType<typeof generateMock> | { fixed: FixedMock } {
    if (setChoice !== 'random') {
      const def = fixedMocks.find((m) => m.id === setChoice);
      if (!def) {
        setFixedError(`Unknown mock set ${setChoice}.`);
        return { shortage: [] };
      }
      return { fixed: def };
    }
    return generateMock(BANK.questions);
  }

  function start() {
    const picked = startQuestions();
    let order;
    if ('fixed' in picked) {
      const res = resolveFixedMock(BANK.questions, picked.fixed);
      if ('error' in res) {
        setFixedError(res.error);
        return;
      }
      order = res.order;
    } else {
      if ('shortage' in picked) {
        setShortage(picked.shortage);
        return;
      }
      order = picked.order;
    }
    const id = 'm-' + Date.now().toString(36);
    const orderMap: Record<string, string[]> = {};
    for (const q of order) {
      orderMap[q.id] = shuffledOrder(q, id, progress.settings.shuffle).order;
    }
    const s: MockSessionState = {
      id, mode, createdAt: Date.now(), deadline: createDeadline(Date.now(), MOCK_MINUTES),
      questionIds: order.map((q) => q.id), orderMap, index: 0,
      selections: {}, flagged: {}, checked: {}, submitted: false,
    };
    setShortage(null);
    setFixedError(null);
    setMock(s);
    navigate('#/mock/run');
  }

  return (
    <div>
      <h1>Mock exam</h1>
      <p className="muted">
        40 questions · {MOCK_PER_DOMAIN} per domain · {MOCK_MINUTES}-minute answering timer ·
        pass {PASS_SCORE}/40 (practice result, not an official score). The timer is an absolute
        deadline: background tabs, refreshes, and browser closure do not pause it.
      </p>
      {active && (
        <div className="card"><p><strong>Unfinished {active.mode} mock</strong> — deadline {new Date(active.deadline).toLocaleTimeString()}.</p>
          <Link className="btn btn-primary" href="#/mock/run">Resume mock</Link></div>
      )}
      <div className="card grid" style={{ marginTop: 12 }}>
        <label className="field"><span><input type="radio" name="mmode" checked={mode === 'learning'} onChange={() => setMode('learning')} /> <strong>Learning mock</strong> — same 40Q/{MOCK_MINUTES}-min structure, explanations after checking each answer.</span></label>
        <label className="field"><span><input type="radio" name="mmode" checked={mode === 'exam'} onChange={() => setMode('exam')} /> <strong>Exam simulation</strong> — answers editable until final submission; correctness and explanations hidden until the end.</span></label>
        <label className="field">Mock set
          <select value={setChoice} onChange={(e) => { setSetChoice(e.target.value); setFixedError(null); }}>
            <option value="random">Random balanced set (40Q · 10 per domain)</option>
            {fixedMocks.map((m) => (
              <option key={m.id} value={m.id}>Fixed set {m.id} (40Q · 10 per domain · 32 single + 8 multi)</option>
            ))}
          </select>
        </label>
        <p className="muted small">Fixed sets use the pack&apos;s explicit question lists (same {MOCK_MINUTES}-minute timer and {PASS_SCORE}/40 practice threshold; multi-select needs the exact option set, no partial credit).</p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={start}>Start {mode === 'learning' ? 'learning mock' : 'exam simulation'}</button>
        </div>
        {fixedError && (
          <div className="feedback bad">
            <p><strong>Cannot start this fixed mock set.</strong></p>
            <p>{fixedError}</p>
          </div>
        )}
        {shortage && (
          <div className="feedback bad">
            <p><strong>Cannot build a full 40-question mock.</strong></p>
            <ul>{shortage.map((s) => (
              <li key={s.domain}>{DOMAIN_LABELS[s.domain]}: {s.available} usable, {s.needed} needed.</li>
            ))}</ul>
            <p>No questions were duplicated and nothing was falsely labeled a full mock. Try a shorter practice session instead:</p>
            <p><Link className="btn" href="#/practice">Open practice</Link></p>
          </div>
        )}
      </div>
      {progress.mocks.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Previous mocks</h3>
          <table className="table"><thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>Result</th><th></th></tr></thead>
            <tbody>{[...progress.mocks].reverse().map((m) => (
              <tr key={m.id}><td>{new Date(m.at).toLocaleString()}</td><td>{m.mode}</td>
                <td>{m.score}/{m.total} ({m.percent}%)</td><td>{m.passed ? 'Pass ✓' : 'Fail ✗'}</td>
                <td><Link href={`#/mock/result/${m.id}`}>Review</Link></td></tr>
            ))}</tbody></table>
        </div>
      )}
    </div>
  );
}

export function MockRunner() {
  const { progress, setMock, recordAttempt, addMockResult, toggleBookmark } = useStore();
  const s = progress.activeMock;
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!s || s.submitted) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [s?.id]);

  const qid = s?.questionIds[s.index];
  const q = qid ? questionById(qid) : undefined;

  // auto-submit at zero
  useEffect(() => {
    if (s && !s.submitted && remainingMs(s.deadline, now) <= 0) {
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  function update(patch: Partial<MockSessionState>) {
    if (s) setMock({ ...s, ...patch });
  }

  function toggleSelect(oid: string) {
    if (!s || !q) return;
    if (s.mode === 'learning' && s.checked[qid!]) return;
    const sel = s.selections[qid!] ?? [];
    const next = q.selectType === 'single'
      ? [oid]
      : sel.includes(oid) ? sel.filter((x) => x !== oid) : [...sel, oid];
    update({ selections: { ...s.selections, [qid!]: next } });
  }

  function checkLearning() {
    if (!s || !q || s.mode !== 'learning' || s.checked[qid!]) return;
    const sel = s.selections[qid!] ?? [];
    if (sel.length === 0) return;
    const r = gradeSelections(q, sel);
    recordAttempt({
      id: 'a-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4),
      at: Date.now(), questionId: qid!, mode: 'mock-learning',
      selectedIds: [...sel], correctIds: [...q.correctOptionIds], wasCorrect: r.correct,
    });
    update({ checked: { ...s.checked, [qid!]: true } });
  }

  function submit(auto = false) {
    if (!s || s.submitted) return;
    const qs = s.questionIds.map((id) => questionById(id)!).filter(Boolean);
    const { score, total, perDomain } = scoreQuestions(qs, s.selections);
    const percent = Math.round((score / total) * 100);
    const timeUsedMs = Math.min(Date.now() - s.createdAt, MOCK_MINUTES * 60 * 1000);
    const missedIds = qs.filter((qq) => !gradeSelections(qq, s.selections[qq.id] ?? []).correct).map((qq) => qq.id);
    // record per-question attempts for mistake review
    for (const qq of qs) {
      const sel = s.selections[qq.id] ?? [];
      recordAttempt({
        id: `a-${s.id}-${qq.id}`, at: Date.now(), questionId: qq.id,
        mode: s.mode === 'learning' ? 'mock-learning' : 'mock-exam',
        selectedIds: [...sel], correctIds: [...qq.correctOptionIds],
        wasCorrect: gradeSelections(qq, sel).correct,
      });
    }
    const result = {
      id: s.id, at: Date.now(), mode: s.mode, score, total, percent,
      passed: score >= PASS_SCORE, timeUsedMs, perDomain, missedIds,
    };
    saveDetail({
      id: s.id, mode: s.mode, questionIds: [...s.questionIds],
      selections: { ...s.selections }, orderMap: { ...s.orderMap },
      submittedAt: Date.now(), timeUsedMs,
    });
    addMockResult(result);
    navigate(`#/mock/result/${s.id}`);
    if (auto) window.alert('Time expired — your mock was submitted automatically.');
  }

  if (!s) {
    return <div><h1>Mock</h1><p className="muted">No active mock.</p><p><Link className="btn" href="#/mock">Back to mock setup</Link></p></div>;
  }
  if (!q || !qid) return <p>Loading…</p>;

  const order = s.orderMap[qid] ?? q.options.map((o) => o.id);
  const sel = s.selections[qid] ?? [];
  const checked = !!s.checked[qid];
  const ms = remainingMs(s.deadline, now);
  const answered = Object.keys(s.selections).filter((k) => (s.selections[k] ?? []).length > 0).length;
  const unanswered = s.questionIds.length - answered;
  const sectionOf = (idx: number) => (idx < 10 ? 'build' : idx < 20 ? 'test' : idx < 30 ? 'deploy' : 'monitor') as Domain;

  return (
    <div>
      <div className="toolbar">
        <span className="pill">{s.mode === 'learning' ? 'Learning mock' : 'Exam simulation'}</span>
        <span className="pill">{DOMAIN_LABELS[sectionOf(s.index)]} · Q{s.index + 1}/40</span>
        <span className="spacer" />
        <span className={`timer ${ms < 10 * 60 * 1000 ? 'low' : ''}`} role="timer" aria-live="off">⏳ {formatRemaining(ms)}</span>
      </div>
      <div className="card">
        <div className="toolbar">
          <button className={`btn`} onClick={() => update({ flagged: { ...s.flagged, [qid]: !s.flagged[qid] } })} aria-pressed={!!s.flagged[qid]}>
            {s.flagged[qid] ? '⚑ Flagged — unflag' : '⚐ Flag for review'}
          </button>
          <span className="spacer" />
          <span className="small muted">{answered} answered · {unanswered} unanswered · {Object.keys(s.flagged).filter((k) => s.flagged[k]).length} flagged</span>
        </div>
        <QuestionView
          question={q}
          order={order}
          selection={sel}
          checked={s.mode === 'learning' ? checked : false}
          showFeedback={s.mode === 'learning'}
          locked={s.mode === 'learning' ? checked : false}
          bookmarked={progress.bookmarks.includes(qid)}
          onToggleSelect={toggleSelect}
          onCheck={checkLearning}
          onToggleBookmark={() => toggleBookmark(qid)}
        />
        {s.mode === 'exam' && <p className="muted small">Exam simulation: correctness and explanations stay hidden until you submit.</p>}
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => s.index > 0 && update({ index: s.index - 1 })} disabled={s.index === 0}>← Previous</button>
        <button className="btn" onClick={() => s.index < 39 && update({ index: s.index + 1 })} disabled={s.index === 39}>Next →</button>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setConfirming(true)}>Submit exam</button>
      </div>
      <div className="navigator" aria-label="Question navigator">
        {s.questionIds.map((id, i) => {
          const a = (s.selections[id] ?? []).length > 0;
          const f = !!s.flagged[id];
          return (
            <button key={id} className={`navbtn ${a ? 'answered' : ''} ${f ? 'flagged' : ''} ${i === s.index ? 'current' : ''}`}
              onClick={() => update({ index: i })}
              aria-label={`Q${i + 1} ${a ? 'answered' : 'unanswered'}${f ? ', flagged' : ''}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        Legend: filled = answered · dashed border = flagged · outline = current. Sections: 1–10 Building, 11–20 Testing, 21–30 Deploying, 31–40 Monitoring.
      </p>
      {confirming && (
        <div className="card" role="dialog" aria-modal="true" aria-label="Submit confirmation">
          <h3>Submit this mock?</h3>
          <p>{unanswered} question(s) unanswered — unanswered questions score zero. This cannot be undone.</p>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => submit(false)}>Submit now</button>
            <button className="btn" onClick={() => setConfirming(false)}>Keep answering</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MockResult({ id }: { id: string }) {
  const { progress, setPractice } = useStore();
  const result = progress.mocks.find((m) => m.id === id);
  const detail = loadDetail(id);
  const perDomain = result?.perDomain;

  const missedQs = useMemo(() => {
    if (!detail) return [];
    return detail.questionIds
      .map((qid) => questionById(qid)!)
      .filter((qq) => qq && !gradeSelections(qq, detail.selections[qq.id] ?? []).correct);
  }, [detail?.id]);

  function practiceMistakes() {
    const ids = (result?.missedIds ?? missedQs.map((q) => q.id)).filter((qid) => questionById(qid));
    if (ids.length === 0) return;
    const sid = 'p-' + Date.now().toString(36);
    const orderMap: Record<string, string[]> = {};
    for (const qid of ids) {
      const qq = questionById(qid)!;
      orderMap[qid] = shuffledOrder(qq, sid, progress.settings.shuffle).order;
    }
    const s: PracticeSessionState = {
      id: sid, createdAt: Date.now(), questionIds: ids, orderMap, index: 0,
      selections: {}, checked: {}, filterLabel: `Mock mistakes · ${ids.length}Q`,
    };
    setPractice(s);
    navigate('#/practice');
  }

  if (!result || !detail) {
    return <div><h1>Result not found</h1><p className="muted">Results are stored on this device. This mock may have been cleared.</p><p><Link className="btn" href="#/mock">Back to mocks</Link></p></div>;
  }

  return (
    <div>
      <h1>Mock result ({result.mode})</h1>
      <div className="card">
        <p style={{ fontSize: 26 }}><strong>{result.score}/{result.total}</strong> · {result.percent}% · {result.passed ? 'Pass ✓ (practice)' : 'Below pass ✗ (practice)'} </p>
        <p className="muted small">Pass threshold {PASS_SCORE}/{result.total} (70%). Time used {Math.round(result.timeUsedMs / 60000)} min of {MOCK_MINUTES}. Submitted {new Date(result.at).toLocaleString()}.</p>
        <table className="table"><thead><tr><th>Domain</th><th>Score</th></tr></thead><tbody>
          {DOMAINS.map((d) => (
            <tr key={d}><td>{DOMAIN_LABELS[d]}</td><td>{perDomain![d].correct}/{perDomain![d].total}</td></tr>
          ))}
        </tbody></table>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={practiceMistakes} disabled={missedQs.length === 0 && result.missedIds.length === 0}>
            Practice my mistakes ({result.missedIds.length})
          </button>
          <Link className="btn" href="#/mock">New mock</Link>
        </div>
      </div>
      <h2>Review all questions</h2>
      {detail.questionIds.map((qid, i) => {
        const qq = questionById(qid)!;
        const order = detail.orderMap[qid] ?? qq.options.map((o) => o.id);
        const sel = detail.selections[qid] ?? [];
        const ok = gradeSelections(qq, sel).correct;
        return (
          <div className="card" key={qid} style={{ marginBottom: 12 }}>
            <p className="small muted">Q{i + 1} · {DOMAIN_LABELS[qq.domain]} · {ok ? 'Correct ✓' : 'Incorrect ✗'}</p>
            <QuestionView
              question={qq} order={order} selection={sel}
              checked={true} showFeedback={true} locked={true}
              bookmarked={false} onToggleSelect={() => {}} onCheck={() => {}} onToggleBookmark={() => {}}
            />
          </div>
        );
      })}
    </div>
  );
}
