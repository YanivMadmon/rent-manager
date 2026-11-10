"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UtilityType } from "@/generated/prisma/enums";
import { createClient } from "@/lib/supabase/client";
import { requestUtilityUpload, saveUtilityProof } from "./utility-actions";

const BUCKET = "utility-proofs";

// Picking a file uploads it right away: one tap per bill.
export function UtilityUpload({
  token,
  type,
  replacing,
}: {
  token: string;
  type: UtilityType;
  replacing: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setError(undefined);
    startTransition(async () => {
      const ticket = await requestUtilityUpload(token, type, file.type, file.size);
      if ("error" in ticket) return setError(ticket.error);

      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) return setError("ההעלאה נכשלה. נסו שוב.");

      const result = await saveUtilityProof(token, type, ticket.path);
      if (result.error) return setError(result.error);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="min-h-11 w-full rounded-xl border border-line-strong px-4 text-sm font-medium hover:bg-sunken disabled:opacity-60"
      >
        {pending ? "מעלה..." : replacing ? "החלפת האישור" : "העלאת אישור"}
      </button>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
