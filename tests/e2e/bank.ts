// Question counts read straight from the bank, so tests keep passing as questions are added.
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Q = { unit: number; topic: string };

const DIR = join(process.cwd(), "src/data/questions");
const all: Q[] = Array.from({ length: 10 }, (_, i) =>
  JSON.parse(readFileSync(join(DIR, `unit-${String(i + 1).padStart(2, "0")}.json`), "utf8")),
).flat();

export const TOTAL = all.length;
export const unitCount = (u: number) => all.filter((q) => q.unit === u).length;
export const topicCount = (id: string) => all.filter((q) => q.topic === id).length;
