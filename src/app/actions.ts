"use server";

import { redirect } from "next/navigation";
import { createAttempt, deleteAttempt, saveProgress, submitAttempt, type Progress } from "@/lib/attempts";
import type { ExamConfig } from "@/lib/exam-builder";
import { KIND_LABELS, SETUPS } from "@/lib/setups";
import { getUnit } from "@/lib/syllabus";

export async function startExamAction(config: ExamConfig): Promise<{ error: string } | void> {
  const units = [...new Set(config.units)].filter((u) => getUnit(u));
  if (!units.length) return { error: "Select at least one unit." };
  if (config.mode === "topic" && units.length !== 1) return { error: "Pick exactly one unit for a topic exam." };
  const topics = config.mode === "topic" ? [...new Set(config.topics ?? [])] : [];
  const unitTopics = new Set(getUnit(units[0])?.topics.map((t) => t.id));
  if (topics.some((t) => !unitTopics.has(t))) return { error: "Unknown topic." };
  const kind = config.kind ?? "both";
  if (!Object.hasOwn(KIND_LABELS, kind)) return { error: "Choose a question type." };
  if (!(config.setup in SETUPS)) return { error: "Choose a paper setup." };
  // Numerical questions are almost all direct MCQs, so a numerical exam has no paper setup to follow.
  const setup = kind === "numerical" ? "balanced" : config.setup;
  const count = Math.floor(config.count);
  if (!(count > 0 && count <= 200)) return { error: "Number of questions must be between 1 and 200." };
  const timeLimitSec = config.timeLimitSec && config.timeLimitSec > 0 ? Math.floor(config.timeLimitSec) : null;

  let id: string;
  try {
    // Every topic of the unit ticked is the same exam as the whole unit.
    const wholeUnit = topics.length === unitTopics.size;
    id = await createAttempt({ ...config, units, topics: wholeUnit ? [] : topics, kind, setup, count, timeLimitSec });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/exam/${id}`);
}

export async function saveProgressAction(id: string, progress: Progress): Promise<void> {
  await saveProgress(id, progress);
}

export async function submitExamAction(id: string, progress: Progress): Promise<void> {
  await submitAttempt(id, progress);
  redirect(`/results/${id}`);
}

export async function deleteAttemptAction(id: string): Promise<void> {
  await deleteAttempt(id);
  redirect("/history");
}
