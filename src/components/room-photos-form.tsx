"use client";

import { useRef, useState, useTransition } from "react";
import { ROOM_SUGGESTIONS } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "inspection-photos";
const MAX_PHOTOS_PER_UPLOAD = 20;
const fieldClass =
  "w-full rounded-lg border border-line-strong bg-transparent px-3 py-2 text-sm";

type Ticket = { path: string; token: string } | { error: string };

// Photos for one room: each file goes straight to storage with a signed URL,
// then `save` records the batch. Used by both the landlord and the tenant.
export function RoomPhotosForm({
  requestUpload,
  save,
  rooms,
  submitLabel,
  onDone,
}: {
  requestUpload: (contentType: string, size: number) => Promise<Ticket>;
  save: (input: { room: string; note: string; paths: string[] }) => Promise<{ error?: string }>;
  rooms: string[];
  submitLabel: string;
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fileCount, setFileCount] = useState(0);
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return setError("יש לבחור תמונות");
    if (files.length > MAX_PHOTOS_PER_UPLOAD) return setError(`אפשר להעלות עד ${MAX_PHOTOS_PER_UPLOAD} תמונות בכל פעם`);
    setError(undefined);

    startTransition(async () => {
      const paths: string[] = [];
      for (const [i, file] of files.entries()) {
        setProgress(`מעלה ${i + 1} מתוך ${files.length}`);
        const ticket = await requestUpload(file.type, file.size);
        if ("error" in ticket) {
          setProgress(undefined);
          return setError(ticket.error);
        }
        const { error: uploadError } = await createClient()
          .storage.from(BUCKET)
          .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (uploadError) {
          setProgress(undefined);
          return setError("העלאת התמונה נכשלה. נסו שוב.");
        }
        paths.push(ticket.path);
      }

      setProgress(undefined);
      const result = await save({
        room: String(form.get("room")),
        note: String(form.get("note")),
        paths,
      });
      if (result.error) return setError(result.error);
      formRef.current?.reset();
      setFileCount(0);
      onDone?.();
    });
  }

  const suggestions = [...new Set([...rooms, ...ROOM_SUGGESTIONS])];

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="text-muted">חדר</span>
        <input name="room" required maxLength={40} list="room-suggestions" className={fieldClass} />
        <datalist id="room-suggestions">
          {suggestions.map((room) => (
            <option key={room} value={room} />
          ))}
        </datalist>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted">תמונות</span>
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
          className="peer sr-only"
        />
        <span className="block rounded-lg border border-line-strong px-3 py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600">
          {fileCount > 0 ? `נבחרו ${fileCount} תמונות` : "צילום או בחירת תמונות"}
        </span>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted">הערה (רשות), למשל &quot;שריטה בדלת&quot;</span>
        <textarea name="note" rows={2} maxLength={500} className={fieldClass} />
      </label>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {progress ?? (pending ? "שומר..." : submitLabel)}
      </button>
    </form>
  );
}
