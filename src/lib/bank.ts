import "server-only";
import type { ExamQuestion, Question } from "./types";
import { SYLLABUS } from "./syllabus";
import u01 from "@/data/questions/unit-01.json";
import u02 from "@/data/questions/unit-02.json";
import u03 from "@/data/questions/unit-03.json";
import u04 from "@/data/questions/unit-04.json";
import u05 from "@/data/questions/unit-05.json";
import u06 from "@/data/questions/unit-06.json";
import u07 from "@/data/questions/unit-07.json";
import u08 from "@/data/questions/unit-08.json";
import u09 from "@/data/questions/unit-09.json";
import u10 from "@/data/questions/unit-10.json";

export const ALL_QUESTIONS = [u01, u02, u03, u04, u05, u06, u07, u08, u09, u10].flat() as Question[];

const BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

/** Strip everything that would reveal the answer or topic during the exam. */
export function toExamQuestion(q: Question): ExamQuestion {
  const { id, type, stem, reason, items, listI, listII, prompt, options } = q;
  return { id, type, stem, reason, items, listI, listII, prompt, options };
}

/** Question counts per unit and sub-topic, safe to send to the browser. */
export interface BankSummary {
  units: { unit: number; name: string; count: number; topics: { id: string; name: string; count: number }[] }[];
}

export function bankSummary(): BankSummary {
  const byTopic = new Map<string, number>();
  for (const q of ALL_QUESTIONS) byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1);
  return {
    units: SYLLABUS.map((u) => {
      const topics = u.topics.map((t) => ({ id: t.id, name: t.name, count: byTopic.get(t.id) ?? 0 }));
      return { unit: u.unit, name: u.name, count: topics.reduce((s, t) => s + t.count, 0), topics };
    }),
  };
}
