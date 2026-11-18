import type { Furnishing, PropertyFeature, PropertyType } from "@/generated/prisma/enums";

// Fixed details of a flat, as listing sites ask for them. Everything here is
// optional; things that change between tenancies (entry date) are left out.

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  APARTMENT: "דירה",
  GARDEN_APARTMENT: "דירת גן",
  PENTHOUSE: "פנטהאוז",
  DUPLEX: "דופלקס",
  STUDIO: "סטודיו",
  HOUSE: "בית פרטי",
  UNIT: "יחידת דיור",
};

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  NONE: "לא מרוהטת",
  PARTIAL: "מרוהטת חלקית",
  FULL: "מרוהטת",
};

export const FEATURE_LABEL: Record<PropertyFeature, string> = {
  PARKING: "חניה",
  ELEVATOR: "מעלית",
  BALCONY: "מרפסת",
  SAFE_ROOM: "ממ״ד",
  STORAGE: "מחסן",
  AIR_CONDITIONING: "מיזוג",
  BARS: "סורגים",
  ACCESSIBLE: "גישה לנכים",
  PETS_ALLOWED: "מותר בעלי חיים",
};

export type PropertyDetails = {
  propertyType: PropertyType | null;
  rooms: number | null;
  sizeSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
  furnished: Furnishing | null;
  features: PropertyFeature[];
};

export const floorLabel = (floor: number, total: number | null) =>
  `${floor === 0 ? "קומת קרקע" : `קומה ${floor}`}${total ? ` מתוך ${total}` : ""}`;

// "דירה · 4 חדרים · 95 מ״ר · קומה 3 מתוך 5", leaving out whatever is unknown.
export function detailsSummary(d: PropertyDetails) {
  return [
    d.propertyType && PROPERTY_TYPE_LABEL[d.propertyType],
    d.rooms !== null && `${d.rooms} חדרים`,
    d.sizeSqm !== null && `${d.sizeSqm} מ״ר`,
    d.floor !== null && floorLabel(d.floor, d.totalFloors),
    d.furnished && FURNISHING_LABEL[d.furnished],
  ]
    .filter(Boolean)
    .join(" · ");
}
