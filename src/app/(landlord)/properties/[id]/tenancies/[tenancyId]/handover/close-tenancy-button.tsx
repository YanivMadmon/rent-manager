"use client";

import { useState, useTransition } from "react";
import { closeTenancy } from "./actions";

export function CloseTenancyButton({ tenancyId, approved }: { tenancyId: string; approved: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const question = approved
            ? "לסגור את השכירות ולהעביר אותה לארכיון?"
            : "השוכר עוד לא אישר את הפרוטוקול. לסגור את השכירות בכל זאת?";
          if (!confirm(question)) return;
          setError(undefined);
          startTransition(async () => {
            const result = await closeTenancy(tenancyId);
            if (result?.error) setError(result.error);
          });
        }}
        className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "סוגר..." : "סגירת השכירות"}
      </button>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
