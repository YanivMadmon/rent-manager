"use client";

import { useTransition } from "react";
import { deleteFile } from "./actions";
import { TrashIcon } from "@/components/icons";

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
      title="מחיקת קובץ"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-red-700 disabled:opacity-40 dark:hover:text-red-400"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
