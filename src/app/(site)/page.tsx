import Link from "next/link";
import { allGradedAnswers, listAttempts } from "@/lib/attempts";
import { getQuestion } from "@/lib/bank";
import { describeScope, formatDateTime, formatDuration, pct } from "@/lib/format";
import { TYPE_LABELS } from "@/lib/setups";
import { SYLLABUS } from "@/lib/syllabus";
import type { QType } from "@/lib/types";
import { AccuracyBar } from "@/components/AccuracyBar";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [attempts, answers] = await Promise.all([listAttempts(), allGradedAnswers()]);
  const done = attempts.filter((a) => a.submittedAt);
  const inProgress = attempts.filter((a) => !a.submittedAt);

  const totalQs = done.reduce((s, a) => s + a.total, 0);
  const totalCorrect = done.reduce((s, a) => s + (a.correct ?? 0), 0);
  const totalTime = done.reduce((s, a) => s + (a.durationSec ?? 0), 0);

  const byUnit = new Map<number, { right: number; total: number }>();
  const byType = new Map<QType, { right: number; total: number }>();
  for (const ans of answers) {
    const q = getQuestion(ans.questionId);
    if (!q) continue;
    tally(byUnit, q.unit, ans.isCorrect);
    tally(byType, q.type, ans.isCorrect);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">UGC NET / JRF · Commerce Paper 2</p>
        </div>
        <Link href="/new" className="btn-primary">
          Start a new exam
        </Link>
      </div>

      {inProgress.map((a) => (
        <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 border-warn/40 bg-[#fff8e8] p-4">
          <div className="text-sm">
            <span className="font-medium">Unfinished exam</span> · {describeScope(a)} · {a.total} questions · started{" "}
            {formatDateTime(a.startedAt)}
          </div>
          <Link href={`/exam/${a.id}`} className="btn-secondary">
            Resume
          </Link>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Exams taken" value={String(done.length)} />
        <Stat label="Questions attempted" value={String(totalQs)} />
        <Stat label="Overall accuracy" value={done.length ? `${pct(totalCorrect, totalQs)}%` : "—"} />
        <Stat label="Time practised" value={done.length ? formatDuration(totalTime) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Accuracy by unit</h2>
          <ul className="space-y-2.5">
            {SYLLABUS.map((u) => {
              const s = byUnit.get(u.unit);
              return (
                <li key={u.unit}>
                  <AccuracyBar label={`${u.unit}. ${u.name}`} right={s?.right ?? 0} total={s?.total ?? 0} />
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Accuracy by question type</h2>
            <ul className="space-y-2.5">
              {(Object.keys(TYPE_LABELS) as QType[]).map((t) => {
                const s = byType.get(t);
                return (
                  <li key={t}>
                    <AccuracyBar label={TYPE_LABELS[t]} right={s?.right ?? 0} total={s?.total ?? 0} />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent exams</h2>
              <Link href="/history" className="text-sm text-brand hover:underline">
                Full history →
              </Link>
            </div>
            {done.length === 0 ? (
              <p className="text-sm text-muted">No exams yet. Start one to see results here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {done.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link href={`/results/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{describeScope(a)}</div>
                        <div className="text-xs text-muted">
                          {formatDateTime(a.submittedAt!)} · {formatDuration(a.durationSec)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold">
                          {a.correct}/{a.total}
                        </div>
                        <div className="text-xs text-muted">{pct(a.correct ?? 0, a.total)}%</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function tally<K>(map: Map<K, { right: number; total: number }>, key: K, isCorrect: boolean) {
  const cur = map.get(key) ?? { right: 0, total: 0 };
  cur.total++;
  if (isCorrect) cur.right++;
  map.set(key, cur);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
