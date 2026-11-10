"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { linkUrl, newToken } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { UTILITY_LABEL } from "@/lib/utilities";

const LINK_DAYS = 30;
const TypeSchema = z.enum(["ARNONA", "ELECTRICITY", "WATER", "GAS"]);

async function ownedTenancy(userId: string, tenancyId: string) {
  return prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: userId } },
    include: { property: { select: { address: true } }, utilityTransfers: true },
  });
}

async function log(tenancyId: string, type: string, utility: string) {
  await prisma.timelineEvent.create({ data: { tenancyId, type, actor: "landlord", data: { utility } } });
}

// Marks a bill as moved, whether or not the tenant sent a confirmation.
export async function setUtilityConfirmed(
  tenancyId: string,
  type: string,
  confirmed: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  const utility = TypeSchema.safeParse(type);
  if (!tenancy || !utility.success) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { error: "השכירות סגורה" };

  const confirmedAt = confirmed ? new Date() : null;
  await prisma.utilityTransfer.upsert({
    where: { tenancyId_type: { tenancyId, type: utility.data } },
    create: { tenancyId, type: utility.data, confirmedAt },
    update: { confirmedAt, ...(confirmed && { skipped: false }) },
  });
  await log(tenancyId, confirmed ? "utility.confirmed" : "utility.unconfirmed", utility.data);

  revalidatePath(`/properties/${tenancy.propertyId}`);
  revalidatePath("/dashboard");
  return {};
}

// Some flats have no gas, or the landlord keeps a bill in their own name.
export async function setUtilitySkipped(
  tenancyId: string,
  type: string,
  skipped: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  const utility = TypeSchema.safeParse(type);
  if (!tenancy || !utility.success) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { error: "השכירות סגורה" };

  await prisma.utilityTransfer.upsert({
    where: { tenancyId_type: { tenancyId, type: utility.data } },
    create: { tenancyId, type: utility.data, skipped },
    update: { skipped, ...(skipped && { confirmedAt: null }) },
  });
  await log(tenancyId, skipped ? "utility.skipped" : "utility.unskipped", utility.data);

  revalidatePath(`/properties/${tenancy.propertyId}`);
  revalidatePath("/dashboard");
  return {};
}

// One link for the whole checklist. A fresh one replaces any earlier link,
// since only the token's hash is stored.
export async function createUtilityLink(
  tenancyId: string,
): Promise<{ whatsappUrl: string; message: string } | { error: string }> {
  const user = await requireUser();
  const tenancy = await ownedTenancy(user.id, tenancyId);
  if (!tenancy) return { error: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { error: "השכירות סגורה" };

  const open = (["ARNONA", "ELECTRICITY", "WATER", "GAS"] as const).filter((type) => {
    const row = tenancy.utilityTransfers.find((u) => u.type === type);
    return !row?.skipped && !row?.confirmedAt;
  });
  if (open.length === 0) return { error: "כל החשבונות כבר הועברו" };

  const tenant = await prisma.party.findFirst({
    where: { tenancyId, role: "TENANT" },
    orderBy: { id: "asc" },
  });
  if (!tenant) return { error: "אין שוכר בשכירות" };

  const { token, tokenHash } = newToken();
  await prisma.$transaction([
    prisma.magicLink.updateMany({
      where: { tenancyId, purpose: "UTILITY_PROOF", expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    }),
    prisma.magicLink.create({
      data: {
        tenancyId,
        partyId: tenant.id,
        purpose: "UTILITY_PROOF",
        tokenHash,
        expiresAt: new Date(Date.now() + LINK_DAYS * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const bills = open.map((type) => UTILITY_LABEL[type]).join(", ");
  const message =
    `שלום ${tenant.fullName}, צריך להעביר לשמך את החשבונות של הדירה (${tenancy.property.address}): ${bills}. ` +
    `אחרי ההעברה אפשר להעלות כאן את האישורים: ${await linkUrl(token)}`;
  const phone = tenant.phone.replace(/^\+/, "");
  return { message, whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` };
}
