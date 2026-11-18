import { addMonths, monthStart } from "@/lib/payments";

const DAY_MS = 24 * 60 * 60 * 1000;

type Tenancy = { startDate: Date; endDate: Date };

// The lease year we're in: it starts on the anniversary of the tenancy's start
// date and never runs past the end of the contract.
export function leaseYear(t: Tenancy, today: Date) {
  let start = t.startDate;
  while (addMonths(start, 12) <= today && addMonths(start, 12) <= t.endDate) start = addMonths(start, 12);
  const naturalEnd = new Date(addMonths(start, 12).getTime() - DAY_MS);
  const end = naturalEnd < t.endDate ? naturalEnd : t.endDate;

  const months = Math.max(1, monthsBetween(start, new Date(end.getTime() + DAY_MS)));
  // Which month of the lease year today falls in (1-based), counting today itself.
  const elapsed = today < start ? 0 : Math.min(months, monthsBetween(start, new Date(today.getTime() + DAY_MS)));
  return { start, end, months, elapsed };
}

// Whole calendar months from `a` to `b`, counting a partial month as one.
function monthsBetween(a: Date, b: Date) {
  let n = 0;
  while (addMonths(a, n + 1) <= b) n++;
  return addMonths(a, n) < b ? n + 1 : n;
}

export type Expense = { amount: number; frequency: "MONTHLY" | "YEARLY" };

type Inputs = {
  tenancy: Tenancy;
  // Rent rows of this tenancy: what was due and what came in, by month.
  payments: { periodMonth: Date; amountDue: number; amountPaid: number }[];
  expenses: Expense[];
  // Repairs of issues reported during the lease year.
  repairs: number;
  mortgageMonthly: number | null;
  purchasePrice: number | null;
  purchaseCosts: number | null;
  equity: number | null;
};

// Everything in agorot. "So far" is what actually happened; "year" adds what
// the schedule and the fixed costs say for the months still to come.
export function leaseYearProfit(input: Inputs, today: Date) {
  const year = leaseYear(input.tenancy, today);
  const from = monthStart(year.start).getTime();
  const to = year.end.getTime();
  const inYear = input.payments.filter((p) => p.periodMonth.getTime() >= from && p.periodMonth.getTime() <= to);

  const fixedFor = (months: number) =>
    input.expenses.reduce(
      (sum, e) => sum + (e.frequency === "MONTHLY" ? e.amount * months : Math.round((e.amount * months) / 12)),
      0,
    );
  const mortgageFor = (months: number) => (input.mortgageMonthly ?? 0) * months;

  const soFar = {
    income: inYear.reduce((sum, p) => sum + p.amountPaid, 0),
    expenses: fixedFor(year.elapsed) + input.repairs,
    mortgage: mortgageFor(year.elapsed),
  };
  const full = {
    income: inYear.reduce((sum, p) => sum + p.amountDue, 0),
    expenses: fixedFor(year.months) + input.repairs,
    mortgage: mortgageFor(year.months),
  };

  const investment = input.purchasePrice ? input.purchasePrice + (input.purchaseCosts ?? 0) : null;
  // Yields are yearly figures, so a contract shorter than a year is scaled up.
  const annual = (amount: number) => (amount * 12) / year.months;
  const net = full.income - full.expenses;
  const yields = investment
    ? {
        gross: annual(full.income) / investment,
        net: annual(net) / investment,
        onEquity: input.equity ? annual(net - full.mortgage) / input.equity : null,
      }
    : null;

  return { year, soFar, full, yields, hasMortgage: Boolean(input.mortgageMonthly) };
}

export type MonthPoint = {
  month: Date;
  income: number; // received
  expectedIncome: number; // due
  costs: number; // fixed costs, mortgage and that month's repairs
  future: boolean;
};

// Month by month through the lease year, for the chart on the home screen.
export function leaseYearMonths(
  input: Pick<Inputs, "tenancy" | "payments" | "expenses" | "mortgageMonthly"> & {
    repairs: { reportedAt: Date; cost: number }[];
  },
  today: Date,
): MonthPoint[] {
  const year = leaseYear(input.tenancy, today);
  const fixedPerMonth =
    input.expenses.reduce((sum, e) => sum + (e.frequency === "MONTHLY" ? e.amount : e.amount / 12), 0) +
    (input.mortgageMonthly ?? 0);

  return Array.from({ length: year.months }, (_, i) => {
    const month = monthStart(addMonths(year.start, i));
    const next = addMonths(month, 1);
    const inMonth = input.payments.filter((p) => p.periodMonth.getTime() === month.getTime());
    const repairs = input.repairs
      .filter((r) => r.reportedAt >= month && r.reportedAt < next)
      .reduce((sum, r) => sum + r.cost, 0);
    return {
      month,
      income: inMonth.reduce((sum, p) => sum + p.amountPaid, 0),
      expectedIncome: inMonth.reduce((sum, p) => sum + p.amountDue, 0),
      costs: Math.round(fixedPerMonth) + repairs,
      future: i >= year.elapsed,
    };
  });
}

export const formatPercent =(ratio: number) =>
  `${(ratio * 100).toLocaleString("he-IL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
