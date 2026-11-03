import type { Payment, Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

// Keeps the day of month where possible: Jan 31 + 1 month → Feb 28.
export function addMonths(d: Date, months: number) {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay)));
}

// Whole rent periods in the contract. A one-day overhang (a contract written as
// 1.1–1.1 instead of 1.1–31.12) doesn't count; anything longer is another period.
function rentPeriodCount(startDate: Date, endDate: Date) {
  const stop = new Date(endDate.getTime() + DAY_MS);
  let periods = 0;
  while (addMonths(startDate, periods + 1) <= stop) periods++;
  const leftoverDays = (stop.getTime() - addMonths(startDate, periods).getTime()) / DAY_MS;
  return leftoverDays > 1 ? periods + 1 : periods;
}

type TenancyTerms = {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  paymentDay: number;
  imported: boolean;
  createdAt: Date;
};

// One payment per rent period. An imported tenancy is tracked from the month it
// was added: we can't know what happened before that, so nothing is shown as late.
export function buildPaymentSchedule(t: TenancyTerms) {
  const firstTracked = t.imported ? monthStart(t.createdAt) : null;
  const schedule: { periodMonth: Date; dueDate: Date; amountDue: number }[] = [];

  for (let i = 0; i < rentPeriodCount(t.startDate, t.endDate); i++) {
    const periodMonth = monthStart(addMonths(t.startDate, i));
    if (firstTracked && periodMonth < firstTracked) continue;
    const dueDate = new Date(periodMonth.getTime() + (t.paymentDay - 1) * DAY_MS);
    schedule.push({
      periodMonth,
      dueDate: i === 0 && dueDate < t.startDate ? t.startDate : dueDate,
      amountDue: t.monthlyRent,
    });
  }
  return schedule;
}

// Brings payments in line with the tenancy's terms. Anything the landlord has
// already recorded (a payment, a check) is left alone.
export async function syncPayments(tx: Prisma.TransactionClient, t: TenancyTerms) {
  const schedule = buildPaymentSchedule(t);
  const existing = await tx.payment.findMany({
    where: { tenancyId: t.id },
    include: { check: { select: { id: true } } },
  });
  const byMonth = new Map(existing.map((p) => [p.periodMonth.getTime(), p]));
  const isUntouched = (p: (typeof existing)[number]) =>
    p.status === "EXPECTED" && p.amountPaid === 0 && !p.check;

  const missing = schedule.filter((s) => !byMonth.has(s.periodMonth.getTime()));
  if (missing.length > 0) {
    await tx.payment.createMany({ data: missing.map((s) => ({ ...s, tenancyId: t.id })) });
  }

  for (const s of schedule) {
    const payment = byMonth.get(s.periodMonth.getTime());
    if (!payment || !isUntouched(payment)) continue;
    if (payment.amountDue === s.amountDue && payment.dueDate.getTime() === s.dueDate.getTime()) continue;
    await tx.payment.update({
      where: { id: payment.id },
      data: { amountDue: s.amountDue, dueDate: s.dueDate },
    });
  }

  const scheduled = new Set(schedule.map((s) => s.periodMonth.getTime()));
  const orphaned = existing.filter((p) => !scheduled.has(p.periodMonth.getTime()) && isUntouched(p));
  if (orphaned.length > 0) {
    await tx.payment.deleteMany({ where: { id: { in: orphaned.map((p) => p.id) } } });
  }
}

// "Late" follows from the date, so it's derived here rather than stored.
export function paymentStatus(p: Pick<Payment, "status" | "dueDate">, today: Date): PaymentStatus {
  return p.status === "EXPECTED" && p.dueDate < today ? "LATE" : p.status;
}

// Check series: consecutive numbers (keeping leading zeros) on monthly dates.
export function buildCheckSeries(firstNumber: string, firstDate: Date, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    number: String(BigInt(firstNumber) + BigInt(i)).padStart(firstNumber.length, "0"),
    dueDate: addMonths(firstDate, i),
  }));
}
