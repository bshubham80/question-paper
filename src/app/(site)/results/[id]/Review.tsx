"use client";

import { useState } from "react";
import type { Letter, Question } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { LETTERS, QuestionBody } from "@/components/QuestionBody";

export interface ReviewItem {
  q: Question;
  number: number;
  chosen: Letter | null;
  isCorrect: boolean;
  marked: boolean;
  timeSpentSec: number;
  topicName: string;
  unitName: string;
}

const FILTERS = {
  all: { label: "All", test: () => true },
  wrong: { label: "Wrong", test: (i: ReviewItem) => !!i.chosen && !i.isCorrect },
  skipped: { label: "Skipped", test: (i: ReviewItem) => !i.chosen },
  marked: { label: "Marked", test: (i: ReviewItem) => i.marked },
  correct: { label: "Correct", test: (i: ReviewItem) => i.isCorrect },
} satisfies Record<string, { label: string; test: (i: ReviewItem) => boolean }>;
type Filter = keyof typeof FILTERS;

export function Review({ items }: { items: ReviewItem[] }) {
  const [filter, setFilter] = useState<Filter>(() => (items.some(FILTERS.wrong.test) ? "wrong" : "all"));
  const shown = items.filter(FILTERS[filter].test);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-xl font-semibold">Review answers</h2>
        {/* One row that scrolls sideways on phones instead of wrapping. */}
        <div data-testid="review-filters" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-1 rounded-lg border border-line bg-surface p-1 text-sm">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 ${filter === f ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
              >
                {FILTERS[f].label} ({items.filter(FILTERS[f].test).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 && <p className="card p-6 text-sm text-muted">Nothing here.</p>}

      {shown.map((it) => {
        const status = it.isCorrect ? "correct" : it.chosen ? "wrong" : "skipped";
        return (
          <article key={it.q.id} className="card -mx-4 rounded-none border-x-0 p-4 sm:mx-0 sm:rounded-xl sm:border-x sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2.5 py-0.5 font-medium ${
                  status === "correct" ? "bg-good-soft text-good" : status === "wrong" ? "bg-bad-soft text-bad" : "bg-bg text-muted"
                }`}
              >
                {status === "correct" ? "Correct" : status === "wrong" ? "Wrong" : "Not answered"}
              </span>
              {it.marked && <span className="rounded-full bg-review-soft px-2.5 py-0.5 text-review">Marked</span>}
              <span className="text-muted">
                {it.unitName} › {it.topicName}
              </span>
              <span className="ml-auto text-muted">{formatDuration(it.timeSpentSec)}</span>
            </div>

            <QuestionBody q={it.q} number={it.number} />

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {it.q.options.map((opt, i) => {
                const l = LETTERS[i];
                const isAnswer = it.q.answer === l;
                const isChosen = it.chosen === l;
                return (
                  <div
                    key={l}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 font-serif ${
                      isAnswer ? "border-good bg-good-soft" : isChosen ? "border-bad bg-bad-soft" : "border-line"
                    }`}
                  >
                    <span className="font-sans text-sm font-semibold text-muted">{l})</span>
                    <span className="flex-1">{opt}</span>
                    {isAnswer && <span className="font-sans text-xs font-medium text-good">Correct</span>}
                    {isChosen && !isAnswer && <span className="font-sans text-xs font-medium text-bad">Your answer</span>}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg bg-bg px-4 py-3 text-sm leading-relaxed">
              <span className="font-semibold">Answer: {it.q.answer}</span>
              {it.q.code && <span className="text-muted"> ({it.q.code})</span>}
              <span className="text-muted"> — </span>
              {it.q.explanation}
            </div>
          </article>
        );
      })}
    </section>
  );
}
