"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveProgressAction, submitExamAction } from "@/app/actions";
import type { AnswerState, Progress } from "@/lib/attempts";
import { formatClock } from "@/lib/format";
import type { ExamQuestion, Letter } from "@/lib/types";
import { LETTERS, QuestionBody } from "@/components/QuestionBody";

type Status = "not-visited" | "not-answered" | "answered" | "marked" | "answered-marked";

const EMPTY: AnswerState = { chosen: null, marked: false, visited: false, timeSpentSec: 0 };

function statusOf(s: AnswerState | undefined): Status {
  if (!s || !s.visited) return "not-visited";
  if (s.marked) return s.chosen ? "answered-marked" : "marked";
  return s.chosen ? "answered" : "not-answered";
}

const STATUS_STYLE: Record<Status, string> = {
  "not-visited": "bg-bg text-muted border-line",
  "not-answered": "bg-bad text-white border-bad",
  answered: "bg-good text-white border-good",
  marked: "bg-review text-white border-review",
  "answered-marked": "bg-review text-white border-review ring-2 ring-good ring-offset-1",
};

const STATUS_LABEL: Record<Status, string> = {
  answered: "Answered",
  "not-answered": "Not answered",
  "not-visited": "Not visited",
  marked: "Marked for review",
  "answered-marked": "Answered & marked",
};

export function ExamClient(props: {
  attemptId: string;
  title: string;
  subtitle: string;
  questions: ExamQuestion[];
  startedAt: string;
  serverNow: number;
  timeLimitSec: number | null;
  initialProgress: Progress;
}) {
  const { attemptId, questions, timeLimitSec } = props;
  const storageKey = `jrf-exam-${attemptId}`;
  const startMs = new Date(props.startedAt).getTime();
  const clockOffset = useRef(0); // server clock minus device clock, measured after mount

  const [index, setIndex] = useState(() => {
    const firstUnvisited = questions.findIndex((q) => !props.initialProgress[q.id]?.visited);
    return firstUnvisited === -1 ? 0 : firstUnvisited;
  });
  const [progress, setProgress] = useState<Progress>(() => {
    const qid = questions[index].id;
    return { ...props.initialProgress, [qid]: { ...EMPTY, ...props.initialProgress[qid], visited: true } };
  });
  const [now, setNow] = useState(props.serverNow);

  useEffect(() => {
    clockOffset.current = props.serverNow - Date.now();
    try {
      // This device's backup is fresher than the server autosave (which lags up to 30s).
      const local = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the backup must wait until after hydration
      if (local) setProgress(JSON.parse(local) as Progress);
    } catch {}
  }, [storageKey, props.serverNow]);
  const [showPalette, setShowPalette] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);

  const q = questions[index];
  const current = progress[q.id] ?? EMPTY;
  const elapsedSec = (now - startMs) / 1000;
  const remainingSec = timeLimitSec ? timeLimitSec - elapsedSec : null;

  const update = useCallback((qid: string, patch: Partial<AnswerState>) => {
    setProgress((p) => ({ ...p, [qid]: { ...EMPTY, ...p[qid], ...patch } }));
  }, []);

  // Clock tick; per-question time counts only while the tab is visible.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now() + clockOffset.current);
      if (document.visibilityState === "visible")
        setProgress((p) => ({ ...p, [q.id]: { ...EMPTY, ...p[q.id], timeSpentSec: (p[q.id]?.timeSpentSec ?? 0) + 1 } }));
    }, 1000);
    return () => clearInterval(t);
  }, [q.id]);

  // Local backup on every change; server autosave when answers/marks change and every 30s.
  const answerSig = useMemo(
    () => questions.map((x) => `${progress[x.id]?.chosen ?? "-"}${progress[x.id]?.marked ? "m" : ""}`).join(""),
    [progress, questions],
  );
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {}
  }, [progress, storageKey]);
  useEffect(() => {
    const t = setTimeout(() => !submittedRef.current && saveProgressAction(attemptId, progressRef.current), 1500);
    return () => clearTimeout(t);
  }, [answerSig, attemptId]);
  useEffect(() => {
    const t = setInterval(() => !submittedRef.current && saveProgressAction(attemptId, progressRef.current), 30000);
    return () => clearInterval(t);
  }, [attemptId]);

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      await submitExamAction(attemptId, progressRef.current);
    });
  }, [attemptId, storageKey]);

  // Auto-submit when time is up.
  useEffect(() => {
    if (remainingSec !== null && remainingSec <= 0) submit();
  }, [remainingSec, submit]);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(questions.length - 1, i));
      setIndex(n);
      update(questions[n].id, { visited: true });
    },
    [questions, update],
  );
  const choose = useCallback(
    (l: Letter) => update(q.id, { chosen: current.chosen === l ? null : l }),
    [q.id, current.chosen, update],
  );

  // Keyboard: a–d / 1–4 to answer, ← → to move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showPalette && e.key === "Escape") return setShowPalette(false);
      if (confirming || showPalette || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const li = "abcd".indexOf(k) !== -1 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (li !== -1 && k.length === 1) choose(LETTERS[li]);
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, go, index, confirming, showPalette]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { answered: 0, "not-answered": 0, "not-visited": 0, marked: 0, "answered-marked": 0 };
    for (const x of questions) c[statusOf(progress[x.id])]++;
    return c;
  }, [progress, questions]);
  const answeredCount = counts.answered + counts["answered-marked"];
  const lowTime = remainingSec !== null && remainingSec < 300;

  const markAndNext = () => {
    update(q.id, { marked: !current.marked });
    if (!current.marked) go(index + 1);
  };
  const isLast = index === questions.length - 1;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{props.title}</div>
            <div className="truncate text-xs text-muted">
              <span className="lg:hidden">
                Q {index + 1}/{questions.length} · {answeredCount} answered
              </span>
              <span className="hidden lg:inline">{props.subtitle}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className={`rounded-lg px-2.5 py-1.5 font-mono text-base tabular-nums sm:px-3 sm:text-lg ${lowTime ? "bg-bad-soft text-bad" : "bg-bg"}`}
              title={remainingSec !== null ? "Time left" : "Time elapsed"}
              suppressHydrationWarning
            >
              {remainingSec !== null ? formatClock(remainingSec) : formatClock(elapsedSec)}
            </div>
            <button className="btn-primary px-3 sm:px-4" onClick={() => setConfirming(true)} disabled={submitting}>
              Submit
            </button>
          </div>
        </div>
        <div
          className="h-1 bg-bg"
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </header>

      {/* Phones: full-width question card, room left at the bottom for the fixed action bar. */}
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 pb-[calc(4.75rem+var(--safe-b))] sm:px-4 sm:pt-4 lg:grid-cols-[1fr_300px] lg:pb-4">
        <section className="card flex flex-col rounded-none border-x-0 border-t-0 p-4 sm:rounded-xl sm:border sm:p-6">
          <div className="mb-4 hidden text-sm text-muted lg:block">
            Question {index + 1} of {questions.length}
          </div>

          <QuestionBody q={q} number={index + 1} />

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const l = LETTERS[i];
              const selected = current.chosen === l;
              return (
                <button
                  key={l}
                  onClick={() => choose(l)}
                  aria-pressed={selected}
                  className={`flex min-h-12 items-start gap-3 rounded-lg border px-3.5 py-3 text-left font-serif text-[16px] transition-colors sm:px-4 ${
                    selected ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50 hover:bg-bg"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-sans text-xs font-semibold ${
                      selected ? "border-brand bg-brand text-white" : "border-line text-muted"
                    }`}
                  >
                    {l}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {current.chosen && (
            <button className="mt-3 self-start py-1 text-sm text-muted underline lg:hidden" onClick={() => update(q.id, { chosen: null })}>
              Clear response
            </button>
          )}

          <div className="mt-auto hidden flex-wrap justify-between gap-2 pt-6 lg:flex">
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => go(index - 1)} disabled={index === 0}>
                ← Previous
              </button>
              <button className="btn-secondary" onClick={() => update(q.id, { chosen: null })} disabled={!current.chosen}>
                Clear response
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary border-review/40 text-review" onClick={markAndNext}>
                {current.marked ? "Unmark review" : "Mark for review & next"}
              </button>
              <button className="btn-primary" onClick={() => go(index + 1)} disabled={isLast}>
                Save & next →
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="card sticky top-20 p-4">
            <Palette questions={questions} progress={progress} index={index} counts={counts} onPick={go} />
            <p className="mt-3 text-[11px] text-muted">Keys: a–d or 1–4 to answer · ← → to move</p>
          </div>
        </aside>
      </div>

      {/* Phones and tablets: action bar always on screen, above the iPhone home bar. */}
      <nav
        aria-label="Question navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[var(--safe-b)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_1fr_1fr_1.3fr] gap-1.5 px-2 py-2">
          <button className="btn-secondary px-2" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous question">
            ← Prev
          </button>
          <button className="btn-secondary px-2" onClick={() => setShowPalette(true)} aria-label="All questions" aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
            </svg>
            <span className="tabular-nums">
              {index + 1}/{questions.length}
            </span>
          </button>
          <button
            className={`btn-secondary px-2 ${current.marked ? "border-review bg-review-soft text-review" : "border-review/40 text-review"}`}
            onClick={markAndNext}
            aria-pressed={current.marked}
            aria-label={current.marked ? "Unmark review" : "Mark for review and go to next"}
          >
            {current.marked ? "Unmark" : "Mark"}
          </button>
          <button className="btn-primary px-2" onClick={() => go(index + 1)} disabled={isLast} aria-label="Save and next question">
            Next →
          </button>
        </div>
      </nav>

      {showPalette && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="All questions">
          <button className="absolute inset-0 h-full w-full cursor-default bg-black/40" aria-label="Close questions" onClick={() => setShowPalette(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[calc(1rem+var(--safe-b))] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                Questions <span className="font-normal text-muted">· {answeredCount}/{questions.length} answered</span>
              </h2>
              <button className="btn-secondary px-3 py-1.5" onClick={() => setShowPalette(false)}>
                Close
              </button>
            </div>
            <Palette
              questions={questions}
              progress={progress}
              index={index}
              counts={counts}
              large
              onPick={(i) => {
                go(i);
                setShowPalette(false);
              }}
            />
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="card w-full max-w-sm p-6 pb-[calc(1.5rem+var(--safe-b))] sm:pb-6">
            <h2 className="mb-3 font-serif text-lg font-semibold">Submit exam?</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Answered" value={answeredCount} />
              <Row label="Not answered" value={questions.length - answeredCount} />
              <Row label="Marked for review" value={counts.marked + counts["answered-marked"]} />
            </dl>
            <p className="mt-3 text-xs text-muted">Answered questions marked for review are still evaluated.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                Keep going
              </button>
              <button className="btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {submitting && !confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 text-white">Time is up — submitting…</div>
      )}
    </div>
  );
}

function Palette(props: {
  questions: ExamQuestion[];
  progress: Progress;
  index: number;
  counts: Record<Status, number>;
  onPick: (i: number) => void;
  large?: boolean;
}) {
  const { questions, progress, index, counts, onPick, large } = props;
  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[10px] ${STATUS_STYLE[s]}`}>
              {counts[s]}
            </span>
            <span className="text-muted">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-6 gap-1.5 p-0.5 ${large ? "sm:grid-cols-10" : "max-h-[55vh] overflow-y-auto"}`}>
        {questions.map((x, i) => (
          <button
            key={x.id}
            onClick={() => onPick(i)}
            aria-label={`Question ${i + 1}, ${STATUS_LABEL[statusOf(progress[x.id])].toLowerCase()}`}
            aria-current={i === index ? "true" : undefined}
            className={`${large ? "h-11" : "h-9"} rounded-md border text-sm font-medium tabular-nums ${STATUS_STYLE[statusOf(progress[x.id])]} ${
              i === index ? "outline-2 outline-offset-1 outline-ink" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
