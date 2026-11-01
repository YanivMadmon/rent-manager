import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatILS, TENANCY_STATUS_LABEL } from "@/lib/format";
import { CurrentTenancy } from "./current-tenancy";
import { PropertyPhotos } from "./photos/property-photos";

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
        include: { parties: { orderBy: { id: "asc" } } },
      },
    },
  });
  if (!property) notFound();

  const current = property.tenancies.find((t) => t.status !== "CLOSED");
  const past = property.tenancies.filter((t) => t !== current);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{property.address}</h1>
        <p className="opacity-70">{property.city}</p>
        {property.notes && <p className="pt-2 text-sm">{property.notes}</p>}
      </div>

      <Suspense fallback={<p className="opacity-60">טוען תמונות...</p>}>
        <PropertyPhotos propertyId={property.id} />
      </Suspense>

      {current ? (
        <CurrentTenancy propertyId={property.id} tenancy={current} />
      ) : (
        <section className="space-y-3 rounded-2xl border border-dashed border-black/20 p-6 text-center dark:border-white/20">
          <p className="opacity-80">אין שכירות פעילה בנכס.</p>
          <Link
            href={`/properties/${property.id}/tenancies/new`}
            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            שכירות חדשה
          </Link>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">שכירויות קודמות</h2>
          <ul className="space-y-2">
            {past.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="space-y-1">
                  <p className="font-semibold">
                    {t.parties.filter((p) => p.role === "TENANT").map((p) => p.fullName).join(", ") ||
                      "ללא שוכר"}
                  </p>
                  <p className="text-sm opacity-70">
                    {formatDate(t.startDate)} – {formatDate(t.endDate)} · {formatILS(t.monthlyRent)} לחודש
                  </p>
                </div>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium dark:bg-white/10">
                  {TENANCY_STATUS_LABEL[t.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
