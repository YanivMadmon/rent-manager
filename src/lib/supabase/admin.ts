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
export const PROOF_BUCKET = "payment-proofs";
export const ISSUE_BUCKET = "issue-photos";
export const FILES_BUCKET = "tenancy-files";
export const INSPECTION_BUCKET = "inspection-photos";
