import "server-only";
import { headers } from "next/headers";

// The site's public origin. A trailing slash in NEXT_PUBLIC_APP_URL would make
// links like "https://site//auth/callback", which Supabase doesn't recognise as
// an allowed redirect, so it's stripped here.
export async function appOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? (await headers()).get("origin") ?? "";
  return origin.trim().replace(/\/+$/, "");
}
