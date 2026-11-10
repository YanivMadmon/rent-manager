"use client";

import { useRef } from "react";
import { CloseIcon, ReceiptIcon } from "@/components/icons";

// Images open over the page; a PDF needs the browser's own viewer.
export function FileLink({ url, isPdf, label }: { url: string; isPdf: boolean; label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const className =
    "inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-400";

  if (isPdf) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        <ReceiptIcon className="h-4 w-4" />
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        <ReceiptIcon className="h-4 w-4" />
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-label={label}
        onClick={() => dialogRef.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-white backdrop:bg-black/90"
      >
        <div className="relative flex h-full w-full items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            aria-label="סגירה"
            className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl hover:bg-black/80"
          >
            <CloseIcon />
          </button>
        </div>
      </dialog>
    </>
  );
}
