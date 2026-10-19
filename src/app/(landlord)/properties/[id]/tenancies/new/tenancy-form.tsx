"use client";

import { useState, useTransition } from "react";
import {
  createTenancy,
  type TenancyFormInput,
  type TenancyFormState,
} from "./actions";

type Party = TenancyFormInput["parties"][number];

const emptyParty = (role: Party["role"]): Party => ({
  role,
  fullName: "",
  phone: "",
  idNumber: "",
  email: "",
});

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 aria-[invalid=true]:border-red-500 dark:border-white/20";

export function TenancyForm({ propertyId }: { propertyId: string }) {
  const [values, setValues] = useState<TenancyFormInput>({
    mode: "existing",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    paymentDay: "1",
    hasOption: false,
    optionMonths: "12",
    isIndexLinked: false,
    baseIndex: "",
    parties: [emptyParty("TENANT")],
  });
  const [state, setState] = useState<TenancyFormState>({});
  const [pending, startTransition] = useTransition();
  const err = (path: string) => state.errors?.[path];

  const set = <K extends keyof TenancyFormInput>(key: K, value: TenancyFormInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const setParty = (i: number, patch: Partial<Party>) =>
    setValues((v) => ({
      ...v,
      parties: v.parties.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const addParty = (role: Party["role"]) =>
    setValues((v) => ({ ...v, parties: [...v.parties, emptyParty(role)] }));

  const removeParty = (i: number) =>
    setValues((v) => ({ ...v, parties: v.parties.filter((_, j) => j !== i) }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // On success the action redirects; otherwise it returns the errors.
      setState(await createTenancy(propertyId, values));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {/* New contract vs. a tenancy that is already running */}
      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">סוג השכירות</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeOption
            checked={values.mode === "existing"}
            onChange={() => set("mode", "existing")}
            title="שכירות קיימת"
            description="החוזה כבר נחתם והשוכר גר בדירה. נתחיל לעקוב מעכשיו."
          />
          <ModeOption
            checked={values.mode === "new"}
            onChange={() => set("mode", "new")}
            title="שכירות חדשה"
            description="חוזה חדש שעוד צריך לחתום עליו. החתימה הדיגיטלית תגיע בהמשך."
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">שוכרים וערבים</legend>
        {err("parties") && <p className="text-sm text-red-600">{err("parties")}</p>}

        {values.parties.map((p, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.role === "TENANT" ? "שוכר" : "ערב"}</span>
              {values.parties.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParty(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  הסרה
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="שם מלא" error={err(`parties.${i}.fullName`)}>
                <input
                  className={inputClass}
                  value={p.fullName}
                  onChange={(e) => setParty(i, { fullName: e.target.value })}
                  aria-invalid={Boolean(err(`parties.${i}.fullName`))}
                />
              </Field>
              <Field label="טלפון נייד" error={err(`parties.${i}.phone`)}>
                <input
                  className={inputClass}
                  type="tel"
                  dir="ltr"
                  placeholder="050-1234567"
                  value={p.phone}
                  onChange={(e) => setParty(i, { phone: e.target.value })}
                  aria-invalid={Boolean(err(`parties.${i}.phone`))}
                />
              </Field>
              <Field label="ת״ז (לא חובה)" error={err(`parties.${i}.idNumber`)}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  dir="ltr"
                  value={p.idNumber}
                  onChange={(e) => setParty(i, { idNumber: e.target.value })}
                  aria-invalid={Boolean(err(`parties.${i}.idNumber`))}
                />
              </Field>
              <Field label="מייל (לא חובה)" error={err(`parties.${i}.email`)}>
                <input
                  className={inputClass}
                  type="email"
                  dir="ltr"
                  value={p.email}
                  onChange={(e) => setParty(i, { email: e.target.value })}
                  aria-invalid={Boolean(err(`parties.${i}.email`))}
                />
              </Field>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => addParty("TENANT")}
            className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            + שוכר נוסף
          </button>
          <button
            type="button"
            onClick={() => addParty("GUARANTOR")}
            className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            + ערב
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">תנאי השכירות</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="תאריך התחלה" error={err("startDate")}>
            <input
              type="date"
              className={inputClass}
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              aria-invalid={Boolean(err("startDate"))}
            />
          </Field>
          <Field label="תאריך סיום" error={err("endDate")}>
            <input
              type="date"
              className={inputClass}
              value={values.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              aria-invalid={Boolean(err("endDate"))}
            />
          </Field>
          <Field label="שכר דירה חודשי (₪)" error={err("monthlyRent")}>
            <input
              className={inputClass}
              inputMode="decimal"
              dir="ltr"
              placeholder="5000"
              value={values.monthlyRent}
              onChange={(e) => set("monthlyRent", e.target.value)}
              aria-invalid={Boolean(err("monthlyRent"))}
            />
          </Field>
          <Field label="יום תשלום בחודש" error={err("paymentDay")}>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={28}
              value={values.paymentDay}
              onChange={(e) => set("paymentDay", e.target.value)}
              aria-invalid={Boolean(err("paymentDay"))}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.hasOption}
              onChange={(e) => set("hasOption", e.target.checked)}
            />
            <span>יש אופציה להארכה</span>
          </label>
          {values.hasOption && (
            <Field label="אורך האופציה (חודשים)" error={err("optionMonths")}>
              <input
                className={`${inputClass} sm:w-48`}
                type="number"
                min={1}
                max={60}
                value={values.optionMonths}
                onChange={(e) => set("optionMonths", e.target.value)}
                aria-invalid={Boolean(err("optionMonths"))}
              />
            </Field>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.isIndexLinked}
              onChange={(e) => set("isIndexLinked", e.target.checked)}
            />
            <span>צמוד למדד המחירים לצרכן</span>
          </label>
          {values.isIndexLinked && (
            <Field label="מדד בסיס (לא חובה)" error={err("baseIndex")}>
              <input
                className={`${inputClass} sm:w-48`}
                inputMode="decimal"
                dir="ltr"
                value={values.baseIndex}
                onChange={(e) => set("baseIndex", e.target.value)}
                aria-invalid={Boolean(err("baseIndex"))}
              />
            </Field>
          )}
        </div>
      </fieldset>

      {state.formError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {state.formError}
        </p>
      )}
      {state.errors && !state.formError && (
        <p role="alert" className="text-sm text-red-600">
          יש שדות שצריך לתקן. הם מסומנים באדום.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "שומר..." : "שמירת השכירות"}
      </button>
    </form>
  );
}

function ModeOption({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`cursor-pointer space-y-1 rounded-xl border p-4 ${
        checked ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40" : "border-black/10 dark:border-white/15"
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        <input type="radio" name="mode" checked={checked} onChange={onChange} />
        {title}
      </span>
      <span className="block text-sm opacity-70">{description}</span>
    </label>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-600">{error}</span>}
    </label>
  );
}
