import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { MainNav, NavLinks } from "./nav";
import { LogOutIcon } from "@/components/icons";

// The header shell is static; the session read streams in behind Suspense.
// Each page must still call requireUser() itself.
export default function LandlordLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex min-h-11 items-center text-base font-semibold">
              ניהול שכירות
            </Link>
            <Suspense fallback={<NavLinks variant="top" pathname={null} />}>
              <MainNav variant="top" />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      {/* Bottom padding keeps the last row clear of the phone tab bar. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">
        {children}
      </main>
      <Suspense fallback={<NavLinks variant="bottom" pathname={null} />}>
        <MainNav variant="bottom" />
      </Suspense>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline" dir="ltr">
        {user.email}
      </span>
      <form action={signOut}>
        <button type="submit" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-muted hover:bg-sunken hover:text-ink">
          <LogOutIcon className="h-4 w-4" />
          יציאה
        </button>
      </form>
    </div>
  );
}
