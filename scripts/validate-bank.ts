// Validates src/data/questions/unit-XX.json files.
// Usage: node scripts/validate-bank.ts [unit-07.json ...]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SYLLABUS } from "../src/lib/syllabus.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../src/data/questions");
const AR_OPTIONS = [
  "Both A and R are true and R is the correct explanation of A",
  "Both A and R are true but R is not the correct explanation of A",
  "A is true but R is false",
  "A is false but R is true",
];
const TYPES = ["mcq", "ar", "statements", "matching", "sequencing"];
const LETTERS = ["a", "b", "c", "d"];

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => /^unit-\d{2}\.json$/.test(f)).sort();

let errors = 0;
const seen = new Set<string>();
const err = (id: string, msg: string) => {
  errors++;
  console.error(`  ✗ ${id}: ${msg}`);
};

for (const file of files) {
  const unitNo = Number(file.match(/unit-(\d{2})/)?.[1]);
  const unit = SYLLABUS.find((u) => u.unit === unitNo);
  console.log(`\n${file} — ${unit?.name ?? "UNKNOWN UNIT"}`);
  if (!unit) {
    errors++;
    continue;
  }
  let data: any[];
  try {
    data = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  } catch (e) {
    err(file, `invalid JSON: ${(e as Error).message}`);
    continue;
  }
  if (!Array.isArray(data)) {
    err(file, "top level must be an array");
    continue;
  }
  const topicIds = new Set(unit.topics.map((t) => t.id));
  const byType: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byAnswer: Record<string, number> = {};

  for (const q of data) {
    const id = q.id ?? "(no id)";
    const prefix = `u${String(unitNo).padStart(2, "0")}-`;
    if (typeof q.id !== "string" || !q.id.startsWith(prefix) || !/^u\d{2}-\d{3}$/.test(q.id))
      err(id, `id must look like ${prefix}001`);
    if (seen.has(id)) err(id, "duplicate id");
    seen.add(id);
    if (q.unit !== unitNo) err(id, `unit must be ${unitNo}`);
    if (!topicIds.has(q.topic)) err(id, `unknown topic "${q.topic}"`);
    if (!TYPES.includes(q.type)) err(id, `bad type "${q.type}"`);
    if (typeof q.stem !== "string" || q.stem.length < 10) err(id, "stem missing");
    if (/^Q\d+\./.test(q.stem ?? "")) err(id, "stem must not include the Q number");
    if (!Array.isArray(q.options) || q.options.length !== 4) err(id, "need exactly 4 options");
    else {
      if (q.options.some((o: unknown) => typeof o !== "string" || !o.trim())) err(id, "empty option");
      if (q.options.some((o: string) => /^[a-d]\)\s/.test(o))) err(id, 'options must not start with "a) "');
      if (new Set(q.options).size !== 4) err(id, "duplicate options");
    }
    if (!LETTERS.includes(q.answer)) err(id, `bad answer "${q.answer}"`);
    if (typeof q.explanation !== "string" || q.explanation.length < 20) err(id, "explanation missing/too short");

    if (q.type === "ar") {
      if (!q.stem?.startsWith("Assertion (A):")) err(id, 'AR stem must start "Assertion (A):"');
      if (!q.reason?.startsWith("Reason (R):")) err(id, 'AR needs reason starting "Reason (R):"');
      if (JSON.stringify(q.options) !== JSON.stringify(AR_OPTIONS)) err(id, "AR options must be the standard four");
    }
    if (q.type === "statements" || q.type === "sequencing") {
      if (!Array.isArray(q.items) || q.items.length < 3) err(id, "needs items[] with 3+ entries");
    }
    if (q.type === "matching") {
      if (!Array.isArray(q.listI) || q.listI.length < 3) err(id, "needs listI with 3+ entries");
      if (!Array.isArray(q.listII) || q.listII.length < q.listI?.length) err(id, "listII shorter than listI");
      if (q.listI?.some((s: string) => /^[A-D]\.\s/.test(s))) err(id, 'listI entries must not start with "A. "');
      if (q.listII?.some((s: string) => /^\d\.\s/.test(s))) err(id, 'listII entries must not start with "1. "');
    }
    if (q.type === "matching" || q.type === "sequencing") {
      const correct = q.options?.[LETTERS.indexOf(q.answer)];
      if (!q.code) err(id, "code required for matching/sequencing");
      else if (q.code !== correct) err(id, `code "${q.code}" != correct option "${correct}"`);
    }
    byType[q.type] = (byType[q.type] ?? 0) + 1;
    byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;
    byAnswer[q.answer] = (byAnswer[q.answer] ?? 0) + 1;
  }

  console.log(`  ${data.length} questions`);
  console.log(`  types:   ${TYPES.map((t) => `${t}=${byType[t] ?? 0}`).join("  ")}`);
  console.log(`  answers: ${LETTERS.map((l) => `${l}=${byAnswer[l] ?? 0}`).join("  ")}`);
  console.log(`  topics:  ${unit.topics.map((t) => `${t.id.slice(4)}=${byTopic[t.id] ?? 0}`).join("  ")}`);
  const empty = unit.topics.filter((t) => !byTopic[t.id]);
  if (empty.length) console.log(`  ⚠ topics with no questions: ${empty.map((t) => t.id).join(", ")}`);
}

console.log(errors ? `\n${errors} error(s)` : "\nAll good ✓");
process.exit(errors ? 1 : 0);
