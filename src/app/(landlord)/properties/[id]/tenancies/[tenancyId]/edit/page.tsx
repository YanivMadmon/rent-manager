import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/format";
import { TenancyForm } from "../../tenancy-form";
import type { TenancyFormInput } from "../../actions";

type Props = PageProps<"/properties/[id]/tenancies/[tenancyId]/edit">;

export default function EditTenancyPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="opacity-60">טוען...</p>}>
      <EditTenancy params={params} />
    </Suspense>
  );
}

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

async function EditTenancy({ params }: Pick<Props, "params">) {
  const { id, tenancyId } = await params;
  const user = await requireUser();

  const tenancy = await prisma.tenancy.findFirst({
    where: { id: tenancyId, propertyId: id, property: { ownerId: user.id } },
    include: {
      property: { select: { id: true, address: true, city: true } },
      parties: { where: { role: { in: ["TENANT", "GUARANTOR"] } }, orderBy: { id: "asc" } },
    },
  });
  if (!tenancy || tenancy.status === "CLOSED") notFound();

  const initialValues: TenancyFormInput = {
    mode: tenancy.imported ? "existing" : "new",
    startDate: toDateInput(tenancy.startDate),
    endDate: toDateInput(tenancy.endDate),
    monthlyRent: String(tenancy.monthlyRent / 100),
    paymentDay: String(tenancy.paymentDay),
    hasOption: tenancy.hasOption,
    optionMonths: String(tenancy.optionMonths ?? 12),
    isIndexLinked: tenancy.isIndexLinked,
    baseIndex: tenancy.baseIndex?.toString() ?? "",
    parties: tenancy.parties.map((p) => ({
      id: p.id,
      role: p.role === "GUARANTOR" ? "GUARANTOR" : "TENANT",
      fullName: p.fullName,
      phone: formatPhone(p.phone),
      idNumber: p.idNumber ?? "",
      email: p.email ?? "",
    })),
  };

  const { property } = tenancy;
  return (
    <div className="space-y-6">
      <Link href={`/properties/${property.id}`} className="text-sm opacity-70 hover:underline">
        → {property.address}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">עריכת שכירות</h1>
        <p className="opacity-70">
          {property.address}, {property.city}
        </p>
      </div>
      <TenancyForm propertyId={property.id} tenancyId={tenancy.id} initialValues={initialValues} />
    </div>
  );
}
