import type { ReactNode } from "react";
import Link from "next/link";
import type { Party, Tenancy } from "@/generated/prisma/client";
import {
  formatDate,
  formatILS,
  formatPhone,
  PARTY_ROLE_LABEL,
  TENANCY_STATUS_LABEL,
} from "@/lib/format";
import { TenancyTabs } from "./tenancy-tabs";

const DAY_MS = 24 * 60 * 60 * 1000;

// Read-only overview of the live tenancy on the property page.
export function CurrentTenancy({
  propertyId,
  tenancy,
  issues,
  files,
}: {
  propertyId: string;
  tenancy: Tenancy & { parties: Party[] };
  issues: ReactNode;
  files: ReactNode;
}) {
  // Rendered at request time (behind the session read), so "now" is safe here.
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const daysLeft = Math.round((tenancy.endDate.getTime() - today) / DAY_MS);
  const notStarted = tenancy.startDate.getTime() > today;

  const tenants = tenancy.parties.filter((p) => p.role === "TENANT");
  const guarantors = tenancy.parties.filter((p) => p.role === "GUARANTOR");

  return (
    <section className="space-y-5 rounded-2xl border-2 border-blue-600/30 bg-blue-50/40 p-5 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">השכירות הנוכחית</h2>
            <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
              {TENANCY_STATUS_LABEL[tenancy.status]}
            </span>
            <Link
              href={`/properties/${propertyId}/tenancies/${tenancy.id}/edit`}
              aria-label="עריכת השכירות"
              title="עריכת השכירות"
              className="rounded-md p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </Link>
          </div>
          <p className="text-sm opacity-70">
            {tenancy.imported ? "שכירות קיימת שנוספה למעקב" : "שכירות חדשה"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/properties/${propertyId}/tenancies/${tenancy.id}/payments`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            תשלומים וצ׳קים
          </Link>
          <Link
            href={`/properties/${propertyId}/tenancies/${tenancy.id}/timeline`}
            className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
          >
            ציר זמן
          </Link>
          <Link
            href={`/properties/${propertyId}/tenancies/${tenancy.id}/handover`}
            className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
          >
            {tenancy.status === "ENDING" ? "המשך המסירה" : "תהליך מסירה"}
          </Link>
        </div>
      </div>

      <TenancyTabs
        tabs={[
          {
            id: "details",
            label: "פרטים",
            content: (
              <div className="space-y-5">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="שכר דירה" value={formatILS(tenancy.monthlyRent)} hint="לחודש" />
                  <Stat label="יום תשלום" value={`${tenancy.paymentDay} בחודש`} />
                  <Stat label="תקופה" value={`${formatDate(tenancy.startDate)} – ${formatDate(tenancy.endDate)}`} />
                  <Stat
                    label={notStarted ? "מתחילה בעוד" : "נותרו"}
                    value={
                      notStarted
                        ? `${Math.round((tenancy.startDate.getTime() - today) / DAY_MS)} ימים`
                        : daysLeft >= 0
                          ? `${daysLeft} ימים`
                          : "הסתיימה"
                    }
                    warn={!notStarted && daysLeft <= 90}
                  />
                </dl>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[...tenants, ...guarantors].map((p) => (
                    <PartyCard key={p.id} party={p} />
                  ))}
                </div>
              </div>
            ),
          },
          { id: "issues", label: "תקלות", content: issues },
          { id: "files", label: "קבצים", content: files },
        ]}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className={`font-semibold ${warn ? "text-amber-700 dark:text-amber-400" : ""}`}>{value}</dd>
      {hint && <dd className="text-xs opacity-60">{hint}</dd>}
    </div>
  );
}

function PartyCard({ party }: { party: Party }) {
  const waNumber = party.phone.replace(/^\+/, "");
  return (
    <div className="space-y-2 rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-transparent">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{party.fullName}</p>
        <span className="text-xs opacity-60">{PARTY_ROLE_LABEL[party.role]}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a href={`tel:${party.phone}`} dir="ltr" className="hover:underline">
          {formatPhone(party.phone)}
        </a>
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-700 hover:underline dark:text-green-400"
        >
          וואטסאפ
        </a>
      </div>
      {(party.idNumber || party.email) && (
        <p className="text-sm opacity-70">
          {party.idNumber && <span>ת״ז {party.idNumber}</span>}
          {party.idNumber && party.email && " · "}
          {party.email && <span dir="ltr">{party.email}</span>}
        </p>
      )}
    </div>
  );
}
