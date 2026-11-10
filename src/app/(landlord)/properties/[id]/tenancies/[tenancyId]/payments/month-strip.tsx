"use client";

import { useEffect, useRef } from "react";
import type { Tone } from "@/components/ui";

export type StripMonth = {
  id: string;
  month: string; // short month name, e.g. "נוב׳"
  year: string; // two digits
  label: string; // full text for screen readers
  tone: Tone;
  current: boolean;
};

const CELL: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  info: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  good: "bg-green-700 text-white dark:bg-green-800",
  warn: "bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50",
  bad: "bg-red-700 text-white dark:bg-red-800",
};

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "good", label: "שולם" },
  { tone: "info", label: "צ׳ק ממתין" },
  { tone: "warn", label: "חלקי" },
  { tone: "bad", label: "באיחור או חזר" },
  { tone: "neutral", label: "צפוי" },
];

// The whole contract on one line, like the stubs left in a cheque book.
// Each month jumps to its row; the strip opens on the current month.
export function MonthStrip({ months }: { months: StripMonth[] }) {
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div className="space-y-3">
      <nav aria-label="חודשי השכירות" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ol className="flex gap-1.5 py-1">
          {months.map((m) => (
            <li key={m.id}>
              <a
                ref={m.current ? currentRef : undefined}
                href={`#payment-${m.id}`}
                aria-label={m.label}
                aria-current={m.current ? "date" : undefined}
                className={`flex h-14 w-12 flex-col items-center justify-center rounded-lg text-sm leading-tight font-medium ${CELL[m.tone]} ${
                  m.current ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
                }`}
              >
                <span>{m.month}</span>
                <span className="text-xs font-normal tabular-nums opacity-80">{m.year}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map((l) => (
          <li key={l.tone} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${CELL[l.tone]}`} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
