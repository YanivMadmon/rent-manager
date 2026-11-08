// Offered as suggestions when photographing a flat; any other name is allowed.
export const ROOM_SUGGESTIONS = [
  "סלון",
  "מטבח",
  "חדר שינה",
  "חדר שינה 2",
  "חדר שינה 3",
  "חדר רחצה",
  "שירותים",
  "מרפסת",
  "מחסן",
  "כללי",
];

type RoomPhoto = { id: string; room: string; note: string | null; byTenant: boolean; url: string | null };

// Groups photos by room, keeping the order rooms were first photographed in.
// A note is saved on every photo of an upload, so notes are de-duplicated here.
export function groupByRoom(photos: RoomPhoto[]) {
  const rooms = new Map<string, { notes: Set<string>; landlord: RoomPhoto[]; tenant: RoomPhoto[] }>();
  for (const photo of photos) {
    const room = rooms.get(photo.room) ?? { notes: new Set(), landlord: [], tenant: [] };
    if (photo.note) room.notes.add(photo.note);
    (photo.byTenant ? room.tenant : room.landlord).push(photo);
    rooms.set(photo.room, room);
  }
  return [...rooms].map(([name, room]) => ({ name, ...room, notes: [...room.notes] }));
}
