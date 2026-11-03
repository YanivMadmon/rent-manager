import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatILS, formatMonth } from "@/lib/format";
import {
  daysLate,
  monthStart,
  NOTICE_LABEL,
  noticeStage,
  REMINDER_AFTER_DAYS,
  todayUtc,
} from "@/lib/payments";
import { PaymentLink } from "../properties/[id]/tenancies/[tenancyId]/payments/payment-link";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="opacity-60">טוען...</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const today = todayUtc();
  const month = monthStart(today);
  // A day or two is normal; only chase a payment once the reminder is due.
  const chaseBefore = new Date(today.getTime() - (REMINDER_AFTER_DAYS - 1) * 24 * 60 * 60 * 1000);
  const live = { status: { not: "CLOSED" as const }, property: { ownerId: user.id } };

  const [thisMonth, needingAction] = await Promise.all([
    prisma.payment.findMany({
      where: { periodMonth: month, tenancy: live },
      select: { amountDue: true, amountPaid: true },
    }),
    prisma.payment.findMany({
      where: {
        tenancy: live,
        OR: [
          { status: { in: ["EXPECTED", "PARTIAL"] }, dueDate: { lt: chaseBefore } },
          { status: "PENDING_DEPOSIT", check: { dueDate: { lte: today } } },
          { status: "BOUNCED" },
          { reportedAt: { not: null } },
        ],
      },
      orderBy: { dueDate: "asc" },
      include: {
        check: { select: { dueDate: true } },
        tenancy: {
          select: {
            id: true,
            propertyId: true,
            property: { select: { address: true } },
            parties: { where: { role: "TENANT" }, select: { fullName: true }, orderBy: { id: "asc" } },
          },
        },
      },
    }),
  ]);

  const expected = thisMonth.reduce((sum, p) => sum + p.amountDue, 0);
  const received = thisMonth.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{formatMonth(month)}</h1>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="צפוי" value={formatILS(expected)} />
        <Stat label="התקבל" value={formatILS(received)} />
        <Stat label="ממתין" value={formatILS(expected - received)} />
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">לטיפול</h2>
        {needingAction.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/20 p-6 text-center text-sm opacity-80 dark:border-white/20">
            אין כרגע משהו לטפל בו.
          </p>
        ) : (
          <ul className="space-y-2">
            {needingAction.map((p) => (
              <li key={p.id} className="space-y-3 rounded-xl border border-black/10 p-4 hover:border-blue-500 dark:border-white/15">
                <Link
                  href={`/properties/${p.tenancy.propertyId}/tenancies/${p.tenancy.id}/payments`}
                  className="block"
                >
                  <p className="font-semibold">
                    {p.reportedAt
                      ? "השוכר דיווח על תשלום"
                      : (ACTION_LABEL[p.status] ?? `איחור של ${daysLate(p.dueDate, today)} ימים`)}
                  </p>
                  <p className="text-sm opacity-70">
                    {p.tenancy.property.address} · {p.tenancy.parties.map((t) => t.fullName).join(", ")}
                  </p>
                  <p className="text-sm opacity-70">
                    {formatILS(p.amountDue - p.amountPaid)} · {formatDate(p.check?.dueDate ?? p.dueDate)}
                  </p>
                </Link>
                {!p.reportedAt && p.status !== "PENDING_DEPOSIT" && (
                  <div className="flex flex-wrap gap-2">
                    <PaymentLink
                      paymentId={p.id}
                      label={NOTICE_LABEL[noticeStage(p, today)]}
                      className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "צ׳ק להפקדה",
  BOUNCED: "צ׳ק שחזר",
  PARTIAL: "יתרה לתשלום",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 rounded-xl border border-black/10 p-3 dark:border-white/15">
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
