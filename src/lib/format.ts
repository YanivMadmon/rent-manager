import type { PartyRole, TenancyStatus } from "@/generated/prisma/enums";

const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatILS = (agorot: number) => ils.format(agorot / 100);

// Dates are stored as UTC midnight (@db.Date), so format in UTC.
const dateFmt = new Intl.DateTimeFormat("he-IL", { timeZone: "UTC" });
export const formatDate = (d: Date) => dateFmt.format(d);

// +972501234567 → 050-1234567
export function formatPhone(e164: string) {
  const local = "0" + e164.replace(/^\+972/, "");
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3)}` : local;
}

export const TENANCY_STATUS_LABEL: Record<TenancyStatus, string> = {
  DRAFT: "טיוטה",
  AWAITING_SIGNATURES: "ממתינה לחתימות",
  ACTIVE: "פעילה",
  ENDING: "לקראת סיום",
  CLOSED: "הסתיימה",
};

export const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  TENANT: "שוכר",
  GUARANTOR: "ערב",
  LANDLORD: "משכיר",
};
