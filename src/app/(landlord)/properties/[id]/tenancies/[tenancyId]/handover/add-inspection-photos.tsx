"use client";

import { useRef } from "react";
import { RoomPhotosForm } from "@/components/room-photos-form";
import { addInspectionPhotos, requestInspectionUpload } from "./actions";

export function AddInspectionPhotos({ tenancyId, rooms }: { tenancyId: string; rooms: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
      >
        צילום חדר
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="inspection-photos-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="inspection-photos-title" className="text-lg font-semibold">
              צילום חדר
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
          <RoomPhotosForm
            requestUpload={(type, size) => requestInspectionUpload(tenancyId, type, size)}
            save={(input) => addInspectionPhotos(tenancyId, input)}
            rooms={rooms}
            submitLabel="שמירה"
            onDone={close}
          />
        </div>
      </dialog>
    </>
  );
}
