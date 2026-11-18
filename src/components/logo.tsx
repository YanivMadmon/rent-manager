import { useId } from "react";

// Mark A, "The Door": a house outline with a key standing in the doorway.
// Light mode: the charcoal mark on its own. Dark mode: the dark app-icon
// version, a charcoal tile with a white house. The key stays gold in both.
// The view box is cropped to the drawing so the mark fills its box.
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const gold = `gold-${useId()}`;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-[#1F2023] dark:rounded-[22%] dark:bg-[#1F2023] dark:p-1 dark:text-white dark:ring-1 dark:ring-white/10 ${className}`}
    >
      <svg viewBox="6 6 52 52" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A88347" />
            <stop offset=".45" stopColor="#E2C891" />
            <stop offset=".6" stopColor="#C6A266" />
            <stop offset="1" stopColor="#9C783E" />
          </linearGradient>
        </defs>
        <path
          d="M8 30 L32 9 L56 30 M14 25 V53 H26 M38 53 H50 V25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <circle cx="32" cy="34" r="4.5" fill="none" stroke={`url(#${gold})`} strokeWidth="2.6" />
        <path
          d="M32 38.5 V53 M32 47 H36.5 M32 51.5 H35.5"
          fill="none"
          stroke={`url(#${gold})`}
          strokeWidth="2.6"
          strokeLinecap="square"
        />
      </svg>
    </span>
  );
}
