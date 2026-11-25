import "server-only";
import type { Row } from "@libsql/client";
import { db } from "./db";
import { ALL_QUESTIONS, getQuestion } from "./bank";
import { buildExam, type ExamConfig } from "./exam-builder";
import type { Letter, QuestionKind, Setup } from "./types";

/** Per-question state kept by the exam screen and autosaved. */
export interface AnswerState {
  chosen: Letter | null;
  marked: boolean;
  visited: boolean;
  timeSpentSec: number;
}
export type Progress = Record<string, AnswerState>;

export interface Attempt {
  id: string;
  mode: "subject" | "topic";
  units: number[];
  topics: string[]; // topic mode: chosen sub-topics; empty = whole unit
  kind: QuestionKind;
  setup: Setup;
  questionIds: string[];
  timeLimitSec: number | null;
  startedAt: string;
  submittedAt: string | null;
  durationSec: number | null;
  total: number;
  correct: number | null;
  wrong: number | null;
  unattempted: number | null;
  progress: Progress;
}

export interface AttemptAnswer {
  questionId: string;
  position: number;
  chosen: Letter | null;
  isCorrect: boolean;
  timeSpentSec: number;
  marked: boolean;
}

/** `topic` column: JSON array of sub-topic ids; older rows hold a single id. NULL = whole unit. */
function parseTopics(v: string | null): string[] {
  if (!v) return [];
  return v.startsWith("[") ? JSON.parse(v) : [v];
}

function toAttempt(r: Row): Attempt {
  return {
    id: String(r.id),
    mode: r.mode as Attempt["mode"],
    units: JSON.parse(String(r.units)),
    topics: parseTopics(r.topic as string | null),
    kind: ((r.kind as string | null) ?? "both") as QuestionKind,
    setup: r.setup as Setup,
    questionIds: JSON.parse(String(r.question_ids)),
    timeLimitSec: r.time_limit_sec == null ? null : Number(r.time_limit_sec),
    startedAt: String(r.started_at),
    submittedAt: (r.submitted_at as string | null) ?? null,
    durationSec: r.duration_sec == null ? null : Number(r.duration_sec),
    total: Number(r.total),
    correct: r.correct == null ? null : Number(r.correct),
    wrong: r.wrong == null ? null : Number(r.wrong),
    unattempted: r.unattempted == null ? null : Number(r.unattempted),
    progress: r.progress ? JSON.parse(String(r.progress)) : {},
  };
}

export async function createAttempt(config: ExamConfig): Promise<string> {
  const client = await db();
  const seenRows = await client.execute("SELECT DISTINCT question_id FROM attempt_answers");
  const seen = new Set(seenRows.rows.map((r) => String(r.question_id)));
  const ids = buildExam(ALL_QUESTIONS, config, seen);
  if (!ids.length) throw new Error("No questions available for this selection.");

  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO attempts (id, mode, units, topic, kind, setup, question_ids, time_limit_sec, started_at, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      config.mode,
      JSON.stringify(config.units),
      config.topics.length ? JSON.stringify(config.topics) : null,
      config.kind === "both" ? null : config.kind,
      config.setup,
      JSON.stringify(ids),
      config.timeLimitSec,
      new Date().toISOString(),
      ids.length,
    ],
  });
  return id;
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  const client = await db();
  const res = await client.execute({ sql: "SELECT * FROM attempts WHERE id = ?", args: [id] });
  return res.rows[0] ? toAttempt(res.rows[0]) : null;
}

export async function getAttemptAnswers(id: string): Promise<AttemptAnswer[]> {
  const client = await db();
  const res = await client.execute({
    sql: "SELECT * FROM attempt_answers WHERE attempt_id = ? ORDER BY position",
    args: [id],
  });
  return res.rows.map((r) => ({
    questionId: String(r.question_id),
    position: Number(r.position),
    chosen: (r.chosen as Letter | null) ?? null,
    isCorrect: Number(r.is_correct) === 1,
    timeSpentSec: Number(r.time_spent_sec),
    marked: Number(r.marked) === 1,
  }));
}

export async function saveProgress(id: string, progress: Progress): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE attempts SET progress = ? WHERE id = ? AND submitted_at IS NULL",
    args: [JSON.stringify(progress), id],
  });
}

/** Grades and stores the attempt. Idempotent: a second submit is ignored. */
export async function submitAttempt(id: string, progress: Progress): Promise<void> {
  const attempt = await getAttempt(id);
  if (!attempt || attempt.submittedAt) return;

  const now = new Date();
  let duration = Math.round((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
  if (attempt.timeLimitSec) duration = Math.min(duration, attempt.timeLimitSec);

  let correct = 0;
  let wrong = 0;
  const rows = attempt.questionIds.map((qid, position) => {
    const s = progress[qid];
    const chosen = s?.chosen ?? null;
    const isCorrect = chosen !== null && getQuestion(qid)?.answer === chosen;
    if (isCorrect) correct++;
    else if (chosen) wrong++;
    return {
      sql: `INSERT OR REPLACE INTO attempt_answers
            (attempt_id, question_id, position, chosen, is_correct, time_spent_sec, marked)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, qid, position, chosen, isCorrect ? 1 : 0, Math.round(s?.timeSpentSec ?? 0), s?.marked ? 1 : 0],
    };
  });

  const client = await db();
  await client.batch(
    [
      ...rows,
      {
        sql: `UPDATE attempts SET submitted_at = ?, duration_sec = ?, correct = ?, wrong = ?, unattempted = ?, progress = ?
              WHERE id = ? AND submitted_at IS NULL`,
        args: [now.toISOString(), duration, correct, wrong, attempt.total - correct - wrong, JSON.stringify(progress), id],
      },
    ],
    "write",
  );
}

/** True when a timed attempt's clock has run out. */
export function isTimeUp(a: Attempt): boolean {
  return !!a.timeLimitSec && Date.now() - new Date(a.startedAt).getTime() >= a.timeLimitSec * 1000;
}

export function serverNow(): number {
  return Date.now();
}

export async function listAttempts(): Promise<Attempt[]> {
  const client = await db();
  const res = await client.execute("SELECT * FROM attempts ORDER BY started_at DESC");
  return res.rows.map(toAttempt);
}

export async function deleteAttempt(id: string): Promise<void> {
  const client = await db();
  await client.batch(
    [
      { sql: "DELETE FROM attempt_answers WHERE attempt_id = ?", args: [id] },
      { sql: "DELETE FROM attempts WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

/** Every graded answer, for unit / type accuracy on the dashboard. */
export async function allGradedAnswers(): Promise<{ questionId: string; chosen: Letter | null; isCorrect: boolean }[]> {
  const client = await db();
  const res = await client.execute("SELECT question_id, chosen, is_correct FROM attempt_answers");
  return res.rows.map((r) => ({
    questionId: String(r.question_id),
    chosen: (r.chosen as Letter | null) ?? null,
    isCorrect: Number(r.is_correct) === 1,
  }));
}
