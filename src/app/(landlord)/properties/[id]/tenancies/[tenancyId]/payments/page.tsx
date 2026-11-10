import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackLink, EmptyState, PAYMENT_TONE, Panel } from "@/components/ui";
import { formatDate, formatILS, formatMonth, PAYMENT_STATUS_LABEL } from "@/lib/format";
import { daysLate, monthStart, NOTICE_LABEL, noticeStage, paymentStatus, todayUtc } from "@/lib/payments";
import { createAdminClient, PROOF_BUCKET } from "@/lib/supabase/admin";
import { AddChecksButton } from "./add-checks-button";
import { MonthStrip } from "./month-strip";
import { PaymentRow } from "./payment-row";

type Props = PageProps<"/properties/[id]/tenancies/[tenancyId]/payments">;

export default function PaymentsPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-muted">טוען תשלומים...</p>}>
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
  const share = expected > 0 ? Math.min(1, received / expected) : 0;
  const statuses = payments.map((p) => paymentStatus(p, today));
  const lateCount = statuses.filter((s) => s === "LATE").length;
  const pendingChecks = payments.filter((p) => p.status === "PENDING_DEPOSIT").length;
  const thisMonth = monthStart(today).getTime();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <BackLink href={`/properties/${id}`}>{tenancy.property.address}</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">תשלומים וצ׳קים</h1>
            <p className="text-sm text-muted tabular-nums">
              {formatDate(tenancy.startDate)} – {formatDate(tenancy.endDate)}, {formatILS(tenancy.monthlyRent)} לחודש
            </p>
          </div>
          {tenancy.status !== "CLOSED" && payments.length > 0 && (
            <AddChecksButton
              tenancyId={tenancy.id}
              defaultDate={payments.find((p) => p.status === "EXPECTED")?.dueDate.toISOString().slice(0, 10) ?? ""}
            />
          )}
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState>אין תשלומים לשכירות הזו. תשלומים נוצרים לפי תאריכי החוזה ושכר הדירה.</EmptyState>
      ) : (
        <>
          <Panel className="space-y-5 p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="tabular-nums">
                  <span className="text-2xl font-semibold">{formatILS(received)}</span>
                  <span className="text-sm text-muted"> התקבלו מתוך {formatILS(expected)}</span>
                </p>
              </div>
              <div
                role="progressbar"
                aria-label="חלק שהתקבל מסך החוזה"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
                className="h-2 overflow-hidden rounded-full bg-sunken"
              >
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${share * 100}%` }} />
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted">יתרה</dt>
                  <dd className="font-medium tabular-nums">{formatILS(expected - received)}</dd>
                </div>
                <div>
                  <dt className="text-muted">צ׳קים להפקדה</dt>
                  <dd className="font-medium tabular-nums">{pendingChecks}</dd>
                </div>
                <div>
                  <dt className="text-muted">באיחור</dt>
                  <dd className={`font-medium tabular-nums ${lateCount > 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                    {lateCount}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-line pt-4">
              <MonthStrip
                months={payments.map((p, i) => ({
                  id: p.id,
                  month: shortMonth.format(p.periodMonth),
                  year: String(p.periodMonth.getUTCFullYear()).slice(2),
                  label: `${formatMonth(p.periodMonth)}: ${PAYMENT_STATUS_LABEL[statuses[i]]}`,
                  tone: PAYMENT_TONE[statuses[i]],
                  current: p.periodMonth.getTime() === thisMonth,
                }))}
              />
            </div>
          </Panel>

          <Panel>
            <ul className="divide-y divide-line">
              {payments.map((p, i) => (
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
                    status: statuses[i],
                    daysLate: daysLate(p.dueDate, today),
                    noticeLabel: NOTICE_LABEL[noticeStage(p, today)],
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
          </Panel>
        </>
      )}
    </div>
  );
}

const shortMonth = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", month: "short" });
