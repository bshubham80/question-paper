"use client";

import { useTransition } from "react";
import { deleteAttemptAction } from "@/app/actions";

export function DeleteAttempt({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-secondary flex-1 text-bad sm:flex-none"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this exam from history? This cannot be undone.")) start(() => deleteAttemptAction(id));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
