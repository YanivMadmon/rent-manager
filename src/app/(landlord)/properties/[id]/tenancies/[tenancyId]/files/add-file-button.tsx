"use client";

import { useRef, useState, useTransition } from "react";
import type { DocumentCategory } from "@/generated/prisma/enums";
import { DOCUMENT_CATEGORY_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { addFile, requestFileUpload } from "./actions";
import { CloseIcon, PaperclipIcon } from "@/components/icons";
import { buttonSecondary } from "@/components/ui";

const BUCKET = "tenancy-files";
const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const fieldClass =
  "w-full rounded-lg border border-line-strong bg-transparent px-3 py-2 text-sm";

const withoutExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, "");

export function AddFileButton({ tenancyId }: { tenancyId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    dialogRef.current?.close();
    formRef.current?.reset();
    setFileName(undefined);
    setName("");
    setError(undefined);
  }

  function submit(form: FormData) {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("יש לבחור קובץ");
    setError(undefined);

    startTransition(async () => {
      const ticket = await requestFileUpload(tenancyId, file.type, file.size);
      if ("error" in ticket) return setError(ticket.error);

      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) return setError("ההעלאה נכשלה. נסה שוב.");

      const result = await addFile(tenancyId, {
        category: String(form.get("category")),
        name,
        path: ticket.path,
        mimeType: file.type,
      });
      if (result.error) setError(result.error);
      else close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={buttonSecondary}
      >
        <PaperclipIcon className="h-4 w-4 text-muted" />
        העלאת קובץ
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="add-file-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <form ref={formRef} action={submit} className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="add-file-title" className="text-lg font-semibold">
              העלאת קובץ
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

          <label className="block space-y-1 text-sm">
            <span className="text-muted">קובץ (PDF, Word או תמונה)</span>
            <input
              name="file"
              type="file"
              accept={ACCEPT}
              onChange={(e) => {
                const picked = e.target.files?.[0]?.name;
                setFileName(picked);
                if (picked && !name) setName(withoutExtension(picked));
              }}
              className="peer sr-only"
            />
            <span className="block truncate rounded-lg border border-line-strong px-3 py-2 peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600">
              {fileName ?? "בחירת קובץ"}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted">סוג</span>
              <select name="category" className={fieldClass}>
                {(Object.keys(DOCUMENT_CATEGORY_LABEL) as DocumentCategory[]).map((category) => (
                  <option key={category} value={category}>
                    {DOCUMENT_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted">שם</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className={fieldClass}
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "מעלה..." : "העלאה"}
          </button>
        </form>
      </dialog>
    </>
  );
}
