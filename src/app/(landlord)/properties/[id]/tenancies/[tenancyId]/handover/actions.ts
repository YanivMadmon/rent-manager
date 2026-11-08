"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  checkUploadedPhotos,
  MAX_INSPECTION_PHOTOS,
  RoomPhotosSchema,
  signPhotoUpload,
} from "@/lib/inspection-photos";
import { linkUrl, newToken } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { createAdminClient, INSPECTION_BUCKET } from "@/lib/supabase/admin";

const LINK_DAYS = 14;
const APPROVED = { error: "השוכר כבר אישר את הפרוטוקול, ואי אפשר לשנות אותו" };
const CLOSED = { error: "השכירות סגורה" };

async function ownedTenancy(userId: string, tenancyId: string) {
  return prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: userId } },
    include: {
      property: { select: { address: true } },
      inspections: { where: { kind: "MOVE_OUT" }, include: { _count: { select: { photos: true } } } },
    },
  });
}

const landlordPrefix = (userId: string, tenancyId: string) => `${userId}/${tenancyId}/move-out/`;

function refresh(propertyId: string, tenancyId: string) {
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/tenancies/${tenancyId}/handover`);
}

export async function requestInspectionUpload(
  tenancyId: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return CLOSED;
  if (tenancy.inspections[0]?.tenantApprovedAt) return APPROVED;
  return signPhotoUpload(landlordPrefix(user.id, tenancyId), contentType, size);
}

export async function addInspectionPhotos(
  tenancyId: string,
  input: { room: string; note: string; paths: string[] },
): Promise<{ error?: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return CLOSED;
  const existing = tenancy.inspections[0];
  if (existing?.tenantApprovedAt) return APPROVED;

  const parsed = RoomPhotosSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { room, note, paths } = parsed.data;
  if ((existing?._count.photos ?? 0) + paths.length > MAX_INSPECTION_PHOTOS) {
    return { error: `אפשר לשמור עד ${MAX_INSPECTION_PHOTOS} תמונות בפרוטוקול` };
  }

  const invalid = await checkUploadedPhotos(landlordPrefix(user.id, tenancyId), paths);
  if (invalid) return { error: invalid };

  await prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.upsert({
      where: { tenancyId_kind: { tenancyId, kind: "MOVE_OUT" } },
      create: { tenancyId, kind: "MOVE_OUT" },
      update: {},
    });
    // Starting the handover marks the tenancy as ending.
    if (tenancy.status !== "ENDING") {
      await tx.tenancy.update({ where: { id: tenancyId }, data: { status: "ENDING" } });
    }
    await tx.inspectionPhoto.createMany({
      data: paths.map((path) => ({ inspectionId: inspection.id, room, note, path })),
    });
    await tx.timelineEvent.create({
      data: {
        tenancyId,
        type: "inspection.photos_added",
        actor: "landlord",
        data: { room, count: paths.length },
      },
    });
  });

  refresh(tenancy.propertyId, tenancyId);
  return {};
}

// Only the landlord's own photos, and only until the tenant approves.
export async function deleteInspectionPhoto(photoId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const photo = await prisma.inspectionPhoto.findFirst({
    where: { id: photoId, byTenant: false, inspection: { tenancy: { property: { ownerId: user.id } } } },
    include: { inspection: { include: { tenancy: { select: { propertyId: true, status: true } } } } },
  });
  if (!photo) return { error: "התמונה לא נמצאה" };
  if (photo.inspection.tenancy.status === "CLOSED") return CLOSED;
  if (photo.inspection.tenantApprovedAt) return APPROVED;

  await createAdminClient().storage.from(INSPECTION_BUCKET).remove([photo.path]);
  await prisma.inspectionPhoto.delete({ where: { id: photo.id } });

  refresh(photo.inspection.tenancy.propertyId, photo.inspection.tenancyId);
  return {};
}

// A fresh link replaces any unused one, since only the token's hash is stored.
export async function createInspectionLink(
  tenancyId: string,
): Promise<{ whatsappUrl: string; message: string } | { error: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return CLOSED;
  const inspection = tenancy.inspections[0];
  if (!inspection || inspection._count.photos === 0) return { error: "קודם צריך לצלם את הדירה" };
  if (inspection.tenantApprovedAt) return APPROVED;

  const tenant = await prisma.party.findFirst({
    where: { tenancyId, role: "TENANT" },
    orderBy: { id: "asc" },
  });
  if (!tenant) return { error: "אין שוכר בשכירות" };

  const { token, tokenHash } = newToken();
  await prisma.$transaction([
    prisma.magicLink.updateMany({
      where: { tenancyId, purpose: "APPROVE_INSPECTION", usedAt: null },
      data: { expiresAt: new Date() },
    }),
    prisma.magicLink.create({
      data: {
        tenancyId,
        partyId: tenant.id,
        purpose: "APPROVE_INSPECTION",
        tokenHash,
        target: { inspectionId: inspection.id },
        expiresAt: new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const message =
    `שלום ${tenant.fullName}, זה פרוטוקול המסירה של הדירה (${tenancy.property.address}) בסיום השכירות, עם תמונות של מצבה. ` +
    `אפשר להוסיף תמונות משלך ולאשר כאן: ${await linkUrl(token)}`;
  const phone = tenant.phone.replace(/^\+/, "");
  return { message, whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` };
}

// Ends the tenancy: it moves to the archive with its timeline, files and protocol.
export async function closeTenancy(tenancyId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return CLOSED;

  await prisma.$transaction([
    prisma.tenancy.update({ where: { id: tenancyId }, data: { status: "CLOSED" } }),
    // Links sent to the tenant stop working once the tenancy is over.
    prisma.magicLink.updateMany({
      where: { tenancyId, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId,
        type: "tenancy.closed",
        actor: "landlord",
        data: { handoverApproved: Boolean(tenancy.inspections[0]?.tenantApprovedAt) },
      },
    }),
  ]);

  refresh(tenancy.propertyId, tenancyId);
  revalidatePath("/dashboard");
  revalidatePath("/properties");
  redirect(`/properties/${tenancy.propertyId}`);
}
