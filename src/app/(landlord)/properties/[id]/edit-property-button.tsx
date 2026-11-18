"use client";

import { useCallback, useRef } from "react";
import { CloseIcon, PencilIcon } from "@/components/icons";
import { updateProperty } from "../actions";
import { PropertyForm, type PropertyValues } from "../property-form";

export function EditPropertyButton({ propertyId, initial }: { propertyId: string; initial: PropertyValues }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => dialogRef.current?.close(), []);

  return (
    <>
      <button
        type="button"
        aria-label="עריכת הנכס"
        title="עריכת הנכס"
        onClick={() => dialogRef.current?.showModal()}
        className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
      >
        <PencilIcon />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="edit-property-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="edit-property-title" className="text-lg font-semibold">
              עריכת הנכס
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="סגירה"
              className="-me-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>
          <PropertyForm
            action={updateProperty.bind(null, propertyId)}
            initial={initial}
            submitLabel="שמירה"
            onDone={close}
          />
        </div>
      </dialog>
    </>
  );
}
