"use client";

import { useState, useTransition } from "react";
import { FileLink } from "@/components/file-link";
import { PreparedMessage } from "@/components/prepared-message";
import { buttonPrimary, buttonSecondary, fieldClass, PAYMENT_TONE, Pill } from "@/components/ui";
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
import { CheckIcon, PencilIcon, TrashIcon } from "@/components/icons";

const actionClass = buttonSecondary;

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

  // Only what is due today or earlier gets the strong button; future months stay quiet.
  const isDue = payment.dueDate.toISOString().slice(0, 10) <= today;
  const checkDue = check ? check.dueDate.toISOString().slice(0, 10) <= today : isDue;

  return (
    <li id={`payment-${id}`} className="scroll-mt-20 space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{formatMonth(payment.periodMonth)}</p>
          <p className="text-sm tabular-nums">
            <span className="font-semibold">{formatILS(payment.amountDue)}</span>
            <span className="text-muted"> עד {formatDate(payment.dueDate)}</span>
          </p>
        </div>
        <Pill tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Pill>
      </div>

      {(status === "LATE" || status === "PARTIAL" || check || (payment.method && payment.method !== "CHECK")) && (
        <div className="space-y-0.5 text-sm">
          {status === "LATE" && (
            <p className="font-medium text-red-700 dark:text-red-400">
              {payment.daysLate === 1 ? "איחור של יום אחד" : `איחור של ${payment.daysLate} ימים`}
            </p>
          )}
          {status === "PARTIAL" && (
            <p className="text-amber-800 tabular-nums dark:text-amber-300">
              שולמו {formatILS(payment.amountPaid)}, נותרו {formatILS(balance)}
            </p>
          )}
          {check && (
            <p className="text-muted tabular-nums">
              צ׳ק מס׳ {check.number}, {check.bank}, לתאריך {formatDate(check.dueDate)}
            </p>
          )}
          {payment.method && payment.method !== "CHECK" && (
            <p className="text-muted">שולם ב{PAYMENT_METHOD_LABEL[payment.method]}</p>
          )}
        </div>
      )}

      {reportedAt && (
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          השוכר דיווח ב־{formatDate(reportedAt)} ששילם
          {reportedMethod && ` (${PAYMENT_METHOD_LABEL[reportedMethod]})`}
        </p>
      )}
      {proof?.url && <FileLink url={proof.url} isPdf={proof.isPdf} label="צפייה באסמכתה" />}

      {editing === null && (
        <div className="flex flex-wrap gap-2">
          {canRecord && (
            <button
              type="button"
              className={reportedAt || isDue ? buttonPrimary : actionClass}
              onClick={() => setEditing("payment")}
            >
              <CheckIcon className="h-4 w-4" />
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
          {canRecord && !reportedAt && isDue && (
            <PreparedMessage prepare={() => createPaymentLink(id)} label={payment.noticeLabel} className={actionClass} />
          )}
          {status === "PENDING_DEPOSIT" && (
            <button
              type="button"
              disabled={pending}
              className={checkDue ? buttonPrimary : actionClass}
              onClick={() => run(() => depositCheck(id))}
            >
              <CheckIcon className="h-4 w-4" />
              סימון כהופקד
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
              <PencilIcon className="h-4 w-4 text-muted" />
              עריכת הצ׳ק
            </button>
          )}
          {(status === "PENDING_DEPOSIT" || status === "BOUNCED") && (
            <button
              type="button"
              disabled={pending}
              className={actionClass}
              onClick={() => confirm("להסיר את הצ׳ק מהחודש הזה?") && run(() => removeCheck(id))}
            >
              <TrashIcon className="h-4 w-4 text-muted" />
              הסרת הצ׳ק
            </button>
          )}
          {(status === "PAID" || status === "PARTIAL" || status === "DEPOSITED") && (
            <button
              type="button"
              disabled={pending}
              className={actionClass}
              onClick={() => confirm("לבטל את רישום התשלום?") && run(() => undoPayment(id))}
            >
              ביטול הרישום
            </button>
          )}
        </div>
      )}

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
          className="space-y-3 rounded-xl border border-line bg-canvas p-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="אמצעי תשלום">
              <select name="method" defaultValue={reportedMethod ?? "TRANSFER"} className={fieldClass}>
                <option value="TRANSFER">{PAYMENT_METHOD_LABEL.TRANSFER}</option>
                <option value="CASH">{PAYMENT_METHOD_LABEL.CASH}</option>
              </select>
            </Field>
            <Field label="סכום (₪)">
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                defaultValue={balance / 100}
                className={fieldClass}
              />
            </Field>
            <Field label="תאריך התשלום">
              <input
                name="paidAt"
                type="date"
                required
                defaultValue={reportedAt?.toISOString().slice(0, 10) ?? today}
                className={fieldClass}
              />
            </Field>
          </div>
          <FormButtons pending={pending} label="שמירת התשלום" onCancel={() => setEditing(null)} />
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
          className="space-y-3 rounded-xl border border-line bg-canvas p-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="בנק">
              <input name="bank" required defaultValue={check.bank} className={fieldClass} />
            </Field>
            <Field label="מספר הצ׳ק">
              <input name="number" required inputMode="numeric" defaultValue={check.number} className={fieldClass} />
            </Field>
            <Field label="תאריך הצ׳ק">
              <input
                name="dueDate"
                type="date"
                required
                defaultValue={check.dueDate.toISOString().slice(0, 10)}
                className={fieldClass}
              />
            </Field>
          </div>
          <FormButtons pending={pending} label="שמירת הצ׳ק" onCancel={() => setEditing(null)} />
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

function FormButtons({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={pending} className={`${buttonPrimary} flex-1`}>
        {pending ? "שומר..." : label}
      </button>
      <button type="button" onClick={onCancel} className={actionClass}>
        ביטול
      </button>
    </div>
  );
}
