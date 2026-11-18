"use client";

import { useTransition } from "react";
import { TrashIcon } from "@/components/icons";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({ expenseId, name }: { expenseId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`מחיקת ${name}`}
      title={`מחיקת ${name}`}
      onClick={() => {
        if (!confirm(`למחוק את ההוצאה "${name}"?`)) return;
        startTransition(async () => {
          await deleteExpense(expenseId);
        });
      }}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-red-700 disabled:opacity-40 dark:hover:text-red-400"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
