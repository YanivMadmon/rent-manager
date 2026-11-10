"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findLink } from "@/lib/magic-links";
import { prisma } from "@/lib/prisma";
import { checkProof, removeProof, signProofUpload } from "@/lib/utility-proofs";

const INVALID = { error: "הקישור לא תקף" };
const TypeSchema = z.enum(["ARNONA", "ELECTRICITY", "WATER", "GAS"]);

// These actions are public: the token is the only credential, and it reaches
// only the bills of its own tenancy.
async function openChecklist(token: string, type: string) {
  const link = await findLink(token, "UTILITY_PROOF");
  const utility = TypeSchema.safeParse(type);
  if (!link || !utility.success) return null;

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: link.tenancyId },
    select: { id: true, propertyId: true, status: true },
  });
  if (!tenancy || tenancy.status === "CLOSED") return null;

  const row = await prisma.utilityTransfer.findUnique({
    where: { tenancyId_type: { tenancyId: tenancy.id, type: utility.data } },
  });
  // Once the landlord confirmed or skipped a bill, it no longer takes uploads.
  if (row?.confirmedAt || row?.skipped) return null;
  return { link, tenancy, type: utility.data, row };
}

export async function requestUtilityUpload(
  token: string,
  type: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  const open = await openChecklist(token, type);
  if (!open) return INVALID;
  return signProofUpload(open.tenancy.id, contentType, size);
}

// A new confirmation replaces the previous one for the same bill.
export async function saveUtilityProof(token: string, type: string, path: string): Promise<{ error?: string }> {
  const open = await openChecklist(token, type);
  if (!open) return INVALID;
  const { link, tenancy, row } = open;

  const invalid = await checkProof(tenancy.id, path);
  if (invalid) return { error: invalid };

  await prisma.$transaction([
    prisma.utilityTransfer.upsert({
      where: { tenancyId_type: { tenancyId: tenancy.id, type: open.type } },
      create: { tenancyId: tenancy.id, type: open.type, proofPath: path, uploadedAt: new Date() },
      update: { proofPath: path, uploadedAt: new Date() },
    }),
    prisma.timelineEvent.create({
      data: {
        tenancyId: tenancy.id,
        type: "utility.proof_uploaded",
        actor: link.partyId ? `tenant:${link.partyId}` : "tenant",
        data: { utility: open.type },
      },
    }),
  ]);
  if (row?.proofPath && row.proofPath !== path) await removeProof(row.proofPath);

  revalidatePath(`/properties/${tenancy.propertyId}`);
  revalidatePath("/dashboard");
  return {};
}
