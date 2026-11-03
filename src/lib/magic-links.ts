import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { MagicLinkPurpose } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Only the hash is stored, so a database leak doesn't expose working links.
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export async function linkUrl(token: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? (await headers()).get("origin") ?? "";
  return `${origin}/l/${token}`;
}

// Returns the link even when already used, so its page can say so.
// Expired or unknown tokens return null.
export async function findLink(token: string, purpose: MagicLinkPurpose) {
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!link || link.purpose !== purpose || link.expiresAt < new Date()) return null;
  return link;
}
