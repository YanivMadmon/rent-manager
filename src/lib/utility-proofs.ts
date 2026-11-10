import "server-only";
import { createAdminClient, UTILITY_BUCKET } from "@/lib/supabase/admin";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const proofPrefix = (tenancyId: string) => `${tenancyId}/`;

// A one-time signed upload URL for a confirmation (image or PDF).
export async function signProofUpload(tenancyId: string, contentType: string, size: number) {
  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר לצרף תמונה או PDF" };
  if (size > MAX_BYTES) return { error: "הקובץ גדול מ-10MB" };

  const { data, error } = await createAdminClient()
    .storage.from(UTILITY_BUCKET)
    .createSignedUploadUrl(`${proofPrefix(tenancyId)}${crypto.randomUUID()}.${ext}`);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסו שוב." };
  return { path: data.path, token: data.token };
}

// The path must be one we issued for this tenancy, and the upload must exist.
export async function checkProof(tenancyId: string, path: string) {
  if (!path.startsWith(proofPrefix(tenancyId)) || path.includes("..")) return "הקובץ לא תקין";
  const { data: exists } = await createAdminClient().storage.from(UTILITY_BUCKET).exists(path);
  return exists ? null : "העלאת הקובץ לא הושלמה";
}

export async function removeProof(path: string | null | undefined) {
  if (path) await createAdminClient().storage.from(UTILITY_BUCKET).remove([path]);
}

export async function signProofUrls(paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await createAdminClient().storage.from(UTILITY_BUCKET).createSignedUrls(paths, 60 * 60);
  data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  return urls;
}
