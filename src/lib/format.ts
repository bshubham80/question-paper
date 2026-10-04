import { getTopic, getUnit } from "./syllabus";

// Vercel servers run in UTC; show everything in India time.
const TZ = "Asia/Kolkata";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Short human label for what an attempt covered. */
export function describeScope(a: { mode: string; units: number[]; topics: string[] }): string {
  if (a.mode === "topic") {
    const u = getUnit(a.units[0]);
    const name = u?.name ?? `Unit ${a.units[0]}`;
    if (a.topics.length === 1) return getTopic(a.topics[0])?.name ?? a.topics[0];
    if (a.topics.length > 1) return `${name} · ${a.topics.length} topics`;
    return `${name} (whole unit)`;
  }
  if (a.units.length === 10) return "All units";
  if (a.units.length === 1) return getUnit(a.units[0])?.name ?? `Unit ${a.units[0]}`;
  return `Units ${[...a.units].sort((x, y) => x - y).join(", ")}`;
}

export function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 100) : 0;
}
