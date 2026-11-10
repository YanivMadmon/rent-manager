"use client";

import { useState, useTransition } from "react";
import type { UtilityType } from "@/generated/prisma/enums";
import type { UtilityState } from "@/lib/utilities";
import { setUtilityConfirmed, setUtilitySkipped } from "./actions";

const linkClass =
  "min-h-11 rounded-lg px-2 text-sm font-medium text-blue-700 hover:bg-sunken disabled:opacity-60 dark:text-blue-400";

export function UtilityActions({
  tenancyId,
  type,
  state,
}: {
  tenancyId: string;
  type: UtilityType;
  state: UtilityState;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {(state === "pending" || state === "uploaded") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setUtilityConfirmed(tenancyId, type, true))}
          className={linkClass}
        >
          {state === "uploaded" ? "אישור" : "סימון כהועבר"}
        </button>
      )}
      {state === "confirmed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setUtilityConfirmed(tenancyId, type, false))}
          className={linkClass}
        >
          ביטול האישור
        </button>
      )}
      {state === "skipped" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setUtilitySkipped(tenancyId, type, false))}
          className={linkClass}
        >
          החזרה לרשימה
        </button>
      ) : (
        state !== "confirmed" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setUtilitySkipped(tenancyId, type, true))}
            className={`${linkClass} !text-muted`}
          >
            לא רלוונטי
          </button>
        )
      )}
      {error && <p className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
