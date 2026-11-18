"use client";

import { useRef, useState, useTransition } from "react";
import { PlusIcon } from "@/components/icons";
import { buttonSecondary, fieldClass } from "@/components/ui";
import { addExpense } from "./actions";

export function ExpenseForm({ propertyId }: { propertyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonSecondary}>
        <PlusIcon className="h-4 w-4" />
        הוספת הוצאה
      </button>
    );
  }

  function submit(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await addExpense(propertyId, {
        name: String(form.get("name")),
        amount: String(form.get("amount")),
        frequency: String(form.get("frequency")),
      });
      if (result.error) return setError(result.error);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-3 rounded-xl border border-line p-3">
      <label className="block space-y-1 text-sm">
        <span className="text-muted">שם ההוצאה</span>
        <input name="name" required maxLength={60} autoFocus list="expense-suggestions" className={fieldClass} />
        <datalist id="expense-suggestions">
          {["ועד בית", "ביטוח מבנה", "ביטוח תכולה", "דמי ניהול", "ארנונה", "תחזוקה שוטפת"].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-sm">
          <span className="text-muted">סכום (₪)</span>
          <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required className={fieldClass} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">תדירות</span>
          <select name="frequency" defaultValue="MONTHLY" className={fieldClass}>
            <option value="MONTHLY">לחודש</option>
            <option value="YEARLY">לשנה</option>
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "שומר..." : "הוספה"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(undefined);
          }}
          className="min-h-11 rounded-full px-4 text-sm text-muted hover:bg-sunken hover:text-ink"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
