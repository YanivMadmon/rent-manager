import { z } from "zod";
import type { MagicLink } from "@/generated/prisma/client";
import { InspectionRooms } from "@/components/inspection-rooms";
import { formatDateTime } from "@/lib/format";
import { signPhotoUrls } from "@/lib/inspection-photos";
import { prisma } from "@/lib/prisma";
import { InspectionForm } from "./inspection-form";
import { LinkMessage } from "./link-message";

export async function InspectionReport({ link, token }: { link: MagicLink; token: string }) {
  const target = z.object({ inspectionId: z.string() }).safeParse(link.target);
  const inspection = target.success
    ? await prisma.inspection.findFirst({
        where: { id: target.data.inspectionId, tenancyId: link.tenancyId },
        include: {
          photos: { orderBy: { createdAt: "asc" } },
          tenancy: { select: { property: { select: { address: true, city: true } } } },
        },
      })
    : null;
  if (!inspection) return <LinkMessage title="הקישור לא תקף" body="אפשר לבקש קישור חדש מבעל הדירה." />;

  const urls = await signPhotoUrls(inspection.photos.map((p) => p.path));
  const { address, city } = inspection.tenancy.property;
  const approved = inspection.tenantApprovedAt;
  // An unused link that was replaced by a newer one can no longer change anything.
  if (!approved && link.usedAt) {
    return <LinkMessage title="הקישור לא תקף" body="אפשר לבקש קישור חדש מבעל הדירה." />;
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">פרוטוקול מסירה</h1>
        <p className="opacity-70">
          {address}, {city}
        </p>
      </div>

      {approved ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm dark:bg-green-950/40">
          אישרת את הפרוטוקול ב-{formatDateTime(approved)}. תודה!
        </p>
      ) : (
        <p className="text-sm opacity-80">
          אלה התמונות של מצב הדירה ביום המסירה, לפי חדרים. אם משהו לא מדויק, אפשר להוסיף תמונות משלך לפני
          האישור.
        </p>
      )}

      <InspectionRooms photos={inspection.photos.map((p) => ({ ...p, url: urls.get(p.path) ?? null }))} />

      {!approved && (
        <InspectionForm token={token} rooms={[...new Set(inspection.photos.map((p) => p.room))]} />
      )}
    </>
  );
}
