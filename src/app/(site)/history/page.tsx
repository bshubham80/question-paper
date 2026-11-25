import Link from "next/link";
import { listAttempts, type Attempt } from "@/lib/attempts";
import { describeScope, formatDateTime, formatDuration, pct } from "@/lib/format";
import { examSetupLabel, KIND_LABELS, SETUPS } from "@/lib/setups";
import { UnitFilter } from "./UnitFilter";

export const dynamic = "force-dynamic";

function scoreColor(p: number) {
  return p >= 70 ? "text-good" : p >= 50 ? "text-warn" : "text-bad";
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const { unit } = await searchParams;
  const unitFilter = unit ? Number(unit) : null;
  const attempts = (await listAttempts()).filter((a) => !unitFilter || a.units.includes(unitFilter));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">History</h1>
          <p className="text-sm text-muted">Every exam attempted, newest first. Times are in IST.</p>
        </div>
        <UnitFilter value={unit ?? ""} />
      </div>

      {attempts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No exams yet.{" "}
          <Link href="/new" className="text-brand hover:underline">
            Start one
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Phones: one card per exam. */}
          <ul className="space-y-3 sm:hidden" aria-label="Exam history">
            {attempts.map((a) => (
              <li key={a.id}>
                <HistoryCard a={a} />
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: table. */}
          <div className="card hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Date &amp; time</th>
                  <th className="px-4 py-3 font-medium">Covered</th>
                  <th className="px-4 py-3 font-medium">Setup</th>
                  <th className="px-4 py-3 text-right font-medium">Correct</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">Time taken</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attempts.map((a) => {
                  const done = !!a.submittedAt;
                  const p = pct(a.correct ?? 0, a.total);
                  return (
                    <tr key={a.id} className="hover:bg-bg">
                      <td className="whitespace-nowrap px-4 py-3">{formatDateTime(a.startedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate">{describeScope(a)}</div>
                        <div className="text-xs text-muted">{a.mode === "topic" ? "By topic" : "Across subjects"}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {a.kind === "numerical" ? KIND_LABELS.numerical.label : SETUPS[a.setup].label}
                        {a.kind === "non-numerical" && <div className="text-xs">{KIND_LABELS[a.kind].label}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {done ? (
                          <>
                            <span className="font-semibold">{a.correct}</span>
                            <span className="text-muted">/{a.total}</span>
                          </>
                        ) : (
                          <span className="text-muted">—/{a.total}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {done ? <span className={scoreColor(p)}>{p}%</span> : <InProgress />}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatDuration(a.durationSec)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link href={done ? `/results/${a.id}` : `/exam/${a.id}`} className="text-brand hover:underline">
                          {done ? "Review" : "Resume"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function HistoryCard({ a }: { a: Attempt }) {
  const done = !!a.submittedAt;
  const p = pct(a.correct ?? 0, a.total);
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{describeScope(a)}</div>
          <div className="mt-0.5 text-xs text-muted">
            {formatDateTime(a.startedAt)} · {a.mode === "topic" ? "By topic" : "Across subjects"} · {examSetupLabel(a.kind, a.setup)}
          </div>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          {done ? (
            <>
              <div className="text-xl font-semibold">
                {a.correct}
                <span className="text-sm font-normal text-muted">/{a.total}</span>
              </div>
              <div className={`text-sm ${scoreColor(p)}`}>{p}%</div>
            </>
          ) : (
            <>
              <div className="text-xl font-semibold text-muted">—/{a.total}</div>
              <InProgress />
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <span className="text-muted">
          {done ? (
            <>
              Time taken <span className="tabular-nums text-ink">{formatDuration(a.durationSec)}</span>
            </>
          ) : (
            "Not submitted yet"
          )}
        </span>
        <Link href={done ? `/results/${a.id}` : `/exam/${a.id}`} className="btn-secondary py-1.5">
          {done ? "Review" : "Resume"}
        </Link>
      </div>
    </div>
  );
}

function InProgress() {
  return <span className="rounded-full bg-[#fff3d6] px-2 py-0.5 text-xs text-warn">In progress</span>;
}
