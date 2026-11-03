import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatILS } from "@/lib/format";
import { paymentStatus, todayUtc } from "@/lib/payments";
import { createAdminClient, PROOF_BUCKET } from "@/lib/supabase/admin";
import { AddChecksButton } from "./add-checks-button";
import { PaymentRow } from "./payment-row";

type Props = PageProps<"/properties/[id]/tenancies/[tenancyId]/payments">;

export default function PaymentsPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="opacity-60">טוען תשלומים...</p>}>
      <Payments params={params} />
    </Suspense>
  );
}

async function Payments({ params }: Pick<Props, "params">) {
  const { id, tenancyId } = await params;
  const user = await requireUser();

  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, propertyId: id, property: { ownerId: user.id } },
    include: {
      property: { select: { address: true, city: true } },
      payments: { orderBy: { periodMonth: "asc" }, include: { check: true } },
    },
  });
  if (!tenancy) notFound();

  const today = todayUtc();
  const { payments } = tenancy;

  // Receipts are private: show them through signed URLs valid for an hour.
  const proofPaths = payments.flatMap((p) => p.proofPath ?? []);
  const proofUrls = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data } = await createAdminClient()
      .storage.from(PROOF_BUCKET)
      .createSignedUrls(proofPaths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && proofUrls.set(d.path, d.signedUrl));
  }

  const received = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const expected = payments.reduce((sum, p) => sum + p.amountDue, 0);
  const lateCount = payments.filter((p) => paymentStatus(p, today) === "LATE").length;
  const pendingChecks = payments.filter((p) => p.status === "PENDING_DEPOSIT").length;

  return (
    <div className="space-y-6">
      <Link href={`/properties/${id}`} className="text-sm opacity-70 hover:underline">
        → {tenancy.property.address}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">תשלומים וצ׳קים</h1>
          <p className="text-sm opacity-70">
            {formatDate(tenancy.startDate)} – {formatDate(tenancy.endDate)} · {formatILS(tenancy.monthlyRent)} לחודש
          </p>
        </div>
        {tenancy.status !== "CLOSED" && payments.length > 0 && (
          <AddChecksButton
            tenancyId={tenancy.id}
            defaultDate={payments.find((p) => p.status === "EXPECTED")?.dueDate.toISOString().slice(0, 10) ?? ""}
          />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="התקבל" value={formatILS(received)} hint={`מתוך ${formatILS(expected)}`} />
        <Stat label="יתרה" value={formatILS(expected - received)} />
        <Stat label="צ׳קים להפקדה" value={String(pendingChecks)} />
        <Stat label="באיחור" value={String(lateCount)} warn={lateCount > 0} />
      </dl>

      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/20 p-6 text-center text-sm opacity-80 dark:border-white/20">
          אין תשלומים לשכירות הזו.
        </p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <PaymentRow
              key={p.id}
              today={today.toISOString().slice(0, 10)}
              payment={{
                id: p.id,
                periodMonth: p.periodMonth,
                dueDate: p.dueDate,
                amountDue: p.amountDue,
                amountPaid: p.amountPaid,
                method: p.method,
                status: paymentStatus(p, today),
                reportedAt: p.reportedAt,
                reportedMethod: p.reportedMethod,
                proof: p.proofPath
                  ? { url: proofUrls.get(p.proofPath) ?? null, isPdf: p.proofPath.endsWith(".pdf") }
                  : null,
                check: p.check && {
                  bank: p.check.bank,
                  number: p.check.number,
                  dueDate: p.check.dueDate,
                },
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="space-y-0.5 rounded-xl border border-black/10 p-3 dark:border-white/15">
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className={`text-lg font-semibold ${warn ? "text-red-700 dark:text-red-400" : ""}`}>{value}</dd>
      {hint && <dd className="text-xs opacity-60">{hint}</dd>}
    </div>
  );
}
