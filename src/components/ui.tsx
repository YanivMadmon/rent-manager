import type { ReactNode } from "react";
import Link from "next/link";

// Shared look for the landlord screens. Every tap target is at least 44px tall.

export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60";

export const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-sunken disabled:opacity-60";

export type Tone = "neutral" | "info" | "good" | "warn" | "bad";

const TONE_PILL: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  info: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  good: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  bad: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-line-strong",
  info: "bg-blue-500",
  good: "bg-green-600",
  warn: "bg-amber-500",
  bad: "bg-red-600",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

// A list lives on one raised panel with hairlines between rows.
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ id, children, count }: { id?: string; children: ReactNode; count?: number }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-lg font-semibold">
      {children}
      {count !== undefined && count > 0 && <span className="text-sm font-normal text-muted tabular-nums">{count}</span>}
    </h2>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-line-strong px-6 py-8 text-center">
      <p className="mx-auto max-w-[40ch] text-sm text-muted">{children}</p>
      {action}
    </div>
  );
}

// "← back" for RTL: the arrow points toward the start (right) edge.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ms-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
      {children}
    </Link>
  );
}

// Points "forward" in RTL, i.e. to the left.
export function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export const PAYMENT_TONE: Record<
  "EXPECTED" | "PENDING_DEPOSIT" | "DEPOSITED" | "PAID" | "PARTIAL" | "LATE" | "BOUNCED",
  Tone
> = {
  EXPECTED: "neutral",
  PENDING_DEPOSIT: "info",
  DEPOSITED: "good",
  PAID: "good",
  PARTIAL: "warn",
  LATE: "bad",
  BOUNCED: "bad",
};

// Form controls: 16px text so phones don't zoom in on focus.
export const fieldClass =
  "block min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink";
