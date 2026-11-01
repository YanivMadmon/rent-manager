import { prisma } from "@/lib/prisma";
import { createAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";
import { PhotoUploader } from "./photo-uploader";
import { DeletePhotoButton } from "./delete-photo-button";

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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const url = urls.get(photo.path);
            return (
              <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {/* Signed URLs change hourly, so next/image caching adds nothing here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="תמונת הנכס" loading="lazy" className="h-full w-full object-cover" />
                  </a>
                )}
                <DeletePhotoButton photoId={photo.id} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
