"use client";

import { useTransition } from "react";
import { deleteFile } from "./actions";

export function DeleteFileButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="מחיקת קובץ"
      onClick={() => {
        if (!confirm("למחוק את הקובץ?")) return;
        startTransition(async () => {
          await deleteFile(documentId);
        });
      }}
      className="shrink-0 rounded-md px-2 text-sm opacity-60 hover:bg-black/5 hover:opacity-100 disabled:opacity-40 dark:hover:bg-white/10"
    >
      {pending ? "..." : "✕"}
    </button>
  );
}
