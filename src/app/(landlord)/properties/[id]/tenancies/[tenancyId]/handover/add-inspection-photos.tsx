"use client";

import { useRef } from "react";
import { RoomPhotosForm } from "@/components/room-photos-form";
import { addInspectionPhotos, requestInspectionUpload } from "./actions";
import { CloseIcon } from "@/components/icons";

export function AddInspectionPhotos({ tenancyId, rooms }: { tenancyId: string; rooms: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm hover:bg-sunken"
      >
        צילום חדר
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="inspection-photos-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/50"
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
              className="-me-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <CloseIcon />
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
