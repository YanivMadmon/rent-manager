"use client";

import { useCallback, useRef } from "react";
import { PropertyForm } from "./property-form";

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
        className="fixed bottom-6 left-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-3xl leading-none text-white shadow-lg hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        +
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-property-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-background p-0 text-foreground backdrop:bg-black/50"
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
              className="rounded-md px-2 py-1 text-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <PropertyForm onDone={close} />
        </div>
      </dialog>
    </>
  );
}
