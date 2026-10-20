"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidIsraeliId, normalizeIsraeliPhone } from "@/lib/israel";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "יש לבחור תאריך")
  .transform((s) => new Date(`${s}T00:00:00Z`));

const PartySchema = z.object({
  id: z.string().optional(),
  role: z.enum(["TENANT", "GUARANTOR"]),
  fullName: z.string().trim().min(2, "יש להזין שם מלא"),
  phone: z
    .string()
    .transform((s, ctx) => {
      const phone = normalizeIsraeliPhone(s);
      if (!phone) ctx.addIssue({ code: "custom", message: "מספר טלפון לא תקין" });
      return phone ?? "";
    }),
  idNumber: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s ? s : undefined))
    .refine((s) => !s || isValidIsraeliId(s), "מספר ת\"ז לא תקין"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s ? s : undefined))
    .pipe(z.email("כתובת מייל לא תקינה").optional()),
});

const TenancySchema = z
  .object({
    mode: z.enum(["new", "existing"]),
    startDate: isoDate,
    endDate: isoDate,
    monthlyRent: z.coerce
      .number({ message: "יש להזין סכום" })
      .positive("יש להזין סכום חיובי")
      .max(1_000_000, "סכום גבוה מדי"),
    paymentDay: z.coerce
      .number()
      .int()
      .min(1, "יום בין 1 ל-28")
      .max(28, "יום בין 1 ל-28"),
    hasOption: z.boolean(),
    optionMonths: z.coerce.number().int().min(1).max(60).optional(),
    isIndexLinked: z.boolean(),
    baseIndex: z.coerce.number().positive("מדד לא תקין").optional(),
    parties: z.array(PartySchema),
  })
  .superRefine((v, ctx) => {
    if (v.endDate <= v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה" });
    }
    if (!v.parties.some((p) => p.role === "TENANT")) {
      ctx.addIssue({ code: "custom", path: ["parties"], message: "יש להוסיף לפחות שוכר אחד" });
    }
    if (v.hasOption && !v.optionMonths) {
      ctx.addIssue({ code: "custom", path: ["optionMonths"], message: "יש להזין את אורך האופציה בחודשים" });
    }
  });

export type TenancyFormInput = {
  mode: "new" | "existing";
  startDate: string;
  endDate: string;
  monthlyRent: string;
  paymentDay: string;
  hasOption: boolean;
  optionMonths: string;
  isIndexLinked: boolean;
  baseIndex: string;
  parties: {
    id?: string; // set for parties that already exist (edit)
    role: "TENANT" | "GUARANTOR";
    fullName: string;
    phone: string;
    idNumber: string;
    email: string;
  }[];
};

export type TenancyFormState = {
  // Keys are field paths, e.g. "startDate" or "parties.1.phone".
  errors?: Record<string, string>;
  formError?: string;
};

type ParsedTenancy = z.infer<typeof TenancySchema>;

const blank = (s: string) => (s.trim() === "" ? undefined : s);

type ParsedParty = ParsedTenancy["parties"][number];
const withoutId = (p: ParsedParty) => {
  const { id, ...rest } = p;
  void id;
  return rest;
};

function parse(input: TenancyFormInput) {
  const parsed = TenancySchema.safeParse({
    ...input,
    optionMonths: input.hasOption ? blank(input.optionMonths) : undefined,
    baseIndex: input.isIndexLinked ? blank(input.baseIndex) : undefined,
  });
  if (parsed.success) return { data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return { errors };
}

// One live tenancy per property for any given period.
async function hasOverlap(propertyId: string, data: ParsedTenancy, excludeId?: string) {
  const overlapping = await prisma.tenancy.findFirst({
    where: {
      propertyId,
      status: { not: "CLOSED" },
      startDate: { lte: data.endDate },
      endDate: { gte: data.startDate },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
  return Boolean(overlapping);
}

function termsData(data: ParsedTenancy) {
  return {
    startDate: data.startDate,
    endDate: data.endDate,
    monthlyRent: Math.round(data.monthlyRent * 100),
    paymentDay: data.paymentDay,
    hasOption: data.hasOption,
    optionMonths: data.hasOption ? data.optionMonths : null,
    isIndexLinked: data.isIndexLinked,
    baseIndex: data.isIndexLinked && data.baseIndex ? String(data.baseIndex) : null,
  };
}

const OVERLAP_ERROR = "כבר קיימת שכירות פעילה בנכס בתאריכים האלה";

export async function createTenancy(
  propertyId: string,
  input: TenancyFormInput,
): Promise<TenancyFormState> {
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: user.id },
    select: { id: true },
  });
  if (!property) return { formError: "הנכס לא נמצא" };

  const { data, errors } = parse(input);
  if (!data) return { errors };
  if (await hasOverlap(propertyId, data)) return { formError: OVERLAP_ERROR };

  const imported = data.mode === "existing";
  await prisma.tenancy.create({
    data: {
      propertyId,
      // An existing tenancy is already signed; a new one still needs signatures.
      status: imported ? "ACTIVE" : "DRAFT",
      imported,
      ...termsData(data),
      parties: {
        create: data.parties.map(withoutId),
      },
      timeline: {
        create: { type: imported ? "tenancy.imported" : "tenancy.created", actor: "landlord" },
      },
    },
  });

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}`);
}

export async function updateTenancy(
  tenancyId: string,
  input: TenancyFormInput,
): Promise<TenancyFormState> {
  const user = await requireUser();

  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, property: { ownerId: user.id } },
    select: { id: true, propertyId: true, status: true, parties: { select: { id: true } } },
  });
  if (!tenancy) return { formError: "השכירות לא נמצאה" };
  if (tenancy.status === "CLOSED") return { formError: "אי אפשר לערוך שכירות שהסתיימה" };

  const { data, errors } = parse(input);
  if (!data) return { errors };
  if (await hasOverlap(tenancy.propertyId, data, tenancy.id)) return { formError: OVERLAP_ERROR };

  // Parties are matched by id so their signature requests stay attached.
  const existingIds = new Set(tenancy.parties.map((p) => p.id));
  const kept = data.parties.filter((p) => p.id && existingIds.has(p.id));
  const added = data.parties.filter((p) => !p.id || !existingIds.has(p.id));
  const keptIds = new Set(kept.map((p) => p.id));
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

  await prisma.$transaction([
    prisma.tenancy.update({ where: { id: tenancy.id }, data: termsData(data) }),
    prisma.party.deleteMany({ where: { tenancyId: tenancy.id, id: { in: removedIds } } }),
    ...kept.map(({ id, ...p }) =>
      prisma.party.update({
        where: { id: id! },
        data: { ...p, idNumber: p.idNumber ?? null, email: p.email ?? null },
      }),
    ),
    ...added.map((p) =>
      prisma.party.create({ data: { ...withoutId(p), tenancyId: tenancy.id } }),
    ),
    prisma.timelineEvent.create({
      data: { tenancyId: tenancy.id, type: "tenancy.updated", actor: "landlord" },
    }),
  ]);

  revalidatePath(`/properties/${tenancy.propertyId}`);
  redirect(`/properties/${tenancy.propertyId}`);
}
