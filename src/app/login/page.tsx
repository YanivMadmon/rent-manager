import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { signInWithGoogle } from "@/app/auth/actions";

const ERRORS: Record<string, string> = {
  oauth: "לא הצלחנו להתחבר עם Google. נסה שוב.",
  exchange: "ההתחברות נכשלה או שפג תוקפה. נסה שוב.",
  missing_code: "ההתחברות לא הושלמה. נסה שוב.",
};

// Signed-in landlords are redirected away from here by the proxy.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-black/10 p-8 text-center dark:border-white/15">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">כניסה לניהול שכירות</h1>
          <p className="text-sm opacity-70">כל הדירות, הצ&apos;קים והמועדים במקום אחד</p>
        </div>
        <Suspense fallback={<GoogleButton next="/properties" />}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? ERRORS[params.error] : null;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      <GoogleButton next={next} />
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-black/15 bg-white px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 dark:border-white/20"
      >
        <GoogleIcon />
        המשך עם Google
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
