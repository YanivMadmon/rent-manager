import { prisma } from "@/lib/prisma";
import { createAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";
import { PhotoUploader } from "./photo-uploader";
import { deletePhoto } from "./actions";
import { PhotoGallery } from "./photo-gallery";

// Caller must have verified that the property belongs to the current landlord.
export async function PropertyPhotos({ propertyId }: { propertyId: string }) {
  const photos = await prisma.propertyPhoto.findMany({
    where: { propertyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, path: true },
  });

  // The bucket is private: show photos through signed URLs valid for an hour.
  const urls = new Map<string, string>();
  if (photos.length > 0) {
    const { data } = await createAdminClient()
      .storage.from(PHOTO_BUCKET)
      .createSignedUrls(photos.map((p) => p.path), 60 * 60);
    data?.forEach((d) => d.path && d.signedUrl && urls.set(d.path, d.signedUrl));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">תמונות</h2>
        <PhotoUploader propertyId={propertyId} />
      </div>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/20 p-6 text-center text-sm opacity-80 dark:border-white/20">
          עוד אין תמונות לנכס. כדאי לצלם את הדירה, למשל לפני כניסת שוכר.
        </p>
      ) : (
        <PhotoGallery
          photos={photos.map((p) => ({ id: p.id, url: urls.get(p.path) ?? null }))}
          onDelete={deletePhoto}
        />
      )}
    </section>
  );
}
