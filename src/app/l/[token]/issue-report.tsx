import type { MagicLink } from "@/generated/prisma/client";
import { formatDate, ISSUE_STATUS_LABEL } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { IssueForm } from "./issue-form";
import { LinkMessage } from "./link-message";

export async function IssueReport({ link, token }: { link: MagicLink; token: string }) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: link.tenancyId },
    select: {
      status: true,
      property: { select: { address: true, city: true } },
      issues: {
        orderBy: { reportedAt: "desc" },
        select: { id: true, title: true, status: true, urgent: true, reportedAt: true },
      },
    },
  });
  if (!tenancy || tenancy.status === "CLOSED") {
    return <LinkMessage title="הקישור לא תקף" body="השכירות הסתיימה." />;
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">דיווח על תקלה</h1>
        <p className="opacity-70">
          {tenancy.property.address}, {tenancy.property.city}
        </p>
      </div>

      <IssueForm token={token} />

      {tenancy.issues.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">התקלות שדווחו</h2>
          <ul className="space-y-2">
            {tenancy.issues.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3 dark:border-white/15"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {issue.title}
                    {issue.urgent && " (דחוף)"}
                  </p>
                  <p className="text-sm opacity-70">{formatDate(issue.reportedAt)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium dark:bg-white/10">
                  {ISSUE_STATUS_LABEL[issue.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
