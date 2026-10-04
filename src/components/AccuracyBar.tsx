export function AccuracyBar({ label, right, total }: { label: string; right: number; total: number }) {
  const p = total ? Math.round((right / total) * 100) : 0;
  const color = !total ? "bg-line" : p >= 70 ? "bg-good" : p >= 50 ? "bg-warn" : "bg-bad";
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="min-w-0">{label}</span>
        <span className="shrink-0 tabular-nums text-muted">{total ? `${right}/${total} · ${p}%` : "not attempted"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${total ? Math.max(p, 2) : 0}%` }} />
      </div>
    </div>
  );
}
