"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProperty, type PropertyFormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function PropertyForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState<PropertyFormState, FormData>(
    createProperty,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="כתובת" name="address" error={state.errors?.address} required />
      <Field label="עיר" name="city" error={state.errors?.city} required />
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm font-medium">הערות</span>
        <textarea name="notes" rows={2} className={inputClass} />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "שומר..." : "הוספת נכס"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  required,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        className={inputClass}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}
