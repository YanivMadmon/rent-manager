import { Suspense } from "react";
import Link from "next/link";
import { PreparedMessage } from "@/components/prepared-message";
import {
  buttonSecondary,
  Chevron,
  EmptyState,
  Panel,
  Pill,
  SectionHeading,
  TONE_DOT,
  type Tone,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatILS,
  formatMonth,
  ISSUE_STATUS_LABEL,
} from "@/lib/format";
import { daysLeft, deadlineLabel, issueDeadline } from "@/lib/issues";
import {
  daysLate,
  monthStart,
  NOTICE_LABEL,
  noticeStage,
  REMINDER_AFTER_DAYS,
  todayUtc,
} from "@/lib/payments";
import { createPaymentLink } from "../properties/[id]/tenancies/[tenancyId]/payments/actions";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted">טוען...</p>}>
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

  const [thisMonth, needingAction, openIssues] = await Promise.all([
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
    prisma.issue.findMany({
      where: { tenancy: live, status: { not: "RESOLVED" } },
      orderBy: [{ urgent: "desc" }, { reportedAt: "asc" }],
      include: {
        tenancy: { select: { propertyId: true, property: { select: { address: true } } } },
      },
    }),
  ]);

  const now = new Date();
  const expected = thisMonth.reduce((sum, p) => sum + p.amountDue, 0);
  const received = thisMonth.reduce((sum, p) => sum + p.amountPaid, 0);
  const share = expected > 0 ? Math.min(1, received / expected) : 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="month-title" className="space-y-4">
        <h1 id="month-title" className="text-2xl font-semibold">
          {formatMonth(month)}
        </h1>
        <Panel className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-sm text-muted">התקבל החודש</p>
            <p className="text-[2rem] leading-tight font-semibold tabular-nums">{formatILS(received)}</p>
            <p className="text-sm text-muted tabular-nums">מתוך {formatILS(expected)} צפוי</p>
          </div>
          <div
            role="progressbar"
            aria-label="חלק שהתקבל מהצפוי"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            className="h-2 overflow-hidden rounded-full bg-sunken"
          >
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${share * 100}%` }} />
          </div>
          <p className="text-sm tabular-nums">
            {expected - received > 0 ? (
              <>
                ממתין: <span className="font-medium">{formatILS(expected - received)}</span>
              </>
            ) : expected > 0 ? (
              "כל התשלומים של החודש התקבלו."
            ) : (
              "אין תשלומים צפויים החודש."
            )}
          </p>
        </Panel>
      </section>

      <section aria-labelledby="todo-title" className="space-y-3">
        <SectionHeading id="todo-title" count={needingAction.length}>
          לטיפול
        </SectionHeading>
        {needingAction.length === 0 ? (
          <EmptyState>אין כרגע משהו לטפל בו. תשלומים באיחור, צ׳קים להפקדה ודיווחים של שוכרים יופיעו כאן.</EmptyState>
        ) : (
          <Panel>
            <ul className="divide-y divide-line">
              {needingAction.map((p) => {
                const tone: Tone = p.reportedAt ? "info" : (ACTION_TONE[p.status] ?? "bad");
                return (
                  <li key={p.id} className="space-y-3 p-4">
                    <Link
                      href={`/properties/${p.tenancy.propertyId}/tenancies/${p.tenancy.id}/payments`}
                      className="-m-2 flex items-start gap-3 rounded-xl p-2 hover:bg-sunken"
                    >
                      <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-medium">
                            {p.reportedAt
                              ? "השוכר דיווח על תשלום"
                              : (ACTION_LABEL[p.status] ?? `איחור של ${daysLate(p.dueDate, today)} ימים`)}
                          </p>
                          <p className="shrink-0 font-semibold tabular-nums">{formatILS(p.amountDue - p.amountPaid)}</p>
                        </div>
                        <p className="truncate text-sm text-muted">
                          {p.tenancy.property.address}
                          {p.tenancy.parties.length > 0 && ` – ${p.tenancy.parties.map((t) => t.fullName).join(", ")}`}
                        </p>
                        <p className="text-sm text-muted tabular-nums">
                          {p.check ? "תאריך הצ׳ק" : "מועד התשלום"}: {formatDate(p.check?.dueDate ?? p.dueDate)}
                        </p>
                      </div>
                      <span className="mt-0.5">
                        <Chevron />
                      </span>
                    </Link>
                    {!p.reportedAt && p.status !== "PENDING_DEPOSIT" && (
                      <div className="flex flex-wrap gap-2 ps-[1.375rem]">
                        <PreparedMessage
                          prepare={createPaymentLink.bind(null, p.id)}
                          label={NOTICE_LABEL[noticeStage(p, today)]}
                          className={buttonSecondary}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </section>

      {openIssues.length > 0 && (
        <section aria-labelledby="issues-title" className="space-y-3">
          <SectionHeading id="issues-title" count={openIssues.length}>
            תקלות פתוחות
          </SectionHeading>
          <Panel>
            <ul className="divide-y divide-line">
              {openIssues.map((issue) => {
                const left = daysLeft(issueDeadline(issue), now);
                return (
                  <li key={issue.id}>
                    <Link
                      href={`/properties/${issue.tenancy.propertyId}`}
                      className="flex items-start gap-3 p-4 hover:bg-sunken"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[issue.urgent || left < 0 ? "bad" : "warn"]}`}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 break-words font-medium">{issue.title}</p>
                          {issue.urgent && <Pill tone="bad">דחוף</Pill>}
                        </div>
                        <p className="truncate text-sm text-muted">
                          {issue.tenancy.property.address} – {ISSUE_STATUS_LABEL[issue.status]}
                        </p>
                        <p className={`text-sm ${left < 0 ? "text-red-700 dark:text-red-400" : "text-muted"}`}>
                          {deadlineLabel(left)}
                        </p>
                      </div>
                      <span className="mt-0.5">
                        <Chevron />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}

const ACTION_TONE: Record<string, Tone> = {
  PENDING_DEPOSIT: "info",
  BOUNCED: "bad",
  PARTIAL: "warn",
};

const ACTION_LABEL: Record<string, string> = {
  PENDING_DEPOSIT: "צ׳ק להפקדה",
  BOUNCED: "צ׳ק שחזר",
  PARTIAL: "יתרה לתשלום",
};
