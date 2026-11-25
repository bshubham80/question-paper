import type { QType, Question, QuestionKind, Setup } from "./types";
import { SETUPS } from "./setups";

export interface ExamConfig {
  mode: "subject" | "topic";
  units: number[]; // subject mode: selected units; topic mode: exactly one
  topics: string[]; // topic mode: chosen sub-topic ids of that unit; empty = the whole unit
  kind: QuestionKind;
  setup: Setup;
  count: number;
  timeLimitSec: number | null;
}

/** Largest-remainder split of `total` in proportion to `weights`. */
function apportion<K extends string>(total: number, weights: Record<K, number>): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const sum = keys.reduce((s, k) => s + weights[k], 0) || 1;
  const raw = keys.map((k) => ({ k, v: (total * weights[k]) / sum }));
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)])) as Record<K, number>;
  let left = total - keys.reduce((s, k) => s + out[k], 0);
  for (const { k } of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left-- <= 0) break;
    out[k]++;
  }
  return out;
}

/** Even split across groups (leftovers to earlier groups, per SKILL.md §4), capped by each group's supply. */
function splitGroups(total: number, supply: Map<string, number>): Map<string, number> {
  const out = new Map([...supply.keys()].map((g) => [g, 0]));
  let left = total;
  while (left > 0) {
    const open = [...supply.keys()].filter((g) => out.get(g)! < supply.get(g)!);
    if (!open.length) break;
    const share = Math.max(1, Math.floor(left / open.length));
    for (const g of open) {
      if (left <= 0) break;
      const add = Math.min(share, supply.get(g)! - out.get(g)!, left);
      out.set(g, out.get(g)! + add);
      left -= add;
    }
  }
  return out;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function matchesKind(q: Question, kind: QuestionKind): boolean {
  return kind === "both" || (kind === "numerical") === !!q.numerical;
}

export function examPool(bank: Question[], config: Pick<ExamConfig, "mode" | "units" | "topics" | "kind">): Question[] {
  const topics = config.mode === "topic" && config.topics.length ? new Set(config.topics) : null;
  return bank.filter((q) => config.units.includes(q.unit) && (!topics || topics.has(q.topic)) && matchesKind(q, config.kind));
}

/**
 * Picks question ids following SKILL.md: type mix from the paper setup, even topic weightage,
 * unseen questions first, then a random final order.
 */
export function buildExam(
  bank: Question[],
  config: ExamConfig,
  seen: Set<string>,
  rng: () => number = Math.random,
): string[] {
  const pool = examPool(bank, config);
  const count = Math.min(config.count, pool.length);

  // Weight across units in subject mode, across sub-topics otherwise.
  const groupOf = (q: Question) => (config.mode === "subject" ? String(q.unit) : q.topic);
  const supply = new Map<string, number>();
  for (const q of pool) supply.set(groupOf(q), (supply.get(groupOf(q)) ?? 0) + 1);
  const needGroup = splitGroups(count, supply);
  const needType = apportion(count, SETUPS[config.setup].mix) as Record<QType, number>;

  const ordered = [...shuffle(pool.filter((q) => !seen.has(q.id)), rng), ...shuffle(pool.filter((q) => seen.has(q.id)), rng)];
  const picked: Question[] = [];
  const used = new Set<string>();
  const take = (q: Question) => {
    picked.push(q);
    used.add(q.id);
    needType[q.type]--;
    needGroup.set(groupOf(q), needGroup.get(groupOf(q))! - 1);
  };

  // Strict first, then relax: type mix gives way before topic weightage when the bank runs short.
  const passes: ((q: Question) => boolean)[] = [
    (q) => needType[q.type] > 0 && needGroup.get(groupOf(q))! > 0,
    (q) => needGroup.get(groupOf(q))! > 0,
    () => true,
  ];
  for (const ok of passes)
    for (const q of ordered) {
      if (picked.length >= count) break;
      if (!used.has(q.id) && ok(q)) take(q);
    }

  return shuffle(picked, rng).map((q) => q.id);
}
