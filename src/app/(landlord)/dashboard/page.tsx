import { Suspense, type ReactNode } from "react";
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
import { formatDate, formatILS, ISSUE_STATUS_LABEL } from "@/lib/format";
import { daysLeft, deadlineLabel, issueDeadline } from "@/lib/issues";
import { UTILITY_LABEL } from "@/lib/utilities";
import { daysLate, NOTICE_LABEL, noticeStage, REMINDER_AFTER_DAYS, todayUtc } from "@/lib/payments";
import { formatPercent, leaseYear, leaseYearMonths, leaseYearProfit } from "@/lib/profit";
import { createPaymentLink } from "../properties/[id]/tenancies/[tenancyId]/payments/actions";
import { AddPropertyButton } from "../properties/add-property-button";
import { LeaseYearChart } from "./lease-year-chart";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<p className="text-muted">טוען...</p>}>
        <Dashboard />
      </Suspense>
      <AddPropertyButton />
    </div>
  );
}

type Todo = {
  key: string;
  rank: number; // lower comes first
  when: number;
  tone: Tone;
  href: string;
  title: string;
  lines: string[];
  amount?: number;
  pill?: ReactNode;
  action?: ReactNode;
};

async function Dashboard() {
  const user = await requireUser();
  const today = todayUtc();
  const now = new Date();
  // A day or two is normal; only chase a payment once the reminder is due.
  const chaseBefore = new Date(today.getTime() - (REMINDER_AFTER_DAYS - 1) * DAY_MS);
  const live = { status: { not: "CLOSED" as const }, property: { ownerId: user.id } };
  const withAddress = { select: { propertyId: true, property: { select: { address: true } } } };

  const [payments, issues, utilityProofs, properties] = await Promise.all([
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
      include: { tenancy: withAddress },
    }),
    prisma.utilityTransfer.findMany({
      where: { tenancy: live, proofPath: { not: null }, confirmedAt: null, skipped: false },
      include: { tenancy: withAddress },
    }),
    prisma.property.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        expenses: { select: { amount: true, frequency: true } },
        tenancies: {
          where: { status: { not: "CLOSED" } },
          orderBy: { startDate: "desc" },
          take: 1,
          include: {
            parties: { where: { role: "TENANT" }, select: { fullName: true }, orderBy: { id: "asc" } },
            payments: { select: { periodMonth: true, amountDue: true, amountPaid: true } },
            issues: { select: { status: true, urgent: true, reportedAt: true, repairCost: true } },
          },
        },
      },
    }),
  ]);

  // One list of everything that needs the landlord, most pressing first.
  const todos: Todo[] = [
    ...issues.map((issue): Todo => {
      const left = daysLeft(issueDeadline(issue), now);
      const pressing = issue.urgent || left < 0;
      return {
        key: `issue-${issue.id}`,
        rank: pressing ? 0 : 5,
        when: issue.reportedAt.getTime(),
        tone: pressing ? "bad" : "warn",
        href: `/properties/${issue.tenancy.propertyId}`,
        title: `תקלה: ${issue.title}`,
        lines: [`${issue.tenancy.property.address} – ${ISSUE_STATUS_LABEL[issue.status]}`, deadlineLabel(left)],
        pill: issue.urgent ? <Pill tone="bad">דחוף</Pill> : undefined,
      };
    }),
    ...payments.map((p): Todo => {
      const reported = Boolean(p.reportedAt);
      const stage = noticeStage(p, today);
      const tenants = p.tenancy.parties.map((t) => t.fullName).join(", ");
      return {
        key: `payment-${p.id}`,
        rank:
          !reported && (p.status === "BOUNCED" || stage === "FORMAL")
            ? 1
            : p.status === "PENDING_DEPOSIT" && !reported
              ? 3
              : 2,
        when: (p.check?.dueDate ?? p.dueDate).getTime(),
        tone: reported ? "info" : (ACTION_TONE[p.status] ?? "bad"),
        href: `/properties/${p.tenancy.propertyId}/tenancies/${p.tenancy.id}/payments`,
        title: reported
          ? "השוכר דיווח על תשלום"
          : (ACTION_LABEL[p.status] ?? `איחור של ${daysLate(p.dueDate, today)} ימים`),
        lines: [
          `${p.tenancy.property.address}${tenants ? ` – ${tenants}` : ""}`,
          `${p.check ? "תאריך הצ׳ק" : "מועד התשלום"}: ${formatDate(p.check?.dueDate ?? p.dueDate)}`,
        ],
        amount: p.amountDue - p.amountPaid,
        action:
          !reported && p.status !== "PENDING_DEPOSIT" ? (
            <PreparedMessage
              prepare={createPaymentLink.bind(null, p.id)}
              label={NOTICE_LABEL[stage]}
              className={buttonSecondary}
            />
          ) : undefined,
      };
    }),
    ...utilityProofs.map(
      (u): Todo => ({
        key: `utility-${u.id}`,
        rank: 4,
        when: (u.uploadedAt ?? now).getTime(),
        tone: "info",
        href: `/properties/${u.tenancy.propertyId}`,
        title: `השוכר העלה אישור: ${UTILITY_LABEL[u.type]}`,
        lines: [u.tenancy.property.address],
      }),
    ),
  ].sort((a, b) => a.rank - b.rank || a.when - b.when);

  return (
    <>
      <section aria-labelledby="todo-title" className="space-y-3">
        <SectionHeading id="todo-title">
          לטיפול
        </SectionHeading>
        {todos.length === 0 ? (
          <EmptyState>
            אין כרגע משהו לטפל בו. תשלומים באיחור, צ׳קים להפקדה, תקלות ודיווחים של שוכרים יופיעו כאן.
          </EmptyState>
        ) : (
          <Panel>
            <ul className="divide-y divide-line">
              {todos.map((t) => (
                <li key={t.key} className="space-y-3 p-4">
                  <Link href={t.href} className="-m-2 flex items-start gap-3 rounded-xl p-2 hover:bg-sunken">
                    <span aria-hidden="true" className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[t.tone]}`} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 break-words font-medium">{t.title}</p>
                        {t.amount !== undefined && (
                          <p className="shrink-0 font-semibold tabular-nums">{formatILS(t.amount)}</p>
                        )}
                        {t.pill}
                      </div>
                      {t.lines.map((line) => (
                        <p key={line} className="truncate text-sm text-muted">
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="mt-0.5">
                      <Chevron />
                    </span>
                  </Link>
                  {t.action && <div className="flex flex-wrap gap-2 ps-[1.375rem]">{t.action}</div>}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>

      <section aria-labelledby="properties-title" className="space-y-3">
        <SectionHeading id="properties-title">
          הנכסים שלי
        </SectionHeading>
        {properties.length === 0 ? (
          <EmptyState>עוד אין נכסים. אפשר להוסיף את הדירה הראשונה בכפתור ה־+ בפינה.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {properties.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} today={today} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type CardProperty = {
  id: string;
  address: string;
  city: string;
  purchasePrice: number | null;
  purchaseCosts: number | null;
  equity: number | null;
  mortgageMonthly: number | null;
  expenses: { amount: number; frequency: "MONTHLY" | "YEARLY" }[];
  tenancies: {
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    parties: { fullName: string }[];
    payments: { periodMonth: Date; amountDue: number; amountPaid: number }[];
    issues: { status: string; urgent: boolean; reportedAt: Date; repairCost: number | null }[];
  }[];
};

function PropertyCard({ property, today }: { property: CardProperty; today: Date }) {
  const tenancy = property.tenancies[0];
  const href = `/properties/${property.id}`;
  const cardClass = "block rounded-2xl border border-line bg-surface p-4 hover:bg-sunken";
  const title = (
    <p className="truncate font-semibold">
      {property.address}, {property.city}
    </p>
  );

  if (!tenancy) {
    return (
      <Link href={href} className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title}
            <p className="text-sm text-amber-700 dark:text-amber-400">אין שכירות פעילה</p>
          </div>
          <Chevron />
        </div>
      </Link>
    );
  }

  const openIssues = tenancy.issues.filter((i) => i.status !== "RESOLVED");
  // Repairs count in the lease year they were reported in.
  const year = leaseYear(tenancy, today);
  const yearEnd = new Date(year.end.getTime() + DAY_MS);
  const repairs = tenancy.issues
    .filter((i) => i.reportedAt >= year.start && i.reportedAt < yearEnd)
    .reduce((sum, i) => sum + (i.repairCost ?? 0), 0);
  const profit = leaseYearProfit(
    {
      tenancy,
      payments: tenancy.payments,
      expenses: property.expenses,
      repairs,
      mortgageMonthly: property.mortgageMonthly,
      purchasePrice: property.purchasePrice,
      purchaseCosts: property.purchaseCosts,
      equity: property.equity,
    },
    today,
  );
  const left = (x: { income: number; expenses: number; mortgage: number }) => x.income - x.expenses - x.mortgage;
  const months = leaseYearMonths(
    {
      tenancy,
      payments: tenancy.payments,
      expenses: property.expenses,
      mortgageMonthly: property.mortgageMonthly,
      repairs: tenancy.issues.flatMap((i) => (i.repairCost ? [{ reportedAt: i.reportedAt, cost: i.repairCost }] : [])),
    },
    today,
  );

  return (
    <Link href={href} className={`${cardClass} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          {title}
          <p className="truncate text-sm text-muted">
            {tenancy.parties.map((p) => p.fullName).join(", ") || "ללא שוכר"} · {formatILS(tenancy.monthlyRent)} לחודש
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {openIssues.length > 0 && (
            <Pill tone={openIssues.some((i) => i.urgent) ? "bad" : "warn"}>
              {openIssues.length === 1 ? "תקלה פתוחה" : `${openIssues.length} תקלות פתוחות`}
            </Pill>
          )}
          <Chevron />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted tabular-nums">
          <span>
            שנת השכירות: {formatDate(year.start)} – {formatDate(year.end)}
          </span>
          <span>
            חודש {year.elapsed} מתוך {year.months}
          </span>
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-ink/30" style={{ width: `${(year.elapsed / year.months) * 100}%` }} />
        </div>
      </div>

      <LeaseYearChart months={months} />

      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <td className="w-full" />
            <th scope="col" className="px-2 text-start font-normal whitespace-nowrap">
              עד היום
            </th>
            <th scope="col" className="ps-2 text-start font-normal whitespace-nowrap">
              צפוי לשנה
            </th>
          </tr>
        </thead>
        <tbody>
          <Row label="הכנסות" a={profit.soFar.income} b={profit.full.income} />
          <Row label="הוצאות" a={profit.soFar.expenses} b={profit.full.expenses} />
          {profit.hasMortgage && <Row label="החזרי משכנתא" a={profit.soFar.mortgage} b={profit.full.mortgage} />}
          <Row label={profit.hasMortgage ? "נשאר לך" : "רווח"} a={left(profit.soFar)} b={left(profit.full)} strong />
        </tbody>
      </table>

      {profit.yields ? (
        <dl className="grid grid-cols-3 gap-2">
          <Yield label="תשואה ברוטו" value={profit.yields.gross} />
          <Yield label="תשואה נטו" value={profit.yields.net} />
          {profit.yields.onEquity !== null && <Yield label="על ההון העצמי" value={profit.yields.onEquity} />}
        </dl>
      ) : (
        <p className="text-sm text-blue-700 dark:text-blue-400">כדי לראות תשואה, מוסיפים מחיר קנייה בדף הנכס</p>
      )}
    </Link>
  );
}

function Row({ label, a, b, strong }: { label: string; a: number; b: number; strong?: boolean }) {
  const tone = (n: number) =>
    strong ? (n < 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400") : "";
  return (
    <tr className={strong ? "font-semibold" : ""}>
      <th scope="row" className={`py-0.5 text-start whitespace-nowrap ${strong ? "" : "font-normal text-muted"}`}>
        {label}
      </th>
      <td className={`px-2 whitespace-nowrap ${tone(a)}`}>{formatILS(a)}</td>
      <td className={`ps-2 whitespace-nowrap ${tone(b)}`}>{formatILS(b)}</td>
    </tr>
  );
}

function Yield({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-sunken px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatPercent(value)}</dd>
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
