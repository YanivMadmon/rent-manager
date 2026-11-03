"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reportIssue, requestIssuePhotoUpload } from "./issue-actions";

const BUCKET = "issue-photos";
const MAX_PHOTOS = 5;
const fieldClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function IssueForm({ token }: { token: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fileCount, setFileCount] = useState(0);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  async function uploadPhoto(file: File) {
    const ticket = await requestIssuePhotoUpload(token, file.type, file.size);
    if ("error" in ticket) return ticket;

    const { error } = await createClient()
      .storage.from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    return error ? { error: "העלאת התמונה נכשלה. נסו שוב." } : { path: ticket.path };
  }

  function submit(form: FormData) {
    setError(undefined);
    setSent(false);
    const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length > MAX_PHOTOS) return setError(`אפשר לצרף עד ${MAX_PHOTOS} תמונות`);

    startTransition(async () => {
      const photoPaths: string[] = [];
      for (const photo of photos) {
        const upload = await uploadPhoto(photo);
        if ("error" in upload) return setError(upload.error);
        photoPaths.push(upload.path);
      }

      const result = await reportIssue(token, {
        title: String(form.get("title")),
        description: String(form.get("description")),
        urgent: form.get("urgent") === "on",
        photoPaths,
      });
      if (result.error) return setError(result.error);

      formRef.current?.reset();
      setFileCount(0);
      setSent(true);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="opacity-70">מה התקלה?</span>
        <input name="title" required minLength={2} maxLength={120} className={fieldClass} />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="opacity-70">פרטים (רשות)</span>
        <textarea name="description" rows={3} maxLength={2000} className={fieldClass} />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="opacity-70">תמונות (רשות, עד {MAX_PHOTOS})</span>
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
          className="peer sr-only"
        />
        <span className="block rounded-lg border border-black/15 px-3 py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600 dark:border-white/20">
          {fileCount > 0 ? `נבחרו ${fileCount} תמונות` : "בחירת תמונות"}
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="urgent" />
        תקלה דחופה (למשל נזילה חמורה או חשמל)
      </label>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      {sent && <p className="text-sm text-green-700 dark:text-green-400">הדיווח נשלח לבעל הדירה.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "שולח..." : "שליחת דיווח"}
      </button>
    </form>
  );
}
