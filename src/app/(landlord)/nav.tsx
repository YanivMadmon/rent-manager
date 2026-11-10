"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "ראשי", icon: <HomeIcon /> },
  { href: "/properties", label: "נכסים", icon: <BuildingIcon /> },
] as const;

type Variant = "top" | "bottom";

// Reads the URL, so it must render inside <Suspense> (Cache Components):
// pages with dynamic params can't resolve the pathname while prerendering.
export function MainNav({ variant }: { variant: Variant }) {
  return <NavLinks variant={variant} pathname={usePathname()} />;
}

// Top links on wide screens; a bottom tab bar within thumb reach on the phone.
// With no pathname (the Suspense fallback) it draws the same bar, nothing active.
export function NavLinks({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

  if (variant === "top") {
    return (
      <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 md:flex">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-ink aria-[current=page]:bg-sunken aria-[current=page]:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted aria-[current=page]:text-blue-700 dark:aria-[current=page]:text-blue-300"
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M16 9h2a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18" />
      <path d="M8 7h4M8 11h4M8 15h4" />
    </svg>
  );
}
