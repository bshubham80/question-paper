import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, getQuestion } from "@/lib/bank";
import { buildExam, examPool, type ExamConfig } from "@/lib/exam-builder";
import type { QType, Question } from "@/lib/types";

const ALL_UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Deterministic PRNG so failures are reproducible. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function config(overrides: Partial<ExamConfig>): ExamConfig {
  return { mode: "subject", units: ALL_UNITS, topics: [], kind: "both", setup: "balanced", count: 25, timeLimitSec: null, ...overrides };
}

function questions(ids: string[]): Question[] {
  return ids.map((id) => getQuestion(id)!);
}

function countBy<K extends string | number>(qs: Question[], key: (q: Question) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const q of qs) out[key(q)] = (out[key(q)] ?? 0) + 1;
  return out;
}

const SEEDS = [1, 2, 3, 42, 99, 1234, 2026, 31337];

describe("buildExam — size and integrity", () => {
  it("returns exactly the requested number of questions", () => {
    for (const count of [1, 10, 25, 50, 100]) {
      expect(buildExam(ALL_QUESTIONS, config({ count }), new Set(), seeded(count))).toHaveLength(count);
    }
  });

  it("never repeats a question within one exam", () => {
    for (const seed of SEEDS) {
      const ids = buildExam(ALL_QUESTIONS, config({ count: 200 }), new Set(), seeded(seed));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("only returns ids that exist in the bank", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ count: 100 }), new Set(), seeded(7));
    for (const id of ids) expect(getQuestion(id)).toBeDefined();
  });

  it("caps the exam at the size of the pool", () => {
    const pool = examPool(ALL_QUESTIONS, { mode: "topic", units: [7], topics: ["u07-t10"], kind: "both" });
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [7], topics: ["u07-t10"], count: 500 }), new Set(), seeded(1));
    expect(ids).toHaveLength(pool.length);
  });

  it("returns an empty exam when nothing matches", () => {
    expect(buildExam(ALL_QUESTIONS, config({ units: [] }), new Set(), seeded(1))).toEqual([]);
  });

  it("is deterministic for the same random seed", () => {
    const a = buildExam(ALL_QUESTIONS, config({ count: 30 }), new Set(), seeded(5));
    const b = buildExam(ALL_QUESTIONS, config({ count: 30 }), new Set(), seeded(5));
    expect(a).toEqual(b);
  });
});

describe("buildExam — scope (topics)", () => {
  it("across subjects: only uses the selected units", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ units: [2, 9], count: 40 }), new Set(), seeded(3));
    for (const q of questions(ids)) expect([2, 9]).toContain(q.unit);
  });

  it("single topic, whole unit: only uses that unit", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [4], topics: [], count: 30 }), new Set(), seeded(3));
    for (const q of questions(ids)) expect(q.unit).toBe(4);
  });

  it("single topic, one sub-topic: only uses that sub-topic", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [10], topics: ["u10-t06"], count: 6 }), new Set(), seeded(3));
    expect(ids.length).toBeGreaterThan(0);
    for (const q of questions(ids)) expect(q.topic).toBe("u10-t06");
  });
});

describe("buildExam — several topics of one unit", () => {
  const picked = ["u07-t02", "u07-t05", "u07-t10"];

  it("only uses the ticked topics", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [7], topics: picked, count: 15 }), new Set(), seeded(6));
    expect(ids).toHaveLength(15);
    for (const q of questions(ids)) expect(picked).toContain(q.topic);
  });

  it("splits evenly across the ticked topics", () => {
    for (const seed of SEEDS) {
      const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [7], topics: picked, count: 15 }), new Set(), seeded(seed));
      expect(countBy(questions(ids), (q) => q.topic)).toEqual({ "u07-t02": 5, "u07-t05": 5, "u07-t10": 5 });
    }
  });

  it("the pool is the sum of the ticked topics", () => {
    const pool = examPool(ALL_QUESTIONS, { mode: "topic", units: [7], topics: picked, kind: "both" });
    const expected = ALL_QUESTIONS.filter((q) => picked.includes(q.topic)).length;
    expect(pool).toHaveLength(expected);
  });
});

describe("buildExam — topic weightage (SKILL.md §4)", () => {
  it("splits evenly across units", () => {
    for (const seed of SEEDS) {
      const ids = buildExam(ALL_QUESTIONS, config({ count: 50 }), new Set(), seeded(seed));
      const byUnit = countBy(questions(ids), (q) => q.unit);
      for (const u of ALL_UNITS) expect(byUnit[u]).toBe(5);
    }
  });

  it("gives leftover questions to earlier units", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ units: [1, 2, 3], count: 10 }), new Set(), seeded(11));
    expect(countBy(questions(ids), (q) => q.unit)).toEqual({ 1: 4, 2: 3, 3: 3 });
  });

  it("whole-unit topic exams spread across the unit's sub-topics", () => {
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [7], topics: [], count: 20 }), new Set(), seeded(8));
    const byTopic = countBy(questions(ids), (q) => q.topic);
    expect(Object.keys(byTopic)).toHaveLength(10);
    for (const n of Object.values(byTopic)) expect(n).toBe(2);
  });
});

describe("buildExam — type mix per paper setup (SKILL.md §3)", () => {
  const cases: { setup: ExamConfig["setup"]; count: number; expected: Record<QType, number> }[] = [
    { setup: "balanced", count: 100, expected: { mcq: 40, ar: 20, statements: 15, matching: 15, sequencing: 10 } },
    { setup: "balanced", count: 20, expected: { mcq: 8, ar: 4, statements: 3, matching: 3, sequencing: 2 } },
    { setup: "assertion", count: 100, expected: { ar: 45, mcq: 25, statements: 15, matching: 10, sequencing: 5 } },
    { setup: "assertion", count: 20, expected: { ar: 9, mcq: 5, statements: 3, matching: 2, sequencing: 1 } },
    { setup: "analytical", count: 100, expected: { ar: 25, statements: 25, matching: 20, sequencing: 20, mcq: 10 } },
    { setup: "analytical", count: 20, expected: { ar: 5, statements: 5, matching: 4, sequencing: 4, mcq: 2 } },
  ];

  for (const { setup, count, expected } of cases) {
    it(`${setup}, ${count} questions across all units → ${JSON.stringify(expected)}`, () => {
      for (const seed of SEEDS) {
        const ids = buildExam(ALL_QUESTIONS, config({ setup, count }), new Set(), seeded(seed));
        expect(countBy(questions(ids), (q) => q.type)).toEqual(expected);
      }
    });
  }

  it("rounds with the largest remainder so the types add up to the count", () => {
    // Analytical, 10: 2.5 / 2.5 / 2 / 2 / 1 → the tie goes to the first listed type (AR).
    const ids = buildExam(ALL_QUESTIONS, config({ setup: "analytical", count: 10 }), new Set(), seeded(4));
    expect(countBy(questions(ids), (q) => q.type)).toEqual({ ar: 3, statements: 2, matching: 2, sequencing: 2, mcq: 1 });
  });

  it("still fills the exam when a small pool cannot meet the mix", () => {
    const pool = examPool(ALL_QUESTIONS, { mode: "topic", units: [7], topics: ["u07-t10"], kind: "both" });
    const ids = buildExam(ALL_QUESTIONS, config({ mode: "topic", units: [7], topics: ["u07-t10"], setup: "assertion", count: pool.length }), new Set(), seeded(2));
    expect(ids).toHaveLength(pool.length);
  });
});

describe("buildExam — unseen questions first and random order", () => {
  it("prefers questions she has not seen yet", () => {
    const unit1 = ALL_QUESTIONS.filter((q) => q.unit === 1);
    const seen = new Set(unit1.slice(0, 30).map((q) => q.id));
    for (const seed of SEEDS) {
      const ids = buildExam(ALL_QUESTIONS, config({ units: [1], count: 10 }), seen, seeded(seed));
      for (const id of ids) expect(seen.has(id)).toBe(false);
    }
  });

  it("falls back to seen questions once the unseen ones run out", () => {
    const unit1 = ALL_QUESTIONS.filter((q) => q.unit === 1);
    const seen = new Set(unit1.map((q) => q.id));
    expect(buildExam(ALL_QUESTIONS, config({ units: [1], count: 10 }), seen, seeded(1))).toHaveLength(10);
  });

  it("does not group questions by unit or type", () => {
    for (const seed of SEEDS) {
      const qs = questions(buildExam(ALL_QUESTIONS, config({ count: 50 }), new Set(), seeded(seed)));
      const units = qs.map((q) => q.unit);
      const types = qs.map((q) => q.type);
      expect(units).not.toEqual([...units].sort((a, b) => a - b));
      expect(types).not.toEqual([...types].sort());
    }
  });
});

describe("buildExam — question type", () => {
  it("numerical only: every question needs a calculation", () => {
    for (const seed of SEEDS) {
      const qs = questions(buildExam(ALL_QUESTIONS, config({ kind: "numerical", count: 50 }), new Set(), seeded(seed)));
      expect(qs).toHaveLength(50);
      for (const q of qs) expect(q.numerical).toBe(true);
    }
  });

  it("non-numerical only: no question needs a calculation", () => {
    for (const seed of SEEDS) {
      const qs = questions(buildExam(ALL_QUESTIONS, config({ kind: "non-numerical", count: 50 }), new Set(), seeded(seed)));
      expect(qs).toHaveLength(50);
      for (const q of qs) expect(q.numerical).toBeFalsy();
    }
  });

  it("the two kinds split the pool with nothing left over", () => {
    const scope = { mode: "subject" as const, units: [4], topics: [] };
    const both = examPool(ALL_QUESTIONS, { ...scope, kind: "both" });
    const num = examPool(ALL_QUESTIONS, { ...scope, kind: "numerical" });
    const non = examPool(ALL_QUESTIONS, { ...scope, kind: "non-numerical" });
    expect(num.length).toBeGreaterThan(0);
    expect(num.length + non.length).toBe(both.length);
  });

  it("caps a numerical exam at the numerical questions available", () => {
    const pool = examPool(ALL_QUESTIONS, { mode: "subject", units: [9], topics: [], kind: "numerical" });
    expect(buildExam(ALL_QUESTIONS, config({ units: [9], kind: "numerical", count: 100 }), new Set(), seeded(1))).toHaveLength(pool.length);
  });
});
