"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { linkUrl, stableToken } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";

const LINK_GRACE_DAYS = 365;
const IssueStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]);

// The tenant keeps this link for the whole tenancy, so the same URL comes back
// every time. Preparing it again only pushes the expiry to match the end date.
export async function createIssueLink(
  tenancyId: string,
): Promise<{ whatsappUrl: string; message: string } | { error: string }> {
  const user = await requireUser();
  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: user.id } },
    include: {
      property: { select: { address: true } },
      parties: { where: { role: "TENANT" }, orderBy: { id: "asc" }, take: 1 },
    },
  });
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { error: "השכירות הסתיימה" };

  const tenant = tenancy.parties[0];
  if (!tenant) return { error: "אין שוכר בשכירות" };

  const { token, tokenHash } = stableToken(`report-issue:${tenancy.id}`);
  const expiresAt = new Date(tenancy.endDate.getTime() + LINK_GRACE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.magicLink.upsert({
    where: { tokenHash },
    create: { tenancyId: tenancy.id, partyId: tenant.id, purpose: "REPORT_ISSUE", tokenHash, expiresAt },
    update: { expiresAt, partyId: tenant.id },
  });

  const message =
    `שלום ${tenant.fullName}, זה הקישור לדיווח על תקלות בדירה (${tenancy.property.address}).` +
    `כדאי לשמור אותו, הוא תקף לכל תקופת השכירות: ${await linkUrl(token)}`;
  const phone = tenant.phone.replace(/^\+/, "");
  return { message, whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` };
}

export async function setIssueStatus(issueId: string, status: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = IssueStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "סטטוס לא תקין" };

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, tenancy: { property: { ownerId: user.id } } },
    include: { tenancy: { select: { propertyId: true } } },
  });
  if (!issue) return { error: "התקלה לא נמצאה" };
  if (issue.status === parsed.data) return {};

  await prisma.$transaction([
    prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: parsed.data,
        resolvedAt: parsed.data === "RESOLVED" ? new Date() : null,
      },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: issue.tenancyId,
        type: "issue.status_changed",
        actor: "landlord",
        data: { issueId: issue.id, from: issue.status, to: parsed.data },
      },
    }),
  ]);

  revalidatePath(`/properties/${issue.tenancy.propertyId}`);
  revalidatePath("/dashboard");
  return {};
}
