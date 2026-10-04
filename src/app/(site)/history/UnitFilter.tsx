"use client";

import { useRouter } from "next/navigation";
import { SYLLABUS } from "@/lib/syllabus";

/** Applies as soon as a unit is picked — no separate Filter button. */
export function UnitFilter({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Filter by unit"
      value={value}
      onChange={(e) => router.push(e.target.value ? `/history?unit=${e.target.value}` : "/history")}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:w-auto"
    >
      <option value="">All units</option>
      {SYLLABUS.map((u) => (
        <option key={u.unit} value={u.unit}>
          {u.unit}. {u.name}
        </option>
      ))}
    </select>
  );
}
