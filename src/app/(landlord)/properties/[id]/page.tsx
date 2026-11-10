import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatILS, TENANCY_STATUS_LABEL } from "@/lib/format";
import { BackLink, buttonPrimary, Chevron, EmptyState, Panel, Pill, SectionHeading } from "@/components/ui";
import { CurrentTenancy } from "./current-tenancy";
import { PropertyPhotos } from "./photos/property-photos";
import { TenancyFiles } from "./tenancies/[tenancyId]/files/tenancy-files";
import { TenancyIssues } from "./tenancies/[tenancyId]/issues/tenancy-issues";

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <div className="space-y-2">
      <BackLink href="/properties">כל הנכסים</BackLink>
      <Suspense fallback={<p className="text-muted">טוען נכס...</p>}>
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
        <h1 className="text-2xl font-semibold">{property.address}</h1>
        <p className="text-muted">{property.city}</p>
        {property.notes && <p className="max-w-[65ch] pt-2 text-sm">{property.notes}</p>}
      </div>

      <Suspense fallback={<p className="text-muted">טוען תמונות...</p>}>
        <PropertyPhotos propertyId={property.id} />
      </Suspense>

      {current ? (
        <CurrentTenancy
          propertyId={property.id}
          tenancy={current}
          issues={
            <Suspense fallback={<p className="text-muted">טוען תקלות...</p>}>
              <TenancyIssues tenancyId={current.id} />
            </Suspense>
          }
          files={
            <Suspense fallback={<p className="text-muted">טוען קבצים...</p>}>
              <TenancyFiles tenancyId={current.id} />
            </Suspense>
          }
        />
      ) : (
        <EmptyState
          action={
            <Link href={`/properties/${property.id}/tenancies/new`} className={buttonPrimary}>
              הוספת שכירות
            </Link>
          }
        >
          אין שכירות פעילה בנכס. אפשר להוסיף חוזה חדש או שכירות שכבר רצה.
        </EmptyState>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-title" className="space-y-3">
          <SectionHeading id="past-title">שכירויות קודמות</SectionHeading>
          <Panel>
            <ul className="divide-y divide-line">
              {past.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/properties/${property.id}/tenancies/${t.id}/handover`}
                    className="flex items-center gap-3 p-4 hover:bg-sunken"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate font-medium">
                        {t.parties.filter((p) => p.role === "TENANT").map((p) => p.fullName).join(", ") ||
                          "ללא שוכר"}
                      </p>
                      <p className="text-sm text-muted tabular-nums">
                        {formatDate(t.startDate)} – {formatDate(t.endDate)}
                      </p>
                      <p className="text-sm text-muted tabular-nums">{formatILS(t.monthlyRent)} לחודש</p>
                    </div>
                    <Pill>{TENANCY_STATUS_LABEL[t.status]}</Pill>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}
