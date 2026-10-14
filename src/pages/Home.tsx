import { Link } from '../nav';
import { MOCK_MINUTES, PASS_SCORE, incorrectRanking } from '../lib/core';
import { BANK, useStore, questionById } from '../lib/store';

export default function Home() {
  const { progress } = useStore();
  const bankVersion = BANK.version;
  const known = new Set(BANK.questions.map((q) => q.id));
  const activePractice = progress.activePractice && progress.activePractice.questionIds.some((id) => known.has(id))
    ? progress.activePractice : null;
  const activeMock = progress.activeMock && progress.activeMock.questionIds.length > 0 ? progress.activeMock : null;
  const mistakes = incorrectRanking(progress.attempts.filter((a) => known.has(a.questionId)));
  const mockCount = progress.mocks.length;
  const lastMock = progress.mocks[progress.mocks.length - 1];

  return (
    <div>
      <section className="hero">
        <span className="eyebrow">Independent practice tool · not an official simulator</span>
        <h1>LCAE Practice Exam</h1>
        <p className="muted">
          {BANK.count}-question bank · Practice with explanations · 40-question, {MOCK_MINUTES}-minute mocks
          (pass {PASS_SCORE}/40) across Building, Testing, Deploying, and Monitoring.
          Progress is stored on this device/browser only.
        </p>
        <div className="toolbar">
          <Link className="btn btn-primary" href="#/practice">Start practice</Link>
          <Link className="btn btn-primary" href="#/mock">Start a mock</Link>
          {activePractice && <Link className="btn" href="#/practice">Resume practice ({activePractice.questionIds.length} Q)</Link>}
          {activeMock && !activeMock.submitted && <Link className="btn" href="#/mock/run">Resume mock ({activeMock.mode})</Link>}
          {mistakes.length > 0 && <Link className="btn" href="#/mistakes">Review mistakes ({mistakes.length})</Link>}
        </div>
        <p className="small muted">
          Sources: supplied prep files (Part A web-sourced + Parts B author-written);
          docs: LangChain / LangGraph / LangSmith. Bank v{bankVersion} · {BANK.count} questions.
        </p>
      </section>

      <div className="grid grid-3">
        <div className="card">
          <h3>Practice (default)</h3>
          <p className="muted small">Whole bank or filter by domain, unanswered, incorrect, bookmarked. Check each answer for teaching feedback.</p>
          <Link className="btn" href="#/practice">Open practice</Link>
        </div>
        <div className="card">
          <h3>Mock exam</h3>
          <p className="muted small">Learning mock (feedback per question) or exam simulation (hidden until submit). 10 per domain, 120-min deadline.</p>
          <Link className="btn" href="#/mock">Open mock setup</Link>
        </div>
        <div className="card">
          <h3>Progress</h3>
          <p className="muted small">
            {progress.attempts.length} attempts · {progress.bookmarks.length} bookmarks · {mockCount} mocks
            {lastMock ? ` · last ${lastMock.score}/${lastMock.total}` : ''}.
          </p>
          <Link className="btn" href="#/progress">Open progress</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Exam format (reference)</h3>
        <p className="small muted">
          English · 40 questions · 120-minute answering timer (≈135-min seat time includes logistics) ·
          pass 28/40 (70%) · four sections × 10: Building, Testing, Deploying, Monitoring ·
          single-answer plus multi-answer (“Select 2/3”, “Select all that apply”).
          The real exam includes a provisioned LangSmith organization; questions needing
          live traces/datasets are flagged here when context is missing — no login or live integration is required.
        </p>
      </div>
    </div>
  );
}

export function unusedHomeHelper() {
  return questionById('pa-q01')?.id;
}
