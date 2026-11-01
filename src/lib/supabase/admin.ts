import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client with the secret key: bypasses RLS and storage policies.
// Always check ownership before using it.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const PHOTO_BUCKET = "property-photos";
