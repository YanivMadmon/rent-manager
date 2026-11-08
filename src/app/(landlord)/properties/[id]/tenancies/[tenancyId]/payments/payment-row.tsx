"use client";

import { useState, useTransition } from "react";
import { FileLink } from "@/components/file-link";
import { PreparedMessage } from "@/components/prepared-message";
import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import {
  formatDate,
  formatILS,
  formatMonth,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import {
  bounceCheck,
  createPaymentLink,
  depositCheck,
  dismissReport,
  recordPayment,
  removeCheck,
  undoPayment,
  updateCheck,
  type ActionResult,
} from "./actions";

const STATUS_STYLE: Record<PaymentStatus, string> = {
  EXPECTED: "bg-black/5 dark:bg-white/10",
  PENDING_DEPOSIT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  DEPOSITED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  LATE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  BOUNCED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";
const actionClass =
  "rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10";

type Row = {
  id: string;
  periodMonth: Date;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  daysLate: number;
  noticeLabel: string;
  reportedAt: Date | null;
  reportedMethod: PaymentMethod | null;
  proof: { url: string | null; isPdf: boolean } | null;
  check: { bank: string; number: string; dueDate: Date } | null;
};

export function PaymentRow({ payment, today }: { payment: Row; today: string }) {
  const [editing, setEditing] = useState<"payment" | "check" | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const { id, status, check, reportedAt, reportedMethod, proof } = payment;
  const balance = payment.amountDue - payment.amountPaid;
  const canRecord = status === "EXPECTED" || status === "LATE" || status === "PARTIAL" || status === "BOUNCED";

  function run(action: () => Promise<ActionResult>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else setEditing(null);
    });
  }

  return (
    <li className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-semibold">{formatMonth(payment.periodMonth)}</p>
          <p className="text-sm opacity-70">
            {formatILS(payment.amountDue)} · עד {formatDate(payment.dueDate)}
          </p>
          {status === "LATE" && (
            <p className="text-sm text-red-700 dark:text-red-400">{payment.daysLate === 1 ? "איחור של יום אחד" : `איחור של ${payment.daysLate} ימים`}</p>
          )}
          {status === "PARTIAL" && (
            <p className="text-sm opacity-70">
              שולם {formatILS(payment.amountPaid)}, נותרו {formatILS(balance)}
            </p>
          )}
          {check && (
            <p className="text-sm opacity-70">
              צ׳ק {check.number} · {check.bank} · {formatDate(check.dueDate)}
            </p>
          )}
          {payment.method && payment.method !== "CHECK" && (
            <p className="text-sm opacity-70">{PAYMENT_METHOD_LABEL[payment.method]}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {PAYMENT_STATUS_LABEL[status]}
        </span>
      </div>

      {reportedAt && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm dark:bg-blue-950/40">
          השוכר דיווח ב-{formatDate(reportedAt)} ששילם
          {reportedMethod && ` (${PAYMENT_METHOD_LABEL[reportedMethod]})`}
        </p>
      )}
      {proof?.url && <FileLink url={proof.url} isPdf={proof.isPdf} label="צפייה באסמכתה" />}

      <div className="flex flex-wrap gap-2">
        {canRecord && (
          <button type="button" className={actionClass} onClick={() => setEditing("payment")}>
            {reportedAt ? "אישור התשלום" : "רישום תשלום"}
          </button>
        )}
        {reportedAt && (
          <button
            type="button"
            disabled={pending}
            className={actionClass}
            onClick={() => confirm("לדחות את הדיווח של השוכר?") && run(() => dismissReport(id))}
          >
            דחיית הדיווח
          </button>
        )}
        {canRecord && !reportedAt && <PreparedMessage
            prepare={() => createPaymentLink(id)}
            label={payment.noticeLabel}
            className={actionClass}
          />}
        {status === "PENDING_DEPOSIT" && (
          <button type="button" disabled={pending} className={actionClass} onClick={() => run(() => depositCheck(id))}>
            הופקד
          </button>
        )}
        {status === "DEPOSITED" && (
          <button
            type="button"
            disabled={pending}
            className={actionClass}
            onClick={() => confirm("לסמן שהצ׳ק חזר?") && run(() => bounceCheck(id))}
          >
            הצ׳ק חזר
          </button>
        )}
        {check && (status === "PENDING_DEPOSIT" || status === "DEPOSITED") && (
          <button type="button" className={actionClass} onClick={() => setEditing("check")}>
            עריכת צ׳ק
          </button>
        )}
        {(status === "PENDING_DEPOSIT" || status === "BOUNCED") && (
          <button
            type="button"
            disabled={pending}
            className={actionClass}
            onClick={() => confirm("להסיר את הצ׳ק מהחודש הזה?") && run(() => removeCheck(id))}
          >
            הסרת צ׳ק
          </button>
        )}
        {(status === "PAID" || status === "PARTIAL" || status === "DEPOSITED") && (
          <button
            type="button"
            disabled={pending}
            className={actionClass}
            onClick={() => confirm("לבטל את רישום התשלום?") && run(() => undoPayment(id))}
          >
            ביטול
          </button>
        )}
      </div>

      {editing === "payment" && (
        <form
          action={(form) =>
            run(() =>
              recordPayment(id, {
                method: String(form.get("method")),
                amount: String(form.get("amount")),
                paidAt: String(form.get("paidAt")),
              }),
            )
          }
          className="grid gap-2 sm:grid-cols-4"
        >
          <select
            name="method"
            aria-label="אמצעי תשלום"
            defaultValue={reportedMethod ?? "TRANSFER"}
            className={fieldClass}
          >
            <option value="TRANSFER">{PAYMENT_METHOD_LABEL.TRANSFER}</option>
            <option value="CASH">{PAYMENT_METHOD_LABEL.CASH}</option>
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            aria-label="סכום"
            defaultValue={balance / 100}
            className={fieldClass}
          />
          <input
            name="paidAt"
            type="date"
            required
            aria-label="תאריך"
            defaultValue={reportedAt?.toISOString().slice(0, 10) ?? today}
            className={fieldClass}
          />
          <FormButtons pending={pending} onCancel={() => setEditing(null)} />
        </form>
      )}

      {editing === "check" && check && (
        <form
          action={(form) =>
            run(() =>
              updateCheck(id, {
                bank: String(form.get("bank")),
                number: String(form.get("number")),
                dueDate: String(form.get("dueDate")),
              }),
            )
          }
          className="grid gap-2 sm:grid-cols-4"
        >
          <input name="bank" required aria-label="בנק" defaultValue={check.bank} className={fieldClass} />
          <input
            name="number"
            required
            inputMode="numeric"
            aria-label="מספר צ׳ק"
            defaultValue={check.number}
            className={fieldClass}
          />
          <input
            name="dueDate"
            type="date"
            required
            aria-label="תאריך הצ׳ק"
            defaultValue={check.dueDate.toISOString().slice(0, 10)}
            className={fieldClass}
          />
          <FormButtons pending={pending} onCancel={() => setEditing(null)} />
        </form>
      )}

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </li>
  );
}

function FormButtons({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={pending}
        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        שמירה
      </button>
      <button type="button" onClick={onCancel} className={actionClass}>
        ביטול
      </button>
    </div>
  );
}
