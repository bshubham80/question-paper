import type { QType, QuestionKind, Setup } from "./types";

// Paper setups and type mix, verbatim from .claude/SKILL.md §3.
export const SETUPS: Record<Setup, { label: string; description: string; mix: Record<QType, number> }> = {
  balanced: {
    label: "Balanced Mix",
    description: "A well-distributed combination of all question types.",
    mix: { mcq: 0.4, ar: 0.2, statements: 0.15, matching: 0.15, sequencing: 0.1 },
  },
  assertion: {
    label: "Assertion-Focused",
    description: "Higher weightage for Assertion–Reasoning questions.",
    mix: { ar: 0.45, mcq: 0.25, statements: 0.15, matching: 0.1, sequencing: 0.05 },
  },
  analytical: {
    label: "Analytical Mix",
    description: "Higher weightage for: Assertion–Reasoning, Multiple Statements, Matching, Sequencing",
    mix: { ar: 0.25, statements: 0.25, matching: 0.2, sequencing: 0.2, mcq: 0.1 },
  },
};

export const TYPE_LABELS: Record<QType, string> = {
  mcq: "Direct MCQ",
  ar: "Assertion–Reasoning",
  statements: "Multiple Statements",
  matching: "Matching",
  sequencing: "Sequencing",
};

export const KIND_LABELS: Record<QuestionKind, { label: string; description: string }> = {
  both: { label: "Both", description: "Numerical and non-numerical questions together." },
  numerical: { label: "Numerical only", description: "Questions that need a calculation." },
  "non-numerical": { label: "Non-numerical only", description: "Conceptual and factual questions, no calculation." },
};

/** "Balanced Mix", "Non-numerical only · Balanced Mix", or just "Numerical only" (no paper setup there). */
export function examSetupLabel(kind: QuestionKind, setup: Setup): string {
  if (kind === "numerical") return KIND_LABELS.numerical.label;
  return kind === "both" ? SETUPS[setup].label : `${KIND_LABELS[kind].label} · ${SETUPS[setup].label}`;
}

/** Real-exam pace: Paper 2 is 100 questions in 120 minutes. */
export const SECONDS_PER_QUESTION = 72;
export const MARKS_PER_QUESTION = 2;
