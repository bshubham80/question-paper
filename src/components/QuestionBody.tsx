import type { ExamQuestion } from "@/lib/types";

const LIST_I = ["A", "B", "C", "D", "E", "F"];

/** Stem, statements, List I / List II and prompt — layout from .claude/question-types.md. */
export function QuestionBody({ q, number }: { q: ExamQuestion; number: number }) {
  return (
    <div className="font-serif text-[16px] leading-relaxed sm:text-[17px]">
      <p className="font-semibold">
        <span className="mr-1.5">Q{number}.</span>
        {q.stem}
      </p>
      {q.reason && <p className="mt-2">{q.reason}</p>}
      {q.items && (
        <ol className="mt-2 list-decimal space-y-1 pl-7">
          {q.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      )}
      {q.listI && q.listII && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="bg-bg">
                <th className="border border-line px-3 py-1.5 text-left font-semibold">List I</th>
                <th className="border border-line px-3 py-1.5 text-left font-semibold">List II</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(q.listI.length, q.listII.length) }, (_, i) => (
                <tr key={i}>
                  <td className="border border-line px-3 py-1.5 align-top">
                    {q.listI![i] && `${LIST_I[i]}. ${q.listI![i]}`}
                  </td>
                  <td className="border border-line px-3 py-1.5 align-top">
                    {q.listII![i] && `${i + 1}. ${q.listII![i]}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.prompt && <p className="mt-2">{q.prompt}</p>}
    </div>
  );
}

export const LETTERS = ["a", "b", "c", "d"] as const;
