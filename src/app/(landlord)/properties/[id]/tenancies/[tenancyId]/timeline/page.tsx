import { Suspense } from "react";
import { BackLink } from "@/components/ui";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = PageProps<"/properties/[id]/tenancies/[tenancyId]/timeline">;

const EVENT_LABEL: Record<string, string> = {
  "tenancy.created": "השכירות נוצרה",
  "tenancy.imported": "שכירות קיימת נוספה למעקב",
  "tenancy.updated": "פרטי השכירות עודכנו",
  "tenancy.closed": "השכירות נסגרה",
  "payment.paid": "נרשם תשלום",
  "payment.undone": "רישום תשלום בוטל",
  "payment.reported": "השוכר דיווח על תשלום",
  "payment.report_dismissed": "דיווח של השוכר נדחה",
  "payment.notice_prepared": "הוכנה הודעה לשוכר על תשלום",
  "issue.reported": "השוכר דיווח על תקלה",
  "issue.status_changed": "סטטוס תקלה עודכן",
  "issue.cost_set": "עודכנה עלות תיקון",
  "inspection.photos_added": "נוספו תמונות לפרוטוקול המסירה",
  "inspection.tenant_photos_added": "השוכר הוסיף תמונות לפרוטוקול המסירה",
  "inspection.approved": "השוכר אישר את פרוטוקול המסירה",
  "document.added": "הועלה קובץ",
  "document.removed": "קובץ נמחק",
  "checks.added": "נוספו צ׳קים",
  "check.deposited": "צ׳ק הופקד",
  "check.bounced": "צ׳ק חזר",
  "check.removed": "צ׳ק הוסר",
};

export default function TimelinePage({ params }: Props) {
  return (
    <Suspense fallback={<p className="text-muted">טוען...</p>}>
      <Timeline params={params} />
    </Suspense>
  );
}

async function Timeline({ params }: Pick<Props, "params">) {
  const { id, tenancyId } = await params;
  const user = await requireUser();

  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, propertyId: id, property: { ownerId: user.id } },
    include: {
      property: { select: { address: true } },
      timeline: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenancy) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/properties/${id}`}>{tenancy.property.address}</BackLink>
      <h1 className="text-2xl font-semibold">ציר זמן</h1>

      <ol className="space-y-2">
        {tenancy.timeline.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-4"
          >
            <p className="font-medium">{EVENT_LABEL[event.type] ?? event.type}</p>
            <p className="text-sm text-muted">
              {event.actor.startsWith("tenant") ? "השוכר" : "המשכיר"} · {formatDateTime(event.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
