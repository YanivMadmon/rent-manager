"use client";

import { useCallback, useRef } from "react";
import { PropertyForm } from "./property-form";
import { CloseIcon, PlusIcon } from "@/components/icons";

// Floating "+" button that opens the add-property form in a modal dialog.
export function AddPropertyButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => dialogRef.current?.close(), []);

  return (
    <>
      <button
        type="button"
        aria-label="הוספת נכס"
        title="הוספת נכס"
        onClick={() => dialogRef.current?.showModal()}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_4px_16px_rgb(0_0_0/0.07)] hover:bg-blue-700 md:bottom-8 md:left-8"
      >
        <PlusIcon className="h-7 w-7" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-property-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="add-property-title" className="text-lg font-semibold">
              הוספת נכס
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
          <PropertyForm onDone={close} />
        </div>
      </dialog>
    </>
  );
}
