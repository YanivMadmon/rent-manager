import { prisma } from "@/lib/prisma";
import { createAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";
import { PhotoUploader } from "./photo-uploader";
import { deletePhoto } from "./actions";
import { PhotoGallery } from "./photo-gallery";
import { Yad2Button } from "./yad2-button";
import type { Property } from "@/generated/prisma/client";

// Caller must have verified that the property belongs to the current landlord.
export async function PropertyPhotos({ property, rent }: { property: Property; rent: number | null }) {
  const propertyId = property.id;
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
        <div className="flex flex-wrap items-center gap-2">
          <Yad2Button
            listing={property}
            rent={rent}
            photos={photos.flatMap((p, i) => {
              const url = urls.get(p.path);
              return url ? [{ url, name: `${property.address}-${i + 1}.${p.path.split(".").pop()}` }] : [];
            })}
          />
          <PhotoUploader propertyId={propertyId} />
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
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
