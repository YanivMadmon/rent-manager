import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string; name: string | null; avatarUrl: string | null };

// Google sign-in puts the profile in user_metadata. Only https URLs are used.
function profileFrom(metadata: unknown) {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const name = [m.full_name, m.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const avatar = [m.avatar_url, m.picture].find(
    (v): v is string => typeof v === "string" && v.startsWith("https://"),
  );
  return { name: name?.trim() ?? null, avatarUrl: avatar ?? null };
}

// Verifies the session JWT (getClaims checks the signature against the
// project's JWKS). Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session checks compare token expiry with the current time, so mark this
  // as request-time work for Cache Components before touching Supabase.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: String(claims.email ?? ""), ...profileFrom(claims.user_metadata) };
});

// Use in every landlord page and Server Function — the proxy is only a first line.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
