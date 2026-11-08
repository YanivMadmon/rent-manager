"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoomPhotosForm } from "@/components/room-photos-form";
import {
  addTenantInspectionPhotos,
  approveInspection,
  requestTenantInspectionUpload,
} from "./inspection-actions";

export function InspectionForm({ token, rooms }: { token: string; rooms: string[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function approve(form: FormData) {
    if (!confirm("לאשר את הפרוטוקול? אחרי האישור אי אפשר להוסיף תמונות.")) return;
    setError(undefined);
    startTransition(async () => {
      const result = await approveInspection(token, String(form.get("note")));
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 border-t border-black/10 pt-6 dark:border-white/15">
      {adding ? (
        <section className="space-y-3">
          <h2 className="font-semibold">הוספת תמונות</h2>
          <RoomPhotosForm
            requestUpload={(type, size) => requestTenantInspectionUpload(token, type, size)}
            save={(input) => addTenantInspectionPhotos(token, input)}
            rooms={rooms}
            submitLabel="הוספה"
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-black/15 px-4 py-3 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          הוספת תמונות משלי
        </button>
      )}

      <form action={approve} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span className="opacity-70">הערות (רשות)</span>
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "שולח..." : "אישור הפרוטוקול"}
        </button>
      </form>
    </div>
  );
}
