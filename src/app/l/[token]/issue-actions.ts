"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findLink } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { createAdminClient, ISSUE_BUCKET } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_OPEN_ISSUES = 20;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const INVALID = { error: "הקישור לא תקף" };

const IssueSchema = z.object({
  title: z.string().trim().min(2, "יש לתאר את התקלה").max(120, "התיאור ארוך מדי"),
  description: z
    .string()
    .trim()
    .max(2000, "הפירוט ארוך מדי")
    .transform((s) => (s ? s : null)),
  urgent: z.boolean(),
  photoPaths: z.array(z.string()).max(5, "אפשר לצרף עד 5 תמונות"),
});

// These actions are public and this link stays valid for the whole tenancy:
// the token is the only credential, and it reaches only its own tenancy.
async function openTenancy(token: string) {
  const link = await findLink(token, "REPORT_ISSUE");
  if (!link) return null;
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: link.tenancyId },
    select: { id: true, propertyId: true, status: true },
  });
  if (!tenancy || tenancy.status === "CLOSED") return null;
  return { link, tenancy };
}

export async function requestIssuePhotoUpload(
  token: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const open = await openTenancy(token);
  if (!open) return INVALID;

  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר לצרף רק תמונות JPG, PNG או WEBP" };
  if (size > MAX_BYTES) return { error: "התמונה גדולה מ-10MB" };

  const path = `${open.tenancy.id}/${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(ISSUE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסו שוב." };

  return { path: data.path, token: data.token };
}

export async function reportIssue(
  token: string,
  input: { title: string; description: string; urgent: boolean; photoPaths: string[] },
): Promise<{ error?: string }> {
  const open = await openTenancy(token);
  if (!open) return INVALID;
  const { link, tenancy } = open;

  const parsed = IssueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { photoPaths, ...details } = parsed.data;

  const openIssues = await prisma.issue.count({
    where: { tenancyId: tenancy.id, status: { not: "RESOLVED" } },
  });
  if (openIssues >= MAX_OPEN_ISSUES) return { error: "יש יותר מדי תקלות פתוחות. פנו לבעל הדירה." };

  const storage = createAdminClient().storage.from(ISSUE_BUCKET);
  for (const path of photoPaths) {
    if (!path.startsWith(`${tenancy.id}/`) || path.includes("..")) return { error: "התמונה לא תקינה" };
    const { data: exists } = await storage.exists(path);
    if (!exists) return { error: "העלאת התמונה לא הושלמה" };
  }

  await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.create({
      data: { ...details, photoPaths, tenancyId: tenancy.id },
    });
    await tx.timelineEvent.create({
      data: {
        tenancyId: tenancy.id,
        type: "issue.reported",
        actor: link.partyId ? `tenant:${link.partyId}` : "tenant",
        data: { issueId: issue.id, urgent: details.urgent },
      },
    });
  });

  revalidatePath(`/properties/${tenancy.propertyId}`);
  revalidatePath("/dashboard");
  return {};
}
