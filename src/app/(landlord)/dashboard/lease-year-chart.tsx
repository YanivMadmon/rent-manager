"use client";

import { useState } from "react";
import { formatILS } from "@/lib/format";
import type { MonthPoint } from "@/lib/profit";

const monthName = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", month: "short" });
const monthLong = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC", month: "long", year: "numeric" });

// Income against costs for each month of the lease year. Months still to come
// are drawn as outlines at their expected values. Colours are validated for
// both modes; the table on the card carries the same totals as text.
export function LeaseYearChart({ months }: { months: MonthPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expectedIncome, m.costs]));
  const height = (v: number) => `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%`;
  const point = active === null ? null : months[active];

  return (
    <figure className="lease-chart space-y-2" aria-label="הכנסות מול הוצאות לפי חודש בשנת השכירות">
      <div className="relative">
        <div className="flex h-24 items-end gap-1 border-b border-line" onMouseLeave={() => setActive(null)}>
          {months.map((m, i) => {
            const income = m.future ? m.expectedIncome : m.income;
            return (
              <div
                key={m.month.toISOString()}
                onMouseEnter={() => setActive(i)}
                className={`flex h-full flex-1 items-end justify-center gap-[2px] rounded-t-md ${active === i ? "bg-sunken" : ""}`}
              >
                <Bar value={income} future={m.future} kind="income" height={height} />
                <Bar value={m.costs} future={m.future} kind="costs" height={height} />
              </div>
            );
          })}
        </div>

        {point && (
          <div
            role="status"
            // Columns run right to left; keep the box clear of the card edges.
            style={{ left: `${Math.min(80, Math.max(20, 100 - ((active! + 0.5) / months.length) * 100))}%` }}
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-[0_4px_16px_rgb(0_0_0/0.08)]"
          >
            <p className="font-medium">
              {monthLong.format(point.month)}
              {point.future && <span className="text-muted"> · צפוי</span>}
            </p>
            <p className="flex items-center gap-1.5 tabular-nums">
              <Swatch kind="income" />
              הכנסות {formatILS(point.future ? point.expectedIncome : point.income)}
            </p>
            <p className="flex items-center gap-1.5 tabular-nums">
              <Swatch kind="costs" />
              הוצאות {formatILS(point.costs)}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[11px] text-muted" aria-hidden="true">
        {months.map((m, i) => (
          <span key={m.month.toISOString()} className="flex-1 text-center">
            {i % 2 === 0 || months.length <= 6 ? monthName.format(m.month) : ""}
          </span>
        ))}
      </div>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Swatch kind="income" />
          הכנסות
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch kind="costs" />
          הוצאות ומשכנתא
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-muted" />
          צפוי
        </span>
      </figcaption>
    </figure>
  );
}

function Swatch({ kind }: { kind: "income" | "costs" }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${kind === "income" ? "bg-[var(--series-income)]" : "bg-[var(--series-costs)]"}`}
    />
  );
}

// An empty month keeps its slot but draws nothing, so a zero never reads as a sliver.
function Bar({
  value,
  future,
  kind,
  height,
}: {
  value: number;
  future: boolean;
  kind: "income" | "costs";
  height: (v: number) => string;
}) {
  if (value <= 0) return <span className="w-[42%] max-w-3" />;
  const color = kind === "income" ? "var(--series-income)" : "var(--series-costs)";
  return (
    <span
      className={`w-[42%] max-w-3 rounded-t-[4px] ${future ? "border-2 border-b-0 border-dashed" : ""}`}
      style={{ height: height(value), ...(future ? { borderColor: color } : { backgroundColor: color }) }}
    />
  );
}
