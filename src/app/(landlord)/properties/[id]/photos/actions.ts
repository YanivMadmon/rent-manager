"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTOS = 30;

async function ownedProperty(userId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, ownerId: userId },
    select: { id: true, _count: { select: { photos: true } } },
  });
}

type UploadTicket = { path: string; token: string } | { error: string };

// Step 1: the browser asks for a one-time signed upload URL, then uploads the
// file straight to Supabase Storage (no file bytes pass through our server).
export async function requestPhotoUpload(
  propertyId: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const user = await requireUser();
  const property = await ownedProperty(user.id, propertyId);
  if (!property) return { error: "הנכס לא נמצא" };

  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר להעלות רק תמונות JPG, PNG או WEBP" };
  if (size > MAX_BYTES) return { error: "התמונה גדולה מ-10MB" };
  if (property._count.photos >= MAX_PHOTOS) return { error: `אפשר לשמור עד ${MAX_PHOTOS} תמונות לנכס` };

  const path = `${user.id}/${propertyId}/${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient()
    .storage.from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסה שוב." };

  return { path: data.path, token: data.token };
}

// Step 2: after the upload, record the photo. The path must be one we issued
// for this landlord and property, and the file must really exist.
export async function confirmPhotoUpload(
  propertyId: string,
  path: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const property = await ownedProperty(user.id, propertyId);
  if (!property) return { error: "הנכס לא נמצא" };

  if (!path.startsWith(`${user.id}/${propertyId}/`) || path.includes("..")) {
    return { error: "נתיב לא תקין" };
  }

  const { data: exists } = await createAdminClient().storage.from(PHOTO_BUCKET).exists(path);
  if (!exists) return { error: "ההעלאה לא הושלמה" };

  await prisma.propertyPhoto.upsert({
    where: { path },
    create: { propertyId, path },
    update: {},
  });
  revalidatePath(`/properties/${propertyId}`);
  return {};
}

export async function deletePhoto(photoId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const photo = await prisma.propertyPhoto.findFirst({
    where: { id: photoId, property: { ownerId: user.id } },
    select: { id: true, path: true, propertyId: true },
  });
  if (!photo) return { error: "התמונה לא נמצאה" };

  await createAdminClient().storage.from(PHOTO_BUCKET).remove([photo.path]);
  await prisma.propertyPhoto.delete({ where: { id: photo.id } });
  revalidatePath(`/properties/${photo.propertyId}`);
  return {};
}
