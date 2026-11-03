"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { findLink } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { createAdminClient, PROOF_BUCKET } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const INVALID = { error: "הקישור לא תקף" };

const LinkTarget = z.object({ paymentId: z.string() });

// These actions are public: the token is the only credential, so every call
// re-checks it and reaches nothing beyond the one payment it was issued for.
async function openReport(token: string) {
  const link = await findLink(token, "CONFIRM_PAYMENT");
  if (!link || link.usedAt) return null;

  const target = LinkTarget.safeParse(link.target);
  if (!target.success) return null;

  const payment = await prisma.payment.findUnique({ where: { id: target.data.paymentId } });
  if (!payment || payment.tenancyId !== link.tenancyId) return null;
  if (!["EXPECTED", "PARTIAL", "BOUNCED"].includes(payment.status)) return null;
  return { link, payment };
}

const proofPrefix = (tenancyId: string, paymentId: string) => `${tenancyId}/${paymentId}/`;

export async function requestProofUpload(
  token: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const report = await openReport(token);
  if (!report) return INVALID;

  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר לצרף תמונה או PDF" };
  if (size > MAX_BYTES) return { error: "הקובץ גדול מ-10MB" };

  const path = `${proofPrefix(report.link.tenancyId, report.payment.id)}${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(PROOF_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסו שוב." };

  return { path: data.path, token: data.token };
}

export async function reportPayment(
  token: string,
  input: { method: string; proofPath: string | null },
): Promise<{ error?: string }> {
  const report = await openReport(token);
  if (!report) return INVALID;
  const { link, payment } = report;

  const method = z.enum(["TRANSFER", "CASH"]).safeParse(input.method);
  if (!method.success) return { error: "יש לבחור איך שילמתם" };

  const { proofPath } = input;
  if (proofPath) {
    if (!proofPath.startsWith(proofPrefix(link.tenancyId, payment.id)) || proofPath.includes("..")) {
      return { error: "הקובץ לא תקין" };
    }
    const { data: exists } = await createAdminClient().storage.from(PROOF_BUCKET).exists(proofPath);
    if (!exists) return { error: "העלאת הקובץ לא הושלמה" };
  }

  // Claiming the link first makes a double submit a no-op.
  const reported = await prisma.$transaction(async (tx) => {
    const claimed = await tx.magicLink.updateMany({
      where: { id: link.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        reportedAt: new Date(),
        reportedMethod: method.data,
        ...(proofPath && { proofPath }),
      },
    });
    await tx.timelineEvent.create({
      data: {
        tenancyId: link.tenancyId,
        type: "payment.reported",
        actor: link.partyId ? `tenant:${link.partyId}` : "tenant",
        data: { paymentId: payment.id, method: method.data, hasProof: Boolean(proofPath) },
      },
    });
    return true;
  });

  return reported ? {} : INVALID;
}
