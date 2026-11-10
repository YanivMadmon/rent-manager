import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Chevron, EmptyState, Panel, Pill } from "@/components/ui";
import { AddPropertyButton } from "./add-property-button";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">הנכסים שלי</h1>

      <Suspense fallback={<p className="text-muted">טוען נכסים...</p>}>
        <PropertyList />
      </Suspense>

      <AddPropertyButton />
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
      <EmptyState>עוד אין נכסים. אפשר להוסיף את הדירה הראשונה בכפתור ה־+ בפינה.</EmptyState>
    );
  }

  return (
    <Panel>
      <ul className="divide-y divide-line">
        {properties.map((p) => {
          const rented = p.tenancies.length > 0;
          return (
            <li key={p.id}>
              <Link href={`/properties/${p.id}`} className="flex items-center gap-3 p-4 hover:bg-sunken">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-medium">{p.address}</p>
                  <p className="text-sm text-muted">{p.city}</p>
                </div>
                <Pill tone={rented ? "good" : "neutral"}>{rented ? "מושכרת" : "פנויה"}</Pill>
                <Chevron />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
