import { useEffect, useMemo, useState } from 'react';
import QuestionView from '../components/QuestionView';
import type { PracticeSessionState } from '../lib/core';
import {
  DOMAINS, DOMAIN_LABELS, gradeSelections,
  incorrectRanking, shuffledOrder, validateImport,
} from '../lib/core';
import { BANK, questionById, useStore } from '../lib/store';
import { Link, navigate } from '../nav';

export function Mistakes() {
  const { progress, setPractice } = useStore();
  const ranking = useMemo(() => incorrectRanking(progress.attempts), [progress.attempts]);

  function practiceAll() {
    const ids = ranking.map((r) => r.id).filter((id) => questionById(id));
    if (!ids.length) return;
    const sid = 'p-' + Date.now().toString(36);
    const orderMap: Record<string, string[]> = {};
    for (const qid of ids) orderMap[qid] = shuffledOrder(questionById(qid)!, sid, progress.settings.shuffle).order;
    const s: PracticeSessionState = {
      id: sid, createdAt: Date.now(), questionIds: ids, orderMap, index: 0,
      selections: {}, checked: {}, filterLabel: `Mistakes · ${ids.length}Q`,
    };
    setPractice(s);
    navigate('#/practice');
  }

  return (
    <div>
      <h1>Review mistakes</h1>
      {ranking.length === 0 && <p className="muted">No incorrect questions yet. Practice or sit a mock first.</p>}
      {ranking.length > 0 && (
        <div className="toolbar">
          <button className="btn btn-primary" onClick={practiceAll}>Practice all mistakes ({ranking.length})</button>
        </div>
      )}
      {ranking.map((r) => {
        const q = questionById(r.id);
        if (!q) return null;
        return (
          <div className="card" key={r.id} style={{ marginBottom: 12 }}>
            <p className="small muted">{DOMAIN_LABELS[q.domain]} · {q.topic} · missed {r.wrong}/{r.total}</p>
            <h3 dangerouslySetInnerHTML={{ __html: q.stem }} style={{ fontSize: 17 }} />
            <p className="small"><Link href="#/practice" >Open in practice →</Link></p>
          </div>
        );
      })}
    </div>
  );
}

export function Bookmarks() {
  const { progress } = useStore();
  const items = progress.bookmarks.map((id) => questionById(id)).filter(Boolean);
  return (
    <div>
      <h1>Bookmarks ({items.length})</h1>
      {items.length === 0 && <p className="muted">No bookmarks yet — use ☆ Bookmark on any question.</p>}
      {items.map((q) => q && (
        <div className="card" key={q.id} style={{ marginBottom: 12 }}>
          <p className="small muted">{DOMAIN_LABELS[q.domain]} · {q.topic}</p>
          <h3 style={{ fontSize: 17 }} dangerouslySetInnerHTML={{ __html: q.stem }} />
        </div>
      ))}
    </div>
  );
}

export function Progress() {
  const { progress, save, resetAll, setSetting } = useStore();
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const perDomain = useMemo(() => {
    const stats = {
      build: { correct: 0, total: 0 }, test: { correct: 0, total: 0 },
      deploy: { correct: 0, total: 0 }, monitor: { correct: 0, total: 0 },
    } as Record<string, { correct: number; total: number }>;
    for (const a of progress.attempts) {
      const q = questionById(a.questionId);
      if (!q) continue;
      stats[q.domain].total += 1;
      if (a.wasCorrect) stats[q.domain].correct += 1;
    }
    return stats;
  }, [progress.attempts]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(progress, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lcae-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(f: File) {
    const rd = new FileReader();
    rd.onload = () => {
      const known = new Set(BANK.questions.map((q) => q.id));
      const res = validateImport(String(rd.result ?? ''), known);
      if (!res.ok) {
        setMsg('Import failed: ' + res.error);
        return;
      }
      save({ ...res.data });
      setMsg('Import OK.' + (res.warnings.length ? ' ' + res.warnings.join(' ') : ''));
    };
    rd.readAsText(f);
  }

  return (
    <div>
      <h1>Progress</h1>
      <p className="muted small">Stored on this device/browser only (localStorage). Resume works after refresh. Export a JSON backup before switching devices.</p>
      <div className="grid grid-2">
        <div className="card">
          <h3>Accuracy per domain (all attempts)</h3>
          <table className="table"><thead><tr><th>Domain</th><th>Correct</th><th>Accuracy</th></tr></thead><tbody>
            {DOMAINS.map((d) => {
              const s = perDomain[d];
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return <tr key={d}><td>{DOMAIN_LABELS[d]}</td><td>{s.correct}/{s.total}</td><td>{s.total ? pct + '%' : '—'}</td></tr>;
            })}
          </tbody></table>
          <p className="small muted">{progress.attempts.length} attempts · {progress.mocks.length} mocks · {progress.bookmarks.length} bookmarks · bank v{BANK.version}</p>
        </div>
        <div className="card">
          <h3>Backup & settings</h3>
          <div className="toolbar">
            <button className="btn" onClick={exportJson}>Export progress (JSON)</button>
            <label className="btn">Import JSON<input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); }} /></label>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <label className="field"><span><input type="checkbox" checked={progress.settings.shuffle} onChange={(e) => setSetting('shuffle', e.target.checked)} /> Shuffle answer choices by default (grading uses stable option IDs; letters remap)</span></label>
          <label className="field">Theme
            <select value={progress.settings.theme} onChange={(e) => setSetting('theme', e.target.value)}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="toolbar">
            {!confirmReset
              ? <button className="btn" onClick={() => setConfirmReset(true)}>Reset progress…</button>
              : <><button className="btn" onClick={() => { resetAll(); setConfirmReset(false); }}>Confirm reset (clears device progress)</button>
                <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button></>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Report() {
  const [text, setText] = useState('Loading import report…');
  useEffectImport(setText);
  const counts = useMemo(() => {
    const by = { build: 0, test: 0, deploy: 0, monitor: 0 } as Record<string, number>;
    let single = 0, multi = 0;
    for (const q of BANK.questions) {
      by[q.domain] += 1;
      if (q.selectType === 'single') single += 1; else multi += 1;
    }
    return { by, single, multi };
  }, []);
  return (
    <div>
      <h1>Question bank & import report</h1>
      <div className="card">
        <p><strong>{BANK.count} usable questions</strong> (bank v{BANK.version}): Building {counts.by.build} · Testing {counts.by.test} · Deploying {counts.by.deploy} · Monitoring {counts.by.monitor} · single {counts.single} · multi {counts.multi} · 35 exact duplicates removed (v1.0.0) · 120 added, 0 skipped (v1.1.0).</p>
        <p className="small"><a href={`${import.meta.env.BASE_URL}import-report.md`} target="_blank" rel="noreferrer">Open the full import report (Markdown)</a></p>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
      </div>
    </div>
  );
}

function useEffectImport(setText: (s: string) => void) {
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}import-report.md`)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(setText)
      .catch(() => setText('Could not load import-report.md (offline preview?). Counts above are computed live from the bundled bank.'));
  }, []);
}

export function ReadonlyDemo({ id }: { id: string }) {
  const q = questionById(id);
  if (!q) return null;
  const order = q.options.map((o) => o.id);
  return (
    <div className="card">
      <QuestionView question={q} order={order} selection={[]} checked={false}
        showFeedback={false} locked={false} bookmarked={false}
        onToggleSelect={() => {}} onCheck={() => {}} onToggleBookmark={() => {}} />
    </div>
  );
}

export function gradePreview() {
  return gradeSelections;
}
