"use client";

import { useState, useTransition } from "react";

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
      <div className="w-full space-y-2 rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">
        <p className="break-words">{prepared.message}</p>
        <a
          href={prepared.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800"
        >
          שליחה בוואטסאפ
        </a>
      </div>
    );
  }

  return (
    <>
      <button type="button" disabled={pending} className={className} onClick={run}>
        {pending ? "מכין..." : label}
      </button>
      {error && <p className="w-full text-sm text-red-700 dark:text-red-400">{error}</p>}
    </>
  );
}
