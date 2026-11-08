"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  checkUploadedPhotos,
  MAX_INSPECTION_PHOTOS,
  RoomPhotosSchema,
  signPhotoUpload,
} from "@/lib/inspection-photos";
import { findLink } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";

const INVALID = { error: "הקישור לא תקף" };
const LinkTarget = z.object({ inspectionId: z.string() });

// These actions are public: the token is the only credential. It reaches one
// protocol, and only until the tenant approves it.
async function openInspection(token: string) {
  const link = await findLink(token, "APPROVE_INSPECTION");
  if (!link || link.usedAt) return null;
  const target = LinkTarget.safeParse(link.target);
  if (!target.success) return null;

  const inspection = await prisma.inspection.findUnique({
    where: { id: target.data.inspectionId },
    include: {
      tenancy: { select: { propertyId: true, status: true } },
      _count: { select: { photos: true } },
    },
  });
  if (!inspection || inspection.tenancyId !== link.tenancyId || inspection.tenantApprovedAt) return null;
  if (inspection.tenancy.status === "CLOSED") return null;
  return { link, inspection };
}

const tenantPrefix = (inspectionId: string) => `tenant/${inspectionId}/`;
function revalidateHandover(propertyId: string, tenancyId: string) {
  revalidatePath(`/properties/${propertyId}/tenancies/${tenancyId}/handover`);
}

const actorOf = (partyId: string | null) => (partyId ? `tenant:${partyId}` : "tenant");

export async function requestTenantInspectionUpload(
  token: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const open = await openInspection(token);
  if (!open) return INVALID;
  return signPhotoUpload(tenantPrefix(open.inspection.id), contentType, size);
}

export async function addTenantInspectionPhotos(
  token: string,
  input: { room: string; note: string; paths: string[] },
): Promise<{ error?: string }> {
  const open = await openInspection(token);
  if (!open) return INVALID;
  const { link, inspection } = open;

  const parsed = RoomPhotosSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { room, note, paths } = parsed.data;
  if (inspection._count.photos + paths.length > MAX_INSPECTION_PHOTOS) {
    return { error: "הגעתם למספר התמונות המרבי" };
  }

  const invalid = await checkUploadedPhotos(tenantPrefix(inspection.id), paths);
  if (invalid) return { error: invalid };

  await prisma.$transaction([
    prisma.inspectionPhoto.createMany({
      data: paths.map((path) => ({ inspectionId: inspection.id, room, note, path, byTenant: true })),
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: inspection.tenancyId,
        type: "inspection.tenant_photos_added",
        actor: actorOf(link.partyId),
        data: { room, count: paths.length },
      },
    }),
  ]);

  revalidateHandover(inspection.tenancy.propertyId, inspection.tenancyId);
  return {};
}

export async function approveInspection(token: string, note: string): Promise<{ error?: string }> {
  const open = await openInspection(token);
  if (!open) return INVALID;
  const { link, inspection } = open;

  const tenantNote = z.string().trim().max(1000, "ההערה ארוכה מדי").safeParse(note);
  if (!tenantNote.success) return { error: tenantNote.error.issues[0].message };

  // Claiming the link first makes a double submit a no-op.
  const approved = await prisma.$transaction(async (tx) => {
    const claimed = await tx.magicLink.updateMany({
      where: { id: link.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    await tx.inspection.update({
      where: { id: inspection.id },
      data: { tenantApprovedAt: new Date(), tenantNote: tenantNote.data || null },
    });
    await tx.timelineEvent.create({
      data: {
        tenancyId: inspection.tenancyId,
        type: "inspection.approved",
        actor: actorOf(link.partyId),
        data: { inspectionId: inspection.id, hasNote: Boolean(tenantNote.data) },
      },
    });
    return true;
  });
  if (!approved) return INVALID;

  revalidateHandover(inspection.tenancy.propertyId, inspection.tenancyId);
  return {};
}
