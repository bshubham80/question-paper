"use client";

import { useMemo, useState, useTransition } from "react";
import { startExamAction } from "@/app/actions";
import type { BankSummary } from "@/lib/bank";
import { SECONDS_PER_QUESTION, SETUPS } from "@/lib/setups";
import type { Setup } from "@/lib/types";

type Mode = "subject" | "topic";
type Timer = "pace" | "none" | "custom";

const COUNT_PRESETS = [10, 25, 50, 100];

export function NewExamForm({
  summary,
  initialUnit,
  initialTopics,
}: {
  summary: BankSummary;
  initialUnit?: number;
  initialTopics?: string[];
}) {
  const [mode, setMode] = useState<Mode>(initialUnit ? "topic" : "subject");
  const [units, setUnits] = useState<number[]>(summary.units.filter((u) => u.count > 0).map((u) => u.unit));
  const [topicUnit, setTopicUnit] = useState<number>(initialUnit ?? 7);
  const topicsOf = (unit: number) => summary.units.find((u) => u.unit === unit)?.topics.filter((t) => t.count).map((t) => t.id) ?? [];
  // Topic mode: ticked sub-topics of the chosen unit. All ticked = whole unit.
  const [topics, setTopics] = useState<string[]>(() => {
    const valid = topicsOf(initialUnit ?? 7);
    const picked = (initialTopics ?? []).filter((t) => valid.includes(t));
    return picked.length ? picked : valid;
  });
  const [setup, setSetup] = useState<Setup>("balanced");
  const [count, setCount] = useState(25);
  const [timer, setTimer] = useState<Timer>("pace");
  const [customMin, setCustomMin] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = useMemo(() => {
    if (mode === "subject") return summary.units.filter((u) => units.includes(u.unit)).reduce((s, u) => s + u.count, 0);
    const u = summary.units.find((u) => u.unit === topicUnit);
    return u?.topics.filter((t) => topics.includes(t.id)).reduce((s, t) => s + t.count, 0) ?? 0;
  }, [mode, units, topicUnit, topics, summary]);

  const effectiveCount = Math.min(count, available);
  const timeLimitSec =
    timer === "none" ? null : timer === "pace" ? effectiveCount * SECONDS_PER_QUESTION : Math.max(1, customMin) * 60;

  function toggleTopic(id: string) {
    const order = topicsOf(topicUnit);
    setTopics((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : order.filter((t) => t === id || cur.includes(t))));
  }

  function toggleUnit(n: number) {
    setUnits((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await startExamAction({
        mode,
        units: mode === "subject" ? units : [topicUnit],
        topics: mode === "topic" ? topics : [],
        setup,
        count: effectiveCount,
        timeLimitSec,
      });
      if (res?.error) setError(res.error);
    });
  }

  const selectedUnit = summary.units.find((u) => u.unit === topicUnit);

  return (
    <div className="space-y-5">
      {/* 1. Topics */}
      <section className="card p-5">
        <Step n={1} title="What to practise" />
        <div className="mb-4 inline-flex rounded-lg border border-line bg-bg p-1 text-sm">
          {(
            [
              ["subject", "Across subjects"],
              ["topic", "By topic"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md px-4 py-1.5 ${mode === m ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "subject" ? (
          <>
            <div className="mb-2 flex gap-3 text-sm">
              <button type="button" className="text-brand hover:underline" onClick={() => setUnits(summary.units.filter((u) => u.count).map((u) => u.unit))}>
                Select all
              </button>
              <button type="button" className="text-brand hover:underline" onClick={() => setUnits([])}>
                Clear
              </button>
            </div>
            {/* Compact rows: all 10 units fit on about one phone screen. */}
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
              {summary.units.map((u) => (
                <label
                  key={u.unit}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    units.includes(u.unit) ? "border-brand bg-brand-soft" : "border-line"
                  } ${u.count ? "" : "cursor-not-allowed opacity-50"}`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-brand"
                    checked={units.includes(u.unit)}
                    disabled={!u.count}
                    onChange={() => toggleUnit(u.unit)}
                  />
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="font-medium">
                      {u.unit}. {u.name}
                    </span>
                    <span className="block text-xs tabular-nums text-muted">{u.count} questions</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <label htmlFor="topic-unit" className="mb-1 block text-muted">
                Unit
              </label>
              <select
                id="topic-unit"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                value={topicUnit}
                onChange={(e) => {
                  const unit = Number(e.target.value);
                  setTopicUnit(unit);
                  setTopics(topicsOf(unit));
                }}
              >
                {summary.units.map((u) => (
                  <option key={u.unit} value={u.unit} disabled={!u.count}>
                    {u.unit}. {u.name} ({u.count})
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="mb-1 flex w-full items-center justify-between text-sm">
                <span className="text-muted">
                  Topics · {topics.length} of {topicsOf(topicUnit).length} selected
                </span>
                <span className="flex gap-3">
                  <button type="button" className="text-brand hover:underline" onClick={() => setTopics(topicsOf(topicUnit))}>
                    Select all
                  </button>
                  <button type="button" className="text-brand hover:underline" onClick={() => setTopics([])}>
                    Clear
                  </button>
                </span>
              </legend>
              <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                {selectedUnit?.topics.map((t) => (
                  <label
                    key={t.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                      topics.includes(t.id) ? "border-brand bg-brand-soft" : "border-line"
                    } ${t.count ? "" : "cursor-not-allowed opacity-50"}`}
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-brand"
                      checked={topics.includes(t.id)}
                      disabled={!t.count}
                      onChange={() => toggleTopic(t.id)}
                    />
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="font-medium">{t.name}</span>
                      <span className="block text-xs tabular-nums text-muted">{t.count} questions</span>
                    </span>
                  </label>
                ))}
              </div>
              {topics.length === 0 && <p className="mt-2 text-sm text-warn">Tick at least one topic.</p>}
            </fieldset>
          </div>
        )}
      </section>

      {/* 2. Paper setup */}
      <section className="card p-5">
        <Step n={2} title="Paper setup" />
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(SETUPS) as Setup[]).map((s) => (
            <label
              key={s}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${setup === s ? "border-brand bg-brand-soft" : "border-line"}`}
            >
              <input type="radio" name="setup" className="sr-only" checked={setup === s} onChange={() => setSetup(s)} />
              <span className="block font-medium">{SETUPS[s].label}</span>
              <span className="mt-1 block text-xs text-muted">{SETUPS[s].description}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 3. Count + timer */}
      <section className="card p-5">
        <Step n={3} title="Number of questions and time" />
        <div className="flex flex-wrap items-center gap-2">
          {COUNT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              aria-pressed={count === n}
              className={`rounded-lg border px-4 py-2 text-sm ${count === n ? "border-brand bg-brand-soft font-medium" : "border-line"}`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-line px-3 py-2 sm:text-sm"
            aria-label="Custom number of questions"
          />
          <span className="text-sm text-muted">{available} available</span>
        </div>
        {count > available && available > 0 && (
          <p className="mt-2 text-sm text-warn">Only {available} questions match this selection — the exam will have {available}.</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {(
            [
              ["pace", `Real exam pace (${Math.round((effectiveCount * SECONDS_PER_QUESTION) / 60)} min)`],
              ["custom", "Custom"],
              ["none", "Untimed"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimer(t)}
              aria-pressed={timer === t}
              className={`rounded-lg border px-4 py-2 ${timer === t ? "border-brand bg-brand-soft font-medium" : "border-line"}`}
            >
              {label}
            </button>
          ))}
          {timer === "custom" && (
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={customMin}
                onChange={(e) => setCustomMin(Number(e.target.value) || 1)}
                className="w-20 rounded-lg border border-line px-3 py-2"
                aria-label="Minutes"
              />
              minutes
            </span>
          )}
        </div>
      </section>

      {/* Stays on screen while scrolling; on phones it sits just above the tab bar. */}
      <div
        data-testid="start-bar"
        className="sticky bottom-[var(--nav-h)] z-10 -mx-4 space-y-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border"
      >
        {error && <p className="rounded-lg bg-bad-soft px-4 py-2 text-sm text-bad">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            {SETUPS[setup].label} · {timeLimitSec ? `${Math.round(timeLimitSec / 60)} min` : "untimed"}
          </span>
          <button type="button" className="btn-primary w-full py-3 sm:w-auto sm:px-6 sm:py-2.5" onClick={submit} disabled={pending || !available}>
            {pending ? "Preparing exam…" : `Start exam · ${effectiveCount} questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-semibold">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">{n}</span>
      {title}
    </h2>
  );
}
