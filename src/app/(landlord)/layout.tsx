import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

// The header shell is static; the session read streams in behind Suspense.
// Each page must still call requireUser() itself.
export default function LandlordLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/properties" className="font-bold">
            ניהול שכירות
          </Link>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden opacity-70 sm:inline" dir="ltr">
        {user.email}
      </span>
      <form action={signOut}>
        <button type="submit" className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">
          יציאה
        </button>
      </form>
    </div>
  );
}
