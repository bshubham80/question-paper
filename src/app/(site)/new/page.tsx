import { bankSummary } from "@/lib/bank";
import { NewExamForm } from "./NewExamForm";

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ unit?: string; topic?: string | string[] }> }) {
  const { unit, topic } = await searchParams;
  // ?unit=7&topic=u07-t02&topic=u07-t05 preselects several topics.
  const topics = topic === undefined ? undefined : Array.isArray(topic) ? topic : [topic];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">New exam</h1>
        <p className="text-sm text-muted">Pick what to practise, the paper setup and how many questions.</p>
      </div>
      <NewExamForm summary={bankSummary()} initialUnit={unit ? Number(unit) : undefined} initialTopics={topics} />
    </div>
  );
}
