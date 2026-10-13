import { useState } from 'react';
import type { BankQuestion } from '../lib/core';
import {
  displayLetter,
  gradeSelections,
  remapLetters,
  renderRich,
} from '../lib/core';

interface Props {
  question: BankQuestion;
  order: string[];
  selection: string[];
  checked: boolean;
  showFeedback: boolean;
  locked: boolean;
  bookmarked: boolean;
  onToggleSelect: (optionId: string) => void;
  onCheck: () => void;
  onToggleBookmark: () => void;
}

export default function QuestionView(props: Props) {
  const { question, order, selection, checked, showFeedback, locked } = props;
  const [showAll, setShowAll] = useState(false);
  const byId = new Map(question.options.map((o) => [o.id, o]));
  const idByOrigLetter: Record<string, string> = {};
  for (const o of question.options) idByOrigLetter[o.origLetter] = o.id;

  const result = checked ? gradeSelections(question, selection) : null;
  const isSingle = question.selectType === 'single';
  const need = question.selectCount ?? question.correctOptionIds.length;
  const instruction = isSingle
    ? 'Select one answer.'
    : `Select ${need}: exact set required — all correct options and no incorrect options. No partial credit.`;

  const correctDisplay = question.correctOptionIds
    .map((id) => displayLetter(order, id))
    .sort()
    .join(', ');
  const selectedDisplay =
    selection.map((id) => displayLetter(order, id)).sort().join(', ') || '—';

  return (
    <article aria-labelledby={`stem-${question.id}`}>
      <div className="q-meta">
        <span className="pill">{question.domain.toUpperCase()}</span>
        <span className="pill">{question.topic}</span>
        <span className="pill">{isSingle ? 'Single answer' : `Multi-answer · ${need}`}</span>
        <span className="pill">ID {question.id}</span>
        <button className="btn" onClick={props.onToggleBookmark} aria-pressed={props.bookmarked}>
          {props.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
        </button>
      </div>
      <h2 className="q-stem" id={`stem-${question.id}`}
        dangerouslySetInnerHTML={{ __html: renderRich(question.stem) }} />
      <p className="muted small" role="note">{instruction}</p>

      <div className="opts" role="group" aria-label="Answer choices">
        {order.map((oid) => {
          const o = byId.get(oid)!;
          const letter = displayLetter(order, oid);
          const isSel = selection.includes(oid);
          const isCor = question.correctOptionIds.includes(oid);
          let cls = 'opt';
          if (isSel) cls += ' opt-selected';
          if (checked && showFeedback && isCor) cls += ' opt-correct';
          if (checked && showFeedback && isSel && !isCor) cls += ' opt-wrong';
          return (
            <label key={oid} className={cls}>
              <input
                type={isSingle ? 'radio' : 'checkbox'}
                name={`q-${question.id}`}
                checked={isSel}
                disabled={locked}
                onChange={() => props.onToggleSelect(oid)}
              />
              <span>
                <span className="opt-letter">{letter}.</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: renderRich(o.text) }} />
                {checked && showFeedback && (
                  <span className="small">
                    {' '}
                    {isCor && isSel && <strong> ✓ your pick — correct</strong>}
                    {isCor && !isSel && <strong> (correct — you missed it)</strong>}
                    {!isCor && isSel && <strong> ✗ not correct</strong>}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {!checked && (
        <div className="toolbar">
          <button className="btn btn-primary" onClick={props.onCheck} disabled={selection.length === 0}>
            Check answer
          </button>
          <span className="muted small">Selecting an option never reveals the answer — you must press Check answer.</span>
        </div>
      )}

      {checked && showFeedback && result && (
        <div className={`feedback ${result.correct ? 'good' : 'bad'}`} aria-live="polite">
          <div className="feedback-title">
            <span className="icon" aria-hidden="true">{result.correct ? '✓' : '✗'}</span>
            <span>{result.correct ? 'Correct.' : 'Not correct — study the breakdown below.'}</span>
          </div>
          <p>
            <strong>Your answer:</strong> {selectedDisplay}
            {' · '}<strong>Correct:</strong> {correctDisplay}
          </p>
          {!result.correct && (
            <ul>
              {result.extra.map((id) => (
                <li key={id}>
                  <strong>{displayLetter(order, id)}</strong> should not be selected:{' '}
                  <span dangerouslySetInnerHTML={{
                    __html: renderRich(remapLetters(question.optionExplanations[id] ?? '', order, idByOrigLetter)),
                  }} />
                </li>
              ))}
              {result.missed.map((id) => (
                <li key={id}>
                  <strong>{displayLetter(order, id)}</strong> is required but was missed:{' '}
                  <span dangerouslySetInnerHTML={{
                    __html: renderRich(remapLetters(question.optionExplanations[id] ?? '', order, idByOrigLetter)),
                  }} />
                </li>
              ))}
            </ul>
          )}
          <p>
            <strong>Why the correct answer is right:</strong>{' '}
            <span dangerouslySetInnerHTML={{
              __html: renderRich(remapLetters(question.explanation, order, idByOrigLetter)),
            }} />
          </p>
          <div className="takeaway">
            <strong>Takeaway:</strong>{' '}
            <span dangerouslySetInnerHTML={{ __html: renderRich(question.takeaway) }} />
          </div>
          <button className="btn" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? 'Hide explanation of every option' : 'Show explanation of every option'}
          </button>
          {showAll && (
            <div>
              {order.map((oid) => (
                <details key={oid} className="explain" open={false}>
                  <summary>
                    Option {displayLetter(order, oid)} — {question.correctOptionIds.includes(oid) ? 'correct' : 'incorrect'}
                  </summary>
                  <p dangerouslySetInnerHTML={{
                    __html: renderRich(remapLetters(question.optionExplanations[oid] ?? '', order, idByOrigLetter)),
                  }} />
                </details>
              ))}
              {question.docsLinks.length > 0 && (
                <p className="small">
                  <strong>Docs:</strong>{' '}
                  {question.docsLinks.map((u) => (
                    <span key={u}><a href={u} target="_blank" rel="noreferrer">{hostOf(u)}</a>{' '}</span>
                  ))}
                </p>
              )}
              <p className="muted small">
                Sources: {question.sources.map((s) => `${s.file} · ${s.section} · ${s.ref}`).join(' / ')}
              </p>
            </div>
          )}
        </div>
      )}
      {checked && !showFeedback && (
        <p className="muted small">Answer recorded. Correctness and explanations stay hidden until you submit this exam.</p>
      )}
    </article>
  );
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}
