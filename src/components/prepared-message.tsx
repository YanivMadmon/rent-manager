"use client";

import { useState, useTransition } from "react";
import { WhatsAppIcon } from "@/components/icons";

type Prepared = { whatsappUrl: string; message: string };

// The landlord sends messages from their own WhatsApp: nothing reaches the
// tenant until they press send, so the message is prepared first and shown here.
export function PreparedMessage({
  prepare,
  label,
  className,
}: {
  prepare: () => Promise<Prepared | { error: string }>;
  label: string;
  className: string;
}) {
  const [prepared, setPrepared] = useState<Prepared>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run() {
    setError(undefined);
    startTransition(async () => {
      const result = await prepare();
      if ("error" in result) setError(result.error);
      else setPrepared(result);
    });
  }

  if (prepared) {
    return (
      <div className="w-full space-y-3 rounded-xl border border-line bg-canvas p-3 text-sm">
        <p className="whitespace-pre-wrap break-words">{prepared.message}</p>
        <a
          href={prepared.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 font-medium text-white hover:bg-green-800"
        >
          <WhatsAppIcon />
          שליחה בוואטסאפ
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={`inline-flex items-center gap-2 ${className}`}
        onClick={run}
      >
        <WhatsAppIcon className="h-4 w-4" />
        {pending ? "מכין..." : label}
      </button>
      {error && <p className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>}
    </>
  );
}
