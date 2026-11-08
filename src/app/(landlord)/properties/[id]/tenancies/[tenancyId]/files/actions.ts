"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient, FILES_BUCKET } from "@/lib/supabase/admin";

const MAX_BYTES = 20 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const FileSchema = z.object({
  category: z.enum(["CONTRACT", "GUARANTEE", "OTHER"], { message: "יש לבחור סוג" }),
  name: z.string().trim().min(1, "יש לתת שם לקובץ").max(120, "השם ארוך מדי"),
  path: z.string(),
  mimeType: z.string(),
});

async function ownedTenancy(userId: string, tenancyId: string) {
  return prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: userId } },
    select: { id: true, propertyId: true },
  });
}

const filePrefix = (userId: string, tenancyId: string) => `${userId}/${tenancyId}/`;

// Step 1: the browser gets a one-time signed upload URL and sends the file
// straight to Supabase Storage.
export async function requestFileUpload(
  tenancyId: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };

  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר להעלות PDF, Word או תמונה" };
  if (size > MAX_BYTES) return { error: "הקובץ גדול מ-20MB" };

  const path = `${filePrefix(user.id, tenancyId)}${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסה שוב." };

  return { path: data.path, token: data.token };
}

// Step 2: record the file. The path must be one we issued for this landlord
// and tenancy, and the upload must really be there.
export async function addFile(
  tenancyId: string,
  input: { category: string; name: string; path: string; mimeType: string },
): Promise<{ error?: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };

  const parsed = FileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const file = parsed.data;

  if (!file.path.startsWith(filePrefix(user.id, tenancyId)) || file.path.includes("..")) {
    return { error: "הקובץ לא תקין" };
  }
  if (!EXTENSIONS[file.mimeType]) return { error: "סוג קובץ לא נתמך" };
  const { data: exists } = await createAdminClient().storage.from(FILES_BUCKET).exists(file.path);
  if (!exists) return { error: "ההעלאה לא הושלמה" };

  await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: { ...file, ownerId: user.id, propertyId: tenancy.propertyId, tenancyId },
    });
    await tx.timelineEvent.create({
      data: {
        tenancyId,
        type: "document.added",
        actor: "landlord",
        data: { documentId: document.id, name: document.name, category: document.category },
      },
    });
  });

  revalidatePath(`/properties/${tenancy.propertyId}`);
  return {};
}

export async function deleteFile(documentId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const document = await prisma.document.findFirst({ where: { id: documentId, ownerId: user.id } });
  if (!document) return { error: "הקובץ לא נמצא" };

  await createAdminClient().storage.from(FILES_BUCKET).remove([document.path]);
  await prisma.$transaction([
    prisma.document.delete({ where: { id: document.id } }),
    ...(document.tenancyId
      ? [
          prisma.timelineEvent.create({
            data: {
              tenancyId: document.tenancyId,
              type: "document.removed",
              actor: "landlord",
              data: { name: document.name, category: document.category },
            },
          }),
        ]
      : []),
  ]);

  if (document.propertyId) revalidatePath(`/properties/${document.propertyId}`);
  return {};
}
