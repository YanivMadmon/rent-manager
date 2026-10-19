import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "./property-form";

export default function PropertiesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">הנכסים שלי</h1>

      <Suspense fallback={<p className="opacity-60">טוען נכסים...</p>}>
        <PropertyList />
      </Suspense>

      <section className="space-y-4 rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">הוספת נכס</h2>
        <PropertyForm />
      </section>
    </div>
  );
}

async function PropertyList() {
  const user = await requireUser();
  const properties = await prisma.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tenancies: {
        where: { status: { in: ["ACTIVE", "ENDING", "AWAITING_SIGNATURES"] } },
        select: { id: true },
      },
    },
  });

  if (properties.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/20 p-6 text-center opacity-80 dark:border-white/20">
        עוד אין נכסים. הוסף את הדירה הראשונה שלך למטה.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="opacity-70">{properties.length} נכסים</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {properties.map((p) => (
          <li key={p.id} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
            <p className="font-semibold">{p.address}</p>
            <p className="text-sm opacity-70">{p.city}</p>
            <p className="mt-2 text-sm">
              {p.tenancies.length > 0 ? "מושכרת" : "אין שכירות פעילה"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
