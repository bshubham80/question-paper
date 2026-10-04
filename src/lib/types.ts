export type QType = "mcq" | "ar" | "statements" | "matching" | "sequencing";
export type Letter = "a" | "b" | "c" | "d";
export type Setup = "balanced" | "assertion" | "analytical";

/** One question in the bank. Layout follows .claude/question-types.md. */
export interface Question {
  id: string; // "u07-001"
  unit: number; // 1..10
  topic: string; // sub-topic id from syllabus, e.g. "u07-t03"
  type: QType;
  stem: string; // bold stem; for AR this is "Assertion (A): ..."
  reason?: string; // AR only: "Reason (R): ..."
  items?: string[]; // statements / sequencing items, printed as 1..n
  listI?: string[]; // matching only, printed as A..D
  listII?: string[]; // matching only, printed as 1..n
  prompt?: string; // e.g. "Choose the correct option:"
  options: [string, string, string, string];
  answer: Letter;
  code?: string; // matching/sequencing code of the correct option, e.g. "A-2, B-1, C-4, D-3"
  explanation: string;
}

/** Question as sent to the exam screen: no answer, code or explanation. */
export type ExamQuestion = Omit<Question, "answer" | "code" | "explanation" | "topic" | "unit">;
