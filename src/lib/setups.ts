import type { QType, Setup } from "./types";

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

/** Real-exam pace: Paper 2 is 100 questions in 120 minutes. */
export const SECONDS_PER_QUESTION = 72;
export const MARKS_PER_QUESTION = 2;
