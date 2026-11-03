import { z } from "zod";
import type { MagicLink } from "@/generated/prisma/client";
import { formatDate, formatILS, formatMonth } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { LinkMessage } from "./link-message";
import { ReportForm } from "./report-form";

export async function PaymentReport({ link, token }: { link: MagicLink; token: string }) {
  const target = z.object({ paymentId: z.string() }).safeParse(link.target);
  const payment = target.success
    ? await prisma.payment.findFirst({
        where: { id: target.data.paymentId, tenancyId: link.tenancyId },
        include: { tenancy: { select: { property: { select: { address: true, city: true } } } } },
      })
    : null;

  if (!payment) return <LinkMessage title="הקישור לא תקף" body="אפשר לבקש קישור חדש מבעל הדירה." />;
  if (link.usedAt) return <LinkMessage title="תודה, העדכון התקבל" body="בעל הדירה יאשר את התשלום." />;
  if (!["EXPECTED", "PARTIAL", "BOUNCED"].includes(payment.status)) {
    return <LinkMessage title="התשלום כבר נרשם" body="אין צורך לעשות שום דבר נוסף." />;
  }

  const { address, city } = payment.tenancy.property;
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">עדכון תשלום</h1>
        <p className="opacity-70">
          {address}, {city}
        </p>
      </div>

      <dl className="space-y-2 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <Row label="חודש" value={formatMonth(payment.periodMonth)} />
        <Row label="סכום" value={formatILS(payment.amountDue - payment.amountPaid)} />
        <Row label="מועד תשלום" value={formatDate(payment.dueDate)} />
      </dl>

      <ReportForm token={token} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm opacity-70">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
