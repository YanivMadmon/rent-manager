import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { findLink } from "@/lib/magic-links";
import { InspectionReport } from "./inspection-report";
import { IssueReport } from "./issue-report";
import { LinkMessage } from "./link-message";
import { PaymentReport } from "./payment-report";

// Links carry a token: keep them out of search engines and referrer headers.
export const metadata: Metadata = {
  title: "עדכון לבעל הדירה",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TenantLinkPage({ params }: PageProps<"/l/[token]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-10">
      <Suspense fallback={<p className="opacity-60">טוען...</p>}>
        <TenantLink params={params} />
      </Suspense>
    </main>
  );
}

async function TenantLink({ params }: Pick<PageProps<"/l/[token]">, "params">) {
  await connection();
  const { token } = await params;

  const link = await findLink(token);
  if (link?.purpose === "CONFIRM_PAYMENT") return <PaymentReport link={link} token={token} />;
  if (link?.purpose === "REPORT_ISSUE") return <IssueReport link={link} token={token} />;
  if (link?.purpose === "APPROVE_INSPECTION") return <InspectionReport link={link} token={token} />;
  return <LinkMessage title="הקישור לא תקף" body="אפשר לבקש קישור חדש מבעל הדירה." />;
}
