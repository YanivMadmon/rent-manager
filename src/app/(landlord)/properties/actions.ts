"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PropertySchema = z.object({
  address: z.string().trim().min(2, "יש להזין כתובת"),
  city: z.string().trim().min(2, "יש להזין עיר"),
  notes: z.string().trim().max(1000).optional(),
});

export type PropertyFormState = {
  ok?: boolean;
  errors?: Partial<Record<keyof z.infer<typeof PropertySchema>, string>>;
};

const emptyToUndefined = (v: FormDataEntryValue | null) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

export async function createProperty(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();

  const parsed = PropertySchema.safeParse({
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: emptyToUndefined(formData.get("notes")),
  });

  if (!parsed.success) {
    const errors: PropertyFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<PropertyFormState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  await prisma.property.create({ data: { ...parsed.data, ownerId: user.id } });
  revalidatePath("/properties");
  return { ok: true };
}
