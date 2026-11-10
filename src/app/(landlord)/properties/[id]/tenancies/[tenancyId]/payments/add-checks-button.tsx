"use client";

import { useRef, useState, useTransition } from "react";
import { buttonPrimary, fieldClass } from "@/components/ui";
import { addCheckSeries } from "./actions";
import { CloseIcon, PlusIcon } from "@/components/icons";

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
        className={buttonPrimary}
      >
        <PlusIcon className="h-4 w-4" />
        הוספת צ׳קים
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-checks-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
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
              className="-me-2 flex h-11 w-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="text-sm text-muted">
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
            className={`${buttonPrimary} w-full`}
          >
            {pending ? "שומר..." : "הוספת הצ׳קים"}
          </button>
        </form>
      </dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}
