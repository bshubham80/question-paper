import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamConfig } from "@/lib/exam-builder";

const createAttempt = vi.fn<(config: ExamConfig) => Promise<string>>(async () => "attempt-1");
vi.mock("@/lib/attempts", () => ({
  createAttempt: (config: ExamConfig) => createAttempt(config),
  deleteAttempt: vi.fn(),
  saveProgress: vi.fn(),
  submitAttempt: vi.fn(),
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { startExamAction } = await import("@/app/actions");

const valid: ExamConfig = { mode: "subject", units: [1, 7], topics: [], setup: "balanced", count: 25, timeLimitSec: 1800 };

async function run(overrides: Partial<ExamConfig>) {
  try {
    return { result: await startExamAction({ ...valid, ...overrides }), redirect: null as string | null };
  } catch (e) {
    if (e instanceof RedirectError) return { result: undefined, redirect: e.url };
    throw e;
  }
}

beforeEach(() => createAttempt.mockClear());

describe("startExamAction — rejects bad input", () => {
  it.each([
    ["no units selected", { units: [] }, "Select at least one unit."],
    ["only unknown unit numbers", { units: [0, 11, 99] }, "Select at least one unit."],
    ["single-topic exam with two units", { mode: "topic" as const, units: [1, 2] }, "Pick exactly one unit for a topic exam."],
    ["topic from a different unit", { mode: "topic" as const, units: [7], topics: ["u01-t01"] }, "Unknown topic."],
    ["made-up topic id", { mode: "topic" as const, units: [7], topics: ["u07-t99"] }, "Unknown topic."],
    ["unknown paper setup", { setup: "easy" as ExamConfig["setup"] }, "Choose a paper setup."],
    ["zero questions", { count: 0 }, "Number of questions must be between 1 and 200."],
    ["negative questions", { count: -5 }, "Number of questions must be between 1 and 200."],
    ["more than 200 questions", { count: 201 }, "Number of questions must be between 1 and 200."],
    ["count is not a number", { count: Number.NaN }, "Number of questions must be between 1 and 200."],
  ])("%s", async (_name, overrides, error) => {
    const { result, redirect } = await run(overrides);
    expect(result).toEqual({ error });
    expect(redirect).toBeNull();
    expect(createAttempt).not.toHaveBeenCalled();
  });
});

describe("startExamAction — valid input", () => {
  it("creates the attempt and redirects to the exam screen", async () => {
    const { redirect } = await run({});
    expect(createAttempt).toHaveBeenCalledWith(valid);
    expect(redirect).toBe("/exam/attempt-1");
  });

  it("drops duplicate and unknown unit numbers", async () => {
    await run({ units: [7, 7, 1, 42] });
    expect(createAttempt.mock.calls[0][0].units).toEqual([7, 1]);
  });

  it("rounds a fractional count down", async () => {
    await run({ count: 12.9 });
    expect(createAttempt.mock.calls[0][0].count).toBe(12);
  });

  it("accepts the 1 and 200 boundaries", async () => {
    expect((await run({ count: 1 })).redirect).toBe("/exam/attempt-1");
    expect((await run({ count: 200 })).redirect).toBe("/exam/attempt-1");
  });

  it("ignores topics in across-subjects mode", async () => {
    await run({ mode: "subject", topics: ["u07-t10"] });
    expect(createAttempt.mock.calls[0][0].topics).toEqual([]);
  });

  it("keeps several topics of the unit, without duplicates", async () => {
    await run({ mode: "topic", units: [7], topics: ["u07-t02", "u07-t05", "u07-t02"] });
    expect(createAttempt.mock.calls[0][0]).toMatchObject({ mode: "topic", units: [7], topics: ["u07-t02", "u07-t05"] });
  });

  it("rejects the request if any one of several topics is from another unit", async () => {
    const { result } = await run({ mode: "topic", units: [7], topics: ["u07-t02", "u03-t01"] });
    expect(result).toEqual({ error: "Unknown topic." });
  });

  it("treats every topic of the unit ticked as the whole unit", async () => {
    const all = Array.from({ length: 10 }, (_, i) => `u07-t${String(i + 1).padStart(2, "0")}`);
    await run({ mode: "topic", units: [7], topics: all });
    expect(createAttempt.mock.calls[0][0].topics).toEqual([]);
  });

  it("keeps a single topic in topic mode", async () => {
    await run({ mode: "topic", units: [7], topics: ["u07-t10"] });
    expect(createAttempt.mock.calls[0][0]).toMatchObject({ mode: "topic", units: [7], topics: ["u07-t10"] });
  });

  it("allows a whole-unit topic exam (no sub-topic)", async () => {
    await run({ mode: "topic", units: [3], topics: [] });
    expect(createAttempt.mock.calls[0][0]).toMatchObject({ mode: "topic", units: [3], topics: [] });
  });

  it.each([
    ["null", null, null],
    ["zero", 0, null],
    ["negative", -60, null],
    ["fractional", 300.7, 300],
  ])("time limit %s → %s", async (_name, timeLimitSec, expected) => {
    await run({ timeLimitSec });
    expect(createAttempt.mock.calls[0][0].timeLimitSec).toBe(expected);
  });

  it("returns the error instead of crashing when the exam cannot be created", async () => {
    createAttempt.mockRejectedValueOnce(new Error("No questions available for this selection."));
    const { result, redirect } = await run({});
    expect(result).toEqual({ error: "No questions available for this selection." });
    expect(redirect).toBeNull();
  });
});
