"use client";

import { useRef, useState, useTransition } from "react";
import { addCheckSeries } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

// Quick entry: a whole series of checks from the details of the first one.
export function AddChecksButton({ tenancyId, defaultDate }: { tenancyId: string; defaultDate: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    dialogRef.current?.close();
    setMessage(undefined);
  }

  function submit(form: FormData) {
    const input = Object.fromEntries([...form].map(([key, value]) => [key, String(value)]));
    setMessage(undefined);
    startTransition(async () => {
      const result = await addCheckSeries(tenancyId, input);
      if (result.error || result.notice) setMessage(result.error ?? result.notice);
      else close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        הוספת צ׳קים
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-checks-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        <form action={submit} className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="add-checks-title" className="text-lg font-semibold">
              הוספת צ׳קים
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="סגירה"
              className="rounded-md px-2 py-1 text-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <p className="text-sm opacity-70">
            מזינים את פרטי הצ׳ק הראשון, והמערכת משלימה את הסדרה לפי החודשים.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="כמה צ׳קים">
              <input name="count" type="number" min="1" max="60" required defaultValue="12" className={fieldClass} />
            </Field>
            <Field label="בנק">
              <input name="bank" required className={fieldClass} />
            </Field>
            <Field label="מספר הצ׳ק הראשון">
              <input name="firstNumber" required inputMode="numeric" pattern="\d{1,12}" className={fieldClass} />
            </Field>
            <Field label="תאריך הצ׳ק הראשון">
              <input name="firstDate" type="date" required defaultValue={defaultDate} className={fieldClass} />
            </Field>
            <Field label="סניף (רשות)">
              <input name="branch" inputMode="numeric" className={fieldClass} />
            </Field>
            <Field label="חשבון (רשות)">
              <input name="account" inputMode="numeric" className={fieldClass} />
            </Field>
          </div>

          {message && <p className="text-sm text-amber-800 dark:text-amber-300">{message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "שומר..." : "הוספה"}
          </button>
        </form>
      </dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="opacity-70">{label}</span>
      {children}
    </label>
  );
}
