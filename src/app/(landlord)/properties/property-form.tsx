"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Furnishing, PropertyFeature, PropertyType } from "@/generated/prisma/enums";
import { buttonPrimary, fieldClass } from "@/components/ui";
import {
  FEATURE_LABEL,
  FURNISHING_LABEL,
  PROPERTY_TYPE_LABEL,
  type PropertyDetails,
} from "@/lib/property-details";
import type { PropertyFormState } from "./actions";

export type PropertyValues = PropertyDetails & { address: string; city: string; notes: string | null };

// Used to add a property and to edit one. Only the address and city are
// required; the details help when publishing the flat for rent.
export function PropertyForm({
  action,
  initial,
  submitLabel,
  onDone,
}: {
  action: (prev: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  initial?: PropertyValues;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<PropertyFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const hasDetails = Boolean(
    initial &&
      (initial.propertyType ||
        initial.rooms !== null ||
        initial.sizeSqm !== null ||
        initial.floor !== null ||
        initial.furnished ||
        initial.features.length > 0),
  );

  useEffect(() => {
    if (state.ok) {
      if (!initial) formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone, initial]);

  const errors = state.errors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="כתובת" error={errors.address}>
          <input name="address" required defaultValue={initial?.address} className={fieldClass} />
        </Field>
        <Field label="עיר" error={errors.city}>
          <input name="city" required defaultValue={initial?.city} className={fieldClass} />
        </Field>
      </div>

      <details open={hasDetails || Object.keys(errors).some((k) => k !== "address" && k !== "city")} className="group space-y-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
          <span className="transition-transform group-open:rotate-90" aria-hidden="true">
            ‹
          </span>
          פרטי הדירה (רשות)
        </summary>

        <div className="grid grid-cols-2 gap-4">
          <Field label="סוג הנכס" error={errors.propertyType}>
            <select name="propertyType" defaultValue={initial?.propertyType ?? ""} className={fieldClass}>
              <option value="">לא צוין</option>
              {(Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]).map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="חדרים" error={errors.rooms}>
            <input
              name="rooms"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="1"
              max="20"
              defaultValue={initial?.rooms ?? ""}
              className={fieldClass}
            />
          </Field>
          <Field label="גודל (מ״ר)" error={errors.sizeSqm}>
            <input
              name="sizeSqm"
              type="number"
              inputMode="numeric"
              min="5"
              max="2000"
              defaultValue={initial?.sizeSqm ?? ""}
              className={fieldClass}
            />
          </Field>
          <Field label="ריהוט" error={errors.furnished}>
            <select name="furnished" defaultValue={initial?.furnished ?? ""} className={fieldClass}>
              <option value="">לא צוין</option>
              {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((f) => (
                <option key={f} value={f}>
                  {FURNISHING_LABEL[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="קומה (0 לקרקע)" error={errors.floor}>
            <input
              name="floor"
              type="number"
              inputMode="numeric"
              min="-5"
              max="200"
              defaultValue={initial?.floor ?? ""}
              className={fieldClass}
            />
          </Field>
          <Field label="קומות בבניין" error={errors.totalFloors}>
            <input
              name="totalFloors"
              type="number"
              inputMode="numeric"
              min="0"
              max="200"
              defaultValue={initial?.totalFloors ?? ""}
              className={fieldClass}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-muted">מה יש בדירה</legend>
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {(Object.keys(FEATURE_LABEL) as PropertyFeature[]).map((feature) => (
              <label key={feature} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="features"
                  value={feature}
                  defaultChecked={initial?.features.includes(feature)}
                  className="h-4 w-4"
                />
                {FEATURE_LABEL[feature]}
              </label>
            ))}
          </div>
        </fieldset>
      </details>

      <Field label="הערות" error={errors.notes}>
        <textarea name="notes" rows={2} maxLength={1000} defaultValue={initial?.notes ?? ""} className={`${fieldClass} py-2`} />
      </Field>

      {state.formError && <p className="text-sm text-red-700 dark:text-red-400">{state.formError}</p>}

      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full sm:w-auto`}>
        {pending ? "שומר..." : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-red-700 dark:text-red-400">{error}</span>}
    </label>
  );
}
