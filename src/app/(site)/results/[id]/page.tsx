import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAttempt, getAttemptAnswers } from "@/lib/attempts";
import { getQuestion } from "@/lib/bank";
import { describeScope, formatDateTime, formatDuration, pct } from "@/lib/format";
import { examSetupLabel, MARKS_PER_QUESTION, TYPE_LABELS } from "@/lib/setups";
import { getTopic, getUnit } from "@/lib/syllabus";
import { AccuracyBar } from "@/components/AccuracyBar";
import { Review, type ReviewItem } from "./Review";
import { DeleteAttempt } from "./DeleteAttempt";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attempt = await getAttempt(id);
  if (!attempt) notFound();
  if (!attempt.submittedAt) redirect(`/exam/${id}`);
  const answers = await getAttemptAnswers(id);

  const items: ReviewItem[] = answers.flatMap((a) => {
    const q = getQuestion(a.questionId);
    if (!q) return [];
    return [
      {
        q,
        number: a.position + 1,
        chosen: a.chosen,
        isCorrect: a.isCorrect,
        marked: a.marked,
        timeSpentSec: a.timeSpentSec,
        topicName: getTopic(q.topic)?.name ?? "",
        unitName: getUnit(q.unit)?.name ?? "",
      },
    ];
  });

  const correct = attempt.correct ?? 0;
  const wrong = attempt.wrong ?? 0;
  const attempted = correct + wrong;

  // Break down by unit when several units were covered, otherwise by sub-topic.
  const byGroup = new Map<string, { right: number; total: number }>();
  const byType = new Map<string, { right: number; total: number }>();
  const multiUnit = attempt.units.length > 1;
  for (const it of items) {
    const g = multiUnit ? `${it.q.unit}. ${it.unitName}` : it.topicName;
    for (const [map, key] of [
      [byGroup, g],
      [byType, TYPE_LABELS[it.q.type]],
    ] as const) {
      const cur = map.get(key) ?? { right: 0, total: 0 };
      cur.total++;
      if (it.isCorrect) cur.right++;
      map.set(key, cur);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/history" className="text-sm text-brand hover:underline">
            ← History
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold">{describeScope(attempt)}</h1>
          <p className="text-sm text-muted">
            {formatDateTime(attempt.startedAt)} · {examSetupLabel(attempt.kind, attempt.setup)} ·{" "}
            {attempt.timeLimitSec ? `${Math.round(attempt.timeLimitSec / 60)} min limit` : "untimed"}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <DeleteAttempt id={id} />
          <Link
            href={attempt.mode === "topic" ? `/new?unit=${attempt.units[0]}${attempt.topics.map((t) => `&topic=${t}`).join("")}` : "/new"}
            className="btn-primary flex-1 sm:flex-none"
          >
            Practise again
          </Link>
        </div>
      </div>

      {/* Even 2×2 on phones, one row of four on wider screens. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Score</div>
          <div className="mt-1 text-2xl font-semibold sm:text-3xl">
            {correct}
            <span className="text-lg text-muted">/{attempt.total}</span>
          </div>
          <div className="text-sm text-muted">
            {correct * MARKS_PER_QUESTION}/{attempt.total * MARKS_PER_QUESTION} marks · {pct(correct, attempt.total)}%
          </div>
        </div>
        <Stat label="Accuracy (of attempted)" value={attempted ? `${pct(correct, attempted)}%` : "—"} />
        <Stat label="Correct / Wrong / Skipped" value={`${correct} / ${wrong} / ${attempt.unattempted ?? 0}`} />
        <Stat
          label="Time taken"
          value={formatDuration(attempt.durationSec)}
          sub={attempt.durationSec ? `${Math.round(attempt.durationSec / attempt.total)}s per question` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">{multiUnit ? "By unit" : "By topic"}</h2>
          <ul className="space-y-2.5">
            {[...byGroup.entries()]
              .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
              .map(([k, v]) => (
                <li key={k}>
                  <AccuracyBar label={k} right={v.right} total={v.total} />
                </li>
              ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">By question type</h2>
          <ul className="space-y-2.5">
            {[...byType.entries()].map(([k, v]) => (
              <li key={k}>
                <AccuracyBar label={k} right={v.right} total={v.total} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Review items={items} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}
