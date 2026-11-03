"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { reportPayment, requestProofUpload } from "./actions";

const BUCKET = "payment-proofs";

export function ReportForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [pending, startTransition] = useTransition();

  async function uploadProof(file: File) {
    const ticket = await requestProofUpload(token, file.type, file.size);
    if ("error" in ticket) return ticket;

    const { error } = await createClient()
      .storage.from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    return error ? { error: "העלאת הקובץ נכשלה. נסו שוב." } : { path: ticket.path };
  }

  function submit(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      const file = form.get("proof");
      let proofPath: string | null = null;
      if (file instanceof File && file.size > 0) {
        const upload = await uploadProof(file);
        if ("error" in upload) return setError(upload.error);
        proofPath = upload.path;
      }

      const result = await reportPayment(token, { method: String(form.get("method")), proofPath });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm opacity-70">איך שילמתם?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["TRANSFER", "CASH"] as const).map((method) => (
            <label
              key={method}
              className="flex items-center gap-2 rounded-lg border border-black/15 px-3 py-3 has-checked:border-blue-600 dark:border-white/20"
            >
              <input type="radio" name="method" value={method} defaultChecked={method === "TRANSFER"} />
              {PAYMENT_METHOD_LABEL[method]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1 text-sm">
        <span className="opacity-70">אסמכתה (רשות)</span>
        <input
          name="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFileName(e.target.files?.[0]?.name)}
          className="peer sr-only"
        />
        <span className="block truncate rounded-lg border border-black/15 px-3 py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600 dark:border-white/20">
          {fileName ?? "בחירת תמונה או PDF"}
        </span>
      </label>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "שולח..." : "שילמתי"}
      </button>
    </form>
  );
}
