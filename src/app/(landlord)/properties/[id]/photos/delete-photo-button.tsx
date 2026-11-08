"use client";

import { useTransition } from "react";

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
      className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white transition focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-60"
    >
      {pending ? "..." : "✕"}
    </button>
  );
}
