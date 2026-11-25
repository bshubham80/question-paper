import { notFound, redirect } from "next/navigation";
import { getAttempt, isTimeUp, serverNow, submitAttempt } from "@/lib/attempts";
import { getQuestion, toExamQuestion } from "@/lib/bank";
import { describeScope } from "@/lib/format";
import { examSetupLabel } from "@/lib/setups";
import { ExamClient } from "./ExamClient";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attempt = await getAttempt(id);
  if (!attempt) notFound();
  if (attempt.submittedAt) redirect(`/results/${id}`);

  if (isTimeUp(attempt)) {
    // Time ran out while away: grade whatever was autosaved.
    await submitAttempt(id, attempt.progress);
    redirect(`/results/${id}`);
  }

  const questions = attempt.questionIds.map((qid) => toExamQuestion(getQuestion(qid)!));
  return (
    <ExamClient
      attemptId={id}
      title={describeScope(attempt)}
      subtitle={`${examSetupLabel(attempt.kind, attempt.setup)} · ${attempt.total} questions`}
      questions={questions}
      startedAt={attempt.startedAt}
      serverNow={serverNow()}
      timeLimitSec={attempt.timeLimitSec}
      initialProgress={attempt.progress}
    />
  );
}
