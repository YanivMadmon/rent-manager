"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCheckSeries, monthStart } from "@/lib/payments";

export type ActionResult = { error?: string; notice?: string };

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "יש לבחור תאריך")
  .transform((s) => new Date(`${s}T00:00:00Z`));

const checkNumber = z.string().trim().regex(/^\d{1,12}$/, "מספר צ׳ק לא תקין");
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s : null));

const RecordPaymentSchema = z.object({
  method: z.enum(["TRANSFER", "CASH"]),
  amount: z.coerce.number({ message: "יש להזין סכום" }).positive("יש להזין סכום חיובי"),
  paidAt: isoDate,
});

const CheckSeriesSchema = z.object({
  bank: z.string().trim().min(2, "יש להזין בנק"),
  branch: optionalText,
  account: optionalText,
  firstNumber: checkNumber,
  firstDate: isoDate,
  count: z.coerce.number().int().min(1, "לפחות צ׳ק אחד").max(60, "עד 60 צ׳קים"),
});

const UpdateCheckSchema = z.object({
  bank: z.string().trim().min(2, "יש להזין בנק"),
  number: checkNumber,
  dueDate: isoDate,
});

async function ownedPayment(userId: string, paymentId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, tenancy: { property: { ownerId: userId } } },
    include: { check: true, tenancy: { select: { propertyId: true } } },
  });
}

function refresh(propertyId: string, tenancyId: string) {
  revalidatePath(`/properties/${propertyId}/tenancies/${tenancyId}/payments`);
  revalidatePath("/dashboard");
}

const NOT_FOUND = { error: "התשלום לא נמצא" };

// Bank transfer or cash. Partial amounts add up until the month is covered.
export async function recordPayment(
  paymentId: string,
  input: { method: string; amount: string; paidAt: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment) return NOT_FOUND;
  if (!["EXPECTED", "PARTIAL", "BOUNCED"].includes(payment.status)) {
    return { error: "כבר נרשם תשלום לחודש הזה" };
  }

  const parsed = RecordPaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { method, amount, paidAt } = parsed.data;

  const amountPaid = payment.amountPaid + Math.round(amount * 100);
  if (amountPaid > payment.amountDue) return { error: "הסכום גבוה מהיתרה לתשלום" };

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { method, amountPaid, paidAt, status: amountPaid === payment.amountDue ? "PAID" : "PARTIAL" },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: payment.tenancyId,
        type: "payment.paid",
        actor: "landlord",
        data: { paymentId: payment.id, method, amount: amountPaid - payment.amountPaid },
      },
    }),
  ]);

  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}

// Quick entry: the series is matched to payments by month. Months that are
// already covered are skipped and reported, not overwritten.
export async function addCheckSeries(
  tenancyId: string,
  input: Record<string, string>,
): Promise<ActionResult> {
  const user = await requireUser();
  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: user.id } },
    select: { propertyId: true, status: true },
  });
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { error: "השכירות הסתיימה" };

  const parsed = CheckSeriesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { firstNumber, firstDate, count, ...bankDetails } = parsed.data;

  const series = buildCheckSeries(firstNumber, firstDate, count);
  const payments = await prisma.payment.findMany({
    where: { tenancyId, periodMonth: { in: series.map((c) => monthStart(c.dueDate)) } },
    include: { check: { select: { id: true } } },
  });
  const openByMonth = new Map(
    payments
      .filter((p) => p.status === "EXPECTED" && !p.check)
      .map((p) => [p.periodMonth.getTime(), p.id]),
  );

  const matched = series.flatMap((check) => {
    const paymentId = openByMonth.get(monthStart(check.dueDate).getTime());
    return paymentId ? [{ ...check, paymentId }] : [];
  });
  if (matched.length === 0) return { error: "אין חודשים פתוחים בתאריכים של הצ׳קים" };

  await prisma.$transaction(
    async (tx) => {
      await tx.check.createMany({ data: matched.map((c) => ({ ...c, ...bankDetails })) });
      await tx.payment.updateMany({
        where: { id: { in: matched.map((c) => c.paymentId) } },
        data: { method: "CHECK", status: "PENDING_DEPOSIT" },
      });
      await tx.timelineEvent.create({
        data: { tenancyId, type: "checks.added", actor: "landlord", data: { count: matched.length } },
      });
    },
    { timeout: 20_000 },
  );

  refresh(tenancy.propertyId, tenancyId);
  const skipped = count - matched.length;
  return skipped > 0
    ? { notice: `נוספו ${matched.length} צ׳קים. ${skipped} דולגו כי אין להם חודש פתוח.` }
    : {};
}

export async function updateCheck(
  paymentId: string,
  input: { bank: string; number: string; dueDate: string },
): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment?.check) return NOT_FOUND;

  const parsed = UpdateCheckSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.check.update({ where: { id: payment.check.id }, data: parsed.data });
  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}

export async function depositCheck(paymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment?.check || payment.status !== "PENDING_DEPOSIT") return NOT_FOUND;

  const now = new Date();
  await prisma.$transaction([
    prisma.check.update({ where: { id: payment.check.id }, data: { depositedAt: now } }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "DEPOSITED", amountPaid: payment.amountDue, paidAt: now },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: payment.tenancyId,
        type: "check.deposited",
        actor: "landlord",
        data: { paymentId: payment.id, number: payment.check.number },
      },
    }),
  ]);

  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}

export async function bounceCheck(paymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment?.check || payment.status !== "DEPOSITED") return NOT_FOUND;

  await prisma.$transaction([
    prisma.check.update({ where: { id: payment.check.id }, data: { bouncedAt: new Date() } }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "BOUNCED", amountPaid: 0, paidAt: null },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: payment.tenancyId,
        type: "check.bounced",
        actor: "landlord",
        data: { paymentId: payment.id, number: payment.check.number },
      },
    }),
  ]);

  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}

// Frees the month so a replacement check or another payment can be recorded.
export async function removeCheck(paymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment?.check || !["PENDING_DEPOSIT", "BOUNCED"].includes(payment.status)) return NOT_FOUND;

  await prisma.$transaction([
    prisma.check.delete({ where: { id: payment.check.id } }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "EXPECTED", method: null },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: payment.tenancyId,
        type: "check.removed",
        actor: "landlord",
        data: { paymentId: payment.id, number: payment.check.number },
      },
    }),
  ]);

  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}

// Undoes a mistaken entry. A check goes back to waiting for deposit; anything
// else returns to the state it was in before the money was recorded.
export async function undoPayment(paymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await ownedPayment(user.id, paymentId);
  if (!payment) return NOT_FOUND;

  const { check } = payment;
  const backToDeposit = payment.method === "CHECK" && check;
  const status = backToDeposit ? "PENDING_DEPOSIT" : check?.bouncedAt ? "BOUNCED" : "EXPECTED";

  await prisma.$transaction([
    ...(backToDeposit
      ? [prisma.check.update({ where: { id: check.id }, data: { depositedAt: null, bouncedAt: null } })]
      : []),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status, amountPaid: 0, paidAt: null, method: check ? "CHECK" : null },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: payment.tenancyId,
        type: "payment.undone",
        actor: "landlord",
        data: { paymentId: payment.id },
      },
    }),
  ]);

  refresh(payment.tenancy.propertyId, payment.tenancyId);
  return {};
}
