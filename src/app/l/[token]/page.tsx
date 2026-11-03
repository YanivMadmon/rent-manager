import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { z } from "zod";
import { formatDate, formatILS, formatMonth } from "@/lib/format";
import { findLink } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { ReportForm } from "./report-form";

// Links carry a token: keep them out of search engines and referrer headers.
export const metadata: Metadata = {
  title: "עדכון תשלום",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TenantLinkPage({ params }: PageProps<"/l/[token]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-10">
      <Suspense fallback={<p className="opacity-60">טוען...</p>}>
        <TenantLink params={params} />
      </Suspense>
    </main>
  );
}

async function TenantLink({ params }: Pick<PageProps<"/l/[token]">, "params">) {
  await connection();
  const { token } = await params;

  const link = await findLink(token, "CONFIRM_PAYMENT");
  const target = z.object({ paymentId: z.string() }).safeParse(link?.target);
  const payment =
    link && target.success
      ? await prisma.payment.findFirst({
          where: { id: target.data.paymentId, tenancyId: link.tenancyId },
          include: { tenancy: { select: { property: { select: { address: true, city: true } } } } },
        })
      : null;

  if (!link || !payment) {
    return <Message title="הקישור לא תקף" body="אפשר לבקש קישור חדש מבעל הדירה." />;
  }
  if (link.usedAt) {
    return <Message title="תודה, העדכון התקבל" body="בעל הדירה יאשר את התשלום." />;
  }
  if (!["EXPECTED", "PARTIAL", "BOUNCED"].includes(payment.status)) {
    return <Message title="התשלום כבר נרשם" body="אין צורך לעשות שום דבר נוסף." />;
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

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="opacity-70">{body}</p>
    </div>
  );
}
