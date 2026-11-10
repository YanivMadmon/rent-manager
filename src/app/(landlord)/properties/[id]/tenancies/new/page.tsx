import { Suspense } from "react";
import { BackLink } from "@/components/ui";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TenancyForm } from "../tenancy-form";

export default function NewTenancyPage({ params }: PageProps<"/properties/[id]/tenancies/new">) {
  return (
    <Suspense fallback={<p className="text-muted">טוען...</p>}>
      <NewTenancy params={params} />
    </Suspense>
  );
}

async function NewTenancy({ params }: Pick<PageProps<"/properties/[id]/tenancies/new">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const property = await prisma.property.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, address: true, city: true },
  });
  if (!property) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/properties/${property.id}`}>{property.address}</BackLink>
      <div>
        <h1 className="text-2xl font-semibold">שכירות חדשה</h1>
        <p className="text-muted">
          {property.address}, {property.city}
        </p>
      </div>
      <TenancyForm propertyId={property.id} />
    </div>
  );
}
