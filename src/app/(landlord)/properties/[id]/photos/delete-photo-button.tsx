"use client";

import { useTransition } from "react";
import { TrashIcon } from "@/components/icons";

export function DeletePhotoButton({
  photoId,
  onDelete,
}: {
  photoId: string;
  onDelete: (photoId: string) => Promise<unknown>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="מחיקת תמונה"
      onClick={() => {
        if (!confirm("למחוק את התמונה?")) return;
        startTransition(async () => {
          await onDelete(photoId);
        });
      }}
      title="מחיקת תמונה"
      className="absolute top-1 left-1 flex h-11 w-11 items-center justify-center rounded-full text-white transition focus:opacity-100 disabled:opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
        <TrashIcon className="h-4 w-4" />
      </span>
    </button>
  );
}
