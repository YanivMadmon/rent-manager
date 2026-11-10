import type { UtilityType } from "@/generated/prisma/enums";
import type { Tone } from "@/components/ui";

// The bills a tenant moves into their own name at move-in, in checklist order.
export const UTILITY_TYPES: UtilityType[] = ["ARNONA", "ELECTRICITY", "WATER", "GAS"];

export const UTILITY_LABEL: Record<UtilityType, string> = {
  ARNONA: "ארנונה",
  ELECTRICITY: "חשמל",
  WATER: "מים",
  GAS: "גז",
};

type UtilityRow = { proofPath: string | null; confirmedAt: Date | null; skipped: boolean } | undefined;

export type UtilityState = "skipped" | "confirmed" | "uploaded" | "pending";

// A missing row means nothing has happened yet for that bill.
export function utilityState(row: UtilityRow): UtilityState {
  if (row?.skipped) return "skipped";
  if (row?.confirmedAt) return "confirmed";
  if (row?.proofPath) return "uploaded";
  return "pending";
}

export const UTILITY_STATE: Record<UtilityState, { label: string; tone: Tone }> = {
  skipped: { label: "לא רלוונטי", tone: "neutral" },
  confirmed: { label: "הועבר", tone: "good" },
  uploaded: { label: "ממתין לאישור", tone: "info" },
  pending: { label: "טרם הועבר", tone: "warn" },
};
