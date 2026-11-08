import { PreparedMessage } from "@/components/prepared-message";
import { formatDate } from "@/lib/format";
import { daysLeft, deadlineLabel, issueDeadline } from "@/lib/issues";
import { prisma } from "@/lib/prisma";
import { createAdminClient, ISSUE_BUCKET } from "@/lib/supabase/admin";
import { PhotoGallery } from "../../../photos/photo-gallery";
import { createIssueLink } from "./actions";
import { IssueStatus } from "./issue-status";

// Caller must have verified that the tenancy belongs to the current landlord.
export async function TenancyIssues({ tenancyId }: { tenancyId: string }) {
  const tenancy = await prisma.tenancy.findUniqueOrThrow({
    where: { id: tenancyId },
    include: { issues: { orderBy: [{ urgent: "desc" }, { reportedAt: "asc" }] } },
  });

  // Open issues first; urgent ones lead each group through the query order.
  const issues = [...tenancy.issues].sort(
    (a, b) => Number(a.status === "RESOLVED") - Number(b.status === "RESOLVED"),
  );

  // Photos are private: show them through signed URLs valid for an hour.
  const paths = issues.flatMap((i) => i.photoPaths);
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await createAdminClient().storage.from(ISSUE_BUCKET).createSignedUrls(paths, 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }

  const now = new Date();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {tenancy.status !== "CLOSED" && (
          <PreparedMessage
            prepare={createIssueLink.bind(null, tenancy.id)}
            label="קישור לדיווח לשוכר"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          />
        )}
      </div>

      {issues.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/20 p-4 text-center text-sm opacity-80 dark:border-white/20">
          לא דווחו תקלות. אפשר לשלוח לשוכר קישור קבוע לדיווח.
        </p>
      ) : (
        <ul className="space-y-3">
          {issues.map((issue) => {
            const left = daysLeft(issueDeadline(issue), now);
            return (
              <li
                key={issue.id}
                className="space-y-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-transparent"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-semibold">
                      {issue.title}
                      {issue.urgent && (
                        <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
                          דחוף
                        </span>
                      )}
                    </p>
                    <p className="text-sm opacity-70">דווח ב-{formatDate(issue.reportedAt)}</p>
                    {issue.resolvedAt ? (
                      <p className="text-sm opacity-70">תוקן ב-{formatDate(issue.resolvedAt)}</p>
                    ) : (
                      <p className={`text-sm ${left < 0 ? "text-red-700 dark:text-red-400" : "opacity-70"}`}>
                        {deadlineLabel(left)}
                      </p>
                    )}
                  </div>
                  <IssueStatus issueId={issue.id} status={issue.status} />
                </div>

                {issue.description && (
                  <p className="whitespace-pre-wrap break-words text-sm">{issue.description}</p>
                )}
                {issue.photoPaths.length > 0 && (
                  <PhotoGallery
                    photos={issue.photoPaths.map((path) => ({ id: path, url: urls.get(path) ?? null }))}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
