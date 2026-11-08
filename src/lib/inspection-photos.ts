import "server-only";
import { z } from "zod";
import { createAdminClient, INSPECTION_BUCKET } from "@/lib/supabase/admin";

export const MAX_PHOTOS_PER_UPLOAD = 20;
export const MAX_INSPECTION_PHOTOS = 200;
const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const RoomPhotosSchema = z.object({
  room: z.string().trim().min(1, "יש לבחור חדר").max(40, "שם החדר ארוך מדי"),
  note: z
    .string()
    .trim()
    .max(500, "ההערה ארוכה מדי")
    .transform((s) => (s ? s : null)),
  paths: z.array(z.string()).min(1, "יש לבחור תמונות").max(MAX_PHOTOS_PER_UPLOAD, "יותר מדי תמונות"),
});

// A one-time signed upload URL for a photo under `prefix`.
export async function signPhotoUpload(prefix: string, contentType: string, size: number) {
  const ext = EXTENSIONS[contentType];
  if (!ext) return { error: "אפשר להעלות רק תמונות JPG, PNG או WEBP" };
  if (size > MAX_BYTES) return { error: "התמונה גדולה מ-10MB" };

  const { data, error } = await createAdminClient()
    .storage.from(INSPECTION_BUCKET)
    .createSignedUploadUrl(`${prefix}${crypto.randomUUID()}.${ext}`);
  if (error || !data) return { error: "לא הצלחנו להכין את ההעלאה. נסו שוב." };
  return { path: data.path, token: data.token };
}

// Every path must be one we issued under `prefix`, and the upload must exist.
export async function checkUploadedPhotos(prefix: string, paths: string[]) {
  const storage = createAdminClient().storage.from(INSPECTION_BUCKET);
  for (const path of paths) {
    if (!path.startsWith(prefix) || path.includes("..")) return "התמונה לא תקינה";
    const { data: exists } = await storage.exists(path);
    if (!exists) return "העלאת התמונה לא הושלמה";
  }
  return null;
}

// Signed URLs valid for an hour, keyed by path.
export async function signPhotoUrls(paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await createAdminClient()
    .storage.from(INSPECTION_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  return urls;
}
