"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalNumber = (schema: z.ZodNumber) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s)))
    .pipe(schema.nullable());

const PropertySchema = z
  .object({
    address: z.string().trim().min(2, "יש להזין כתובת"),
    city: z.string().trim().min(2, "יש להזין עיר"),
    notes: z
      .string()
      .trim()
      .max(1000, "ההערות ארוכות מדי")
      .transform((s) => (s ? s : null)),
    propertyType: z
      .enum(["APARTMENT", "GARDEN_APARTMENT", "PENTHOUSE", "DUPLEX", "STUDIO", "HOUSE", "UNIT", ""])
      .transform((s) => (s ? s : null)),
    rooms: optionalNumber(
      z
        .number({ message: "מספר חדרים לא תקין" })
        .min(1, "מספר חדרים לא תקין")
        .max(20, "מספר חדרים לא תקין")
        .refine((n) => Number.isInteger(n * 2), "אפשר חצאי חדרים, למשל 3.5"),
    ),
    sizeSqm: optionalNumber(z.number({ message: "גודל לא תקין" }).int("גודל במספר שלם").min(5).max(2000)),
    floor: optionalNumber(z.number({ message: "קומה לא תקינה" }).int("קומה לא תקינה").min(-5).max(200)),
    totalFloors: optionalNumber(z.number({ message: "מספר קומות לא תקין" }).int().min(0).max(200)),
    furnished: z.enum(["NONE", "PARTIAL", "FULL", ""]).transform((s) => (s ? s : null)),
    features: z.array(
      z.enum([
        "PARKING",
        "ELEVATOR",
        "BALCONY",
        "SAFE_ROOM",
        "STORAGE",
        "AIR_CONDITIONING",
        "BARS",
        "ACCESSIBLE",
        "PETS_ALLOWED",
      ]),
    ),
  })
  .refine((p) => p.floor === null || p.totalFloors === null || p.floor <= p.totalFloors, {
    path: ["totalFloors"],
    message: "הקומה גבוהה ממספר הקומות בבניין",
  });

type Field = keyof z.input<typeof PropertySchema>;

export type PropertyFormState = {
  ok?: boolean;
  errors?: Partial<Record<Field, string>>;
  formError?: string;
};

function parse(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  const parsed = PropertySchema.safeParse({
    address: text("address"),
    city: text("city"),
    notes: text("notes"),
    propertyType: text("propertyType"),
    rooms: text("rooms"),
    sizeSqm: text("sizeSqm"),
    floor: text("floor"),
    totalFloors: text("totalFloors"),
    furnished: text("furnished"),
    features: [...new Set(formData.getAll("features").map(String))],
  });
  if (parsed.success) return { data: parsed.data };

  const errors: PropertyFormState["errors"] = {};
  for (const issue of parsed.error.issues) {
    errors[issue.path[0] as Field] ??= issue.message;
  }
  return { errors };
}

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();
  const { data, errors } = parse(formData);
  if (!data) return { errors };

  await prisma.property.create({ data: { ...data, ownerId: user.id } });
  revalidatePath("/properties");
  return { ok: true };
}

export async function updateProperty(
  propertyId: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();
  const { data, errors } = parse(formData);
  if (!data) return { errors };

  const { count } = await prisma.property.updateMany({
    where: { id: propertyId, ownerId: user.id },
    data,
  });
  if (count === 0) return { formError: "הנכס לא נמצא" };

  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return { ok: true };
}

// Saves the ad text as the landlord edited it. Empty goes back to the text
// generated from the property's details.
export async function saveListingText(propertyId: string, text: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z.string().trim().max(4000, "הטקסט ארוך מדי").safeParse(text);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await prisma.property.updateMany({
    where: { id: propertyId, ownerId: user.id },
    data: { listingText: parsed.data || null },
  });
  if (count === 0) return { error: "הנכס לא נמצא" };

  revalidatePath(`/properties/${propertyId}`);
  return {};
}
