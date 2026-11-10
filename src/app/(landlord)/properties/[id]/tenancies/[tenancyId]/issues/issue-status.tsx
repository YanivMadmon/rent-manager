"use client";

import { useState, useTransition } from "react";
import type { IssueStatus as Status } from "@/generated/prisma/enums";
import { ISSUE_STATUS_LABEL } from "@/lib/format";
import { setIssueStatus } from "./actions";

export function IssueStatus({ issueId, status }: { issueId: string; status: Status }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <select
        aria-label="סטטוס התקלה"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setError(undefined);
          startTransition(async () => {
            const result = await setIssueStatus(issueId, next);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-lg border border-line-strong bg-transparent px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {(Object.keys(ISSUE_STATUS_LABEL) as Status[]).map((s) => (
          <option key={s} value={s}>
            {ISSUE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
