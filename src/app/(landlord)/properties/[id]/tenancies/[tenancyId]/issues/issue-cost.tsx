"use client";

import { useState, useTransition } from "react";
import { PencilIcon } from "@/components/icons";
import { fieldClass } from "@/components/ui";
import { formatILS } from "@/lib/format";
import { setRepairCost } from "./actions";

// What the repair cost the landlord, edited in place.
export function IssueCost({ issueId, cost }: { issueId: string; cost: number | null }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await setRepairCost(issueId, String(form.get("amount")));
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex min-h-11 items-center gap-2 text-sm">
        <span className="text-muted">עלות התיקון:</span>
        {cost === null ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-11 rounded-lg px-2 font-medium text-blue-700 hover:bg-sunken dark:text-blue-400"
          >
            הוספת עלות
          </button>
        ) : (
          <>
            <span className="font-semibold tabular-nums">{formatILS(cost)}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="עריכת עלות התיקון"
              title="עריכת עלות התיקון"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <form action={save} className="space-y-1">
      <div className="flex items-end gap-2">
        <label className="block flex-1 space-y-1 text-sm">
          <span className="text-muted">עלות התיקון (₪)</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            autoFocus
            defaultValue={cost === null ? "" : cost / 100}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "שומר..." : "שמירה"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(undefined);
          }}
          className="min-h-11 rounded-xl px-3 text-sm text-muted hover:bg-sunken hover:text-ink"
        >
          ביטול
        </button>
      </div>
      <p className="text-xs text-muted">משאירים ריק כדי למחוק את העלות.</p>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </form>
  );
}
