import { PhotoGallery } from "@/app/(landlord)/properties/[id]/photos/photo-gallery";
import { groupByRoom } from "@/lib/rooms";

type Photo = { id: string; room: string; note: string | null; byTenant: boolean; url: string | null };

// The handover photos, room by room. Shared by the landlord and tenant pages.
export function InspectionRooms({
  photos,
  onDelete,
}: {
  photos: Photo[];
  onDelete?: (photoId: string) => Promise<unknown>;
}) {
  return (
    <div className="space-y-5">
      {groupByRoom(photos).map((room) => (
        <section key={room.name} className="space-y-2">
          <h3 className="font-semibold">{room.name}</h3>
          {room.notes.map((note) => (
            <p key={note} className="whitespace-pre-wrap break-words text-sm opacity-80">
              {note}
            </p>
          ))}
          {room.landlord.length > 0 && <PhotoGallery photos={room.landlord} onDelete={onDelete} />}
          {room.tenant.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium opacity-70">תמונות שהוסיף השוכר</p>
              <PhotoGallery photos={room.tenant} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
