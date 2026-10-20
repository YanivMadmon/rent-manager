import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatILS,
  TENANCY_STATUS_LABEL,
} from "@/lib/format";

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/properties" className="text-sm opacity-70 hover:underline">
        → כל הנכסים
      </Link>
      <Suspense fallback={<p className="opacity-60">טוען נכס...</p>}>
        <PropertyDetails params={params} />
      </Suspense>
    </div>
  );
}

async function PropertyDetails({ params }: Pick<PageProps<"/properties/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();

  const property = await prisma.property.findFirst({
    where: { id, ownerId: user.id },
    include: {
      tenancies: {
        orderBy: { startDate: "desc" },
        include: { parties: { where: { role: "TENANT" }, select: { fullName: true } } },
      },
    },
  });
  if (!property) notFound();

  const current = property.tenancies.find((t) => t.status !== "CLOSED");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{property.address}</h1>
        <p className="opacity-70">{property.city}</p>
        {property.notes && <p className="pt-2 text-sm">{property.notes}</p>}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">שכירויות</h2>
          {!current && (
            <Link
              href={`/properties/${property.id}/tenancies/new`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              שכירות חדשה
            </Link>
          )}
        </div>

        {property.tenancies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/20 p-6 text-center opacity-80 dark:border-white/20">
            אין עדיין שכירויות לנכס הזה. אפשר ליצור שכירות חדשה או להוסיף שכירות שכבר רצה.
          </p>
        ) : (
          <ul className="space-y-3">
            {property.tenancies.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="space-y-1">
                  <p className="font-semibold">
                    {t.parties.map((p) => p.fullName).join(", ") || "ללא שוכר"}
                  </p>
                  <p className="text-sm opacity-70">
                    {formatDate(t.startDate)} – {formatDate(t.endDate)} · {formatILS(t.monthlyRent)} לחודש
                    {t.isIndexLinked && " · צמוד למדד"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium dark:bg-white/10">
                    {TENANCY_STATUS_LABEL[t.status]}
                  </span>
                  {t.status !== "CLOSED" && (
                    <Link
                      href={`/properties/${property.id}/tenancies/${t.id}/edit`}
                      className="rounded-lg border border-black/15 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                    >
                      עריכה
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
