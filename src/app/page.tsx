import Link from "next/link";

// Signed-in landlords are redirected to /properties by the proxy.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold">ניהול שכירות</h1>
      <p className="max-w-md text-lg opacity-80">
        כל הדירות, הצ&apos;קים והמועדים במקום אחד. מהחתימה על החוזה ועד החזרת הפיקדון.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
      >
        כניסה
      </Link>
    </main>
  );
}
