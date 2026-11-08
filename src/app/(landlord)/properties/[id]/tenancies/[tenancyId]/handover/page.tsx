import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InspectionRooms } from "@/components/inspection-rooms";
import { PreparedMessage } from "@/components/prepared-message";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { signPhotoUrls } from "@/lib/inspection-photos";
import { prisma } from "@/lib/prisma";
import { createInspectionLink, deleteInspectionPhoto } from "./actions";
import { AddInspectionPhotos } from "./add-inspection-photos";
import { CloseTenancyButton } from "./close-tenancy-button";

type Props = PageProps<"/properties/[id]/tenancies/[tenancyId]/handover">;

export default function HandoverPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="opacity-60">טוען...</p>}>
      <Handover params={params} />
    </Suspense>
  );
}

async function Handover({ params }: Pick<Props, "params">) {
  const { id, tenancyId } = await params;
  const user = await requireUser();

  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, propertyId: id, property: { ownerId: user.id } },
    include: {
      property: { select: { address: true } },
      parties: { where: { role: "TENANT" }, orderBy: { id: "asc" }, select: { fullName: true } },
      inspections: {
        where: { kind: "MOVE_OUT" },
        include: { photos: { orderBy: { createdAt: "asc" } } },
      },
      timeline: { where: { type: "tenancy.closed" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!tenancy) notFound();

  const inspection = tenancy.inspections[0];
  const photos = inspection?.photos ?? [];
  const urls = await signPhotoUrls(photos.map((p) => p.path));
  const approved = inspection?.tenantApprovedAt;
  const closed = tenancy.status === "CLOSED";
  const closedAt = tenancy.timeline[0]?.createdAt;
  const editable = !closed && !approved;

  return (
    <div className="space-y-6">
      <Link href={`/properties/${id}`} className="text-sm opacity-70 hover:underline">
        → {tenancy.property.address}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">תהליך מסירה</h1>
        <p className="text-sm opacity-70">
          {tenancy.parties.map((p) => p.fullName).join(", ")} · {formatDate(tenancy.startDate)} –{" "}
          {formatDate(tenancy.endDate)}
        </p>
      </div>

      {closed && (
        <p className="rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
          השכירות נסגרה{closedAt && ` ב-${formatDateTime(closedAt)}`} ועברה לארכיון.
        </p>
      )}

      <ol className="space-y-4">
        <Step number={1} title="צילום הדירה" done={photos.length > 0}>
          <p className="text-sm opacity-70">
            מצלמים כל חדר במצבו ביום המסירה, עם הערות על נזקים אם יש.
          </p>
          {editable && (
            <AddInspectionPhotos tenancyId={tenancy.id} rooms={[...new Set(photos.map((p) => p.room))]} />
          )}
        </Step>

        <Step number={2} title="אישור השוכר" done={Boolean(approved)}>
          {approved ? (
            <div className="space-y-1 text-sm">
              <p>השוכר אישר את הפרוטוקול ב-{formatDateTime(approved)}.</p>
              {inspection.tenantNote && (
                <p className="whitespace-pre-wrap break-words">הערת השוכר: {inspection.tenantNote}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm opacity-70">
                השוכר מקבל קישור, רואה את התמונות, יכול להוסיף משלו ומאשר. אחרי האישור הפרוטוקול ננעל.
              </p>
              {editable && photos.length > 0 && (
                <PreparedMessage
                  prepare={createInspectionLink.bind(null, tenancy.id)}
                  label="שליחה לאישור השוכר"
                  className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
                />
              )}
            </>
          )}
        </Step>

        <Step number={3} title="סגירת השכירות" done={closed}>
          {closed ? (
            <p className="text-sm opacity-70">השכירות סגורה. ציר הזמן, הקבצים והפרוטוקול נשמרים בארכיון.</p>
          ) : (
            <>
              <p className="text-sm opacity-70">
                {approved
                  ? "הכל מוכן. הסגירה מעבירה את השכירות לארכיון."
                  : "אפשר לסגור גם בלי אישור השוכר, אבל פרוטוקול מאושר מגן עליך במחלוקת על הפיקדון."}
              </p>
              <CloseTenancyButton tenancyId={tenancy.id} approved={Boolean(approved)} />
            </>
          )}
        </Step>
      </ol>

      {photos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">פרוטוקול המסירה</h2>
          <InspectionRooms
            photos={photos.map((p) => ({ ...p, url: urls.get(p.path) ?? null }))}
            onDelete={editable ? deleteInspectionPhoto : undefined}
          />
        </section>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  done,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          done ? "bg-green-600 text-white" : "bg-black/10 dark:bg-white/15"
        }`}
      >
        {done ? "✓" : number}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="font-semibold">{title}</h2>
        {children}
      </div>
    </li>
  );
}
