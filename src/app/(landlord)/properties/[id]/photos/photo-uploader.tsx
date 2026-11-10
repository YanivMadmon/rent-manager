"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmPhotoUpload, requestPhotoUpload } from "./actions";
import { CameraIcon } from "@/components/icons";
import { buttonSecondary } from "@/components/ui";

const BUCKET = "property-photos";

export function PhotoUploader({ propertyId }: { propertyId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  async function uploadOne(file: File): Promise<string | null> {
    const ticket = await requestPhotoUpload(propertyId, file.type, file.size);
    if ("error" in ticket) return `${file.name}: ${ticket.error}`;

    const { error } = await createClient()
      .storage.from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) return `${file.name}: ההעלאה נכשלה`;

    const confirmed = await confirmPhotoUpload(propertyId, ticket.path);
    return confirmed.error ? `${file.name}: ${confirmed.error}` : null;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setErrors([]);
    setProgress({ done: 0, total: list.length });

    const failed: string[] = [];
    for (const file of list) {
      const err = await uploadOne(file);
      if (err) failed.push(err);
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setErrors(failed);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => router.refresh());
  }

  const busy = progress !== null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={buttonSecondary}
      >
        <CameraIcon className="h-4 w-4 text-muted" />
        {busy ? `מעלה ${progress.done + 1} מתוך ${progress.total}...` : "הוספת תמונות"}
      </button>
      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
