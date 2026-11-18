"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ExpenseSchema = z.object({
  name: z.string().trim().min(2, "יש לתת שם להוצאה").max(60, "השם ארוך מדי"),
  amount: z.coerce
    .number({ message: "יש להזין סכום" })
    .positive("יש להזין סכום חיובי")
    .max(1_000_000, "סכום גבוה מדי"),
  frequency: z.enum(["MONTHLY", "YEARLY"], { message: "יש לבחור תדירות" }),
});

const MAX_EXPENSES = 30;

function refresh(propertyId: string) {
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
}

export async function addExpense(
  propertyId: string,
  input: { name: string; amount: string; frequency: string },
): Promise<{ error?: string }> {
  const user = await requireUser();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: user.id },
    select: { id: true, _count: { select: { expenses: true } } },
  });
  if (!property) return { error: "הנכס לא נמצא" };
  if (property._count.expenses >= MAX_EXPENSES) return { error: `אפשר לשמור עד ${MAX_EXPENSES} הוצאות` };

  const parsed = ExpenseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.propertyExpense.create({
    data: { ...parsed.data, amount: Math.round(parsed.data.amount * 100), propertyId },
  });
  refresh(propertyId);
  return {};
}

export async function deleteExpense(expenseId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const expense = await prisma.propertyExpense.findFirst({
    where: { id: expenseId, property: { ownerId: user.id } },
    select: { id: true, propertyId: true },
  });
  if (!expense) return { error: "ההוצאה לא נמצאה" };

  await prisma.propertyExpense.delete({ where: { id: expense.id } });
  refresh(expense.propertyId);
  return {};
}
