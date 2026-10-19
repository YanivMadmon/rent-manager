import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

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
  return { id: claims.sub, email: String(claims.email ?? "") };
});

// Use in every landlord page and Server Function — the proxy is only a first line.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
