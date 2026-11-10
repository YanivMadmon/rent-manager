import type { ReactNode } from "react";
import Link from "next/link";
import type { Party, Tenancy } from "@/generated/prisma/client";
import { buttonPrimary, buttonSecondary, Panel, Pill, type Tone } from "@/components/ui";
import {
  formatDate,
  formatILS,
  formatPhone,
  PARTY_ROLE_LABEL,
  TENANCY_STATUS_LABEL,
} from "@/lib/format";
import { HistoryIcon, KeyIcon, PencilIcon, PhoneIcon, WalletIcon, WhatsAppIcon } from "@/components/icons";
import { TenancyTabs } from "./tenancy-tabs";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_TONE: Record<Tenancy["status"], Tone> = {
  DRAFT: "neutral",
  AWAITING_SIGNATURES: "info",
  ACTIVE: "good",
  ENDING: "warn",
  CLOSED: "neutral",
};

// Overview of the live tenancy on the property page: the money and the dates
// first, then the three things a landlord opens from here.
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
  const start = tenancy.startDate.getTime();
  const end = tenancy.endDate.getTime();
  const daysLeft = Math.round((end - today) / DAY_MS);
  const notStarted = start > today;
  const elapsed = Math.min(1, Math.max(0, (today - start) / Math.max(DAY_MS, end - start)));

  const tenants = tenancy.parties.filter((p) => p.role === "TENANT");
  const guarantors = tenancy.parties.filter((p) => p.role === "GUARANTOR");
  const base = `/properties/${propertyId}/tenancies/${tenancy.id}`;

  const remaining = notStarted
    ? `מתחילה בעוד ${Math.round((start - today) / DAY_MS)} ימים`
    : daysLeft > 0
      ? `נותרו ${daysLeft} ימים`
      : daysLeft === 0
        ? "מסתיימת היום"
        : "תקופת החוזה הסתיימה";
  const endingSoon = !notStarted && daysLeft <= 90;

  return (
    <section aria-labelledby="tenancy-title" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 id="tenancy-title" className="text-lg font-semibold">
            השכירות הנוכחית
          </h2>
          <Pill tone={STATUS_TONE[tenancy.status]}>{TENANCY_STATUS_LABEL[tenancy.status]}</Pill>
        </div>
        <Link
          href={`${base}/edit`}
          aria-label="עריכת השכירות"
          title="עריכת השכירות"
          className="-me-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
        >
          <PencilIcon />
        </Link>
      </div>

      <Panel>
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {formatILS(tenancy.monthlyRent)}
              <span className="ms-1 text-base font-normal text-muted">לחודש</span>
            </p>
            <p className="text-sm text-muted">תשלום ב־{tenancy.paymentDay} בכל חודש</p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <p className="tabular-nums">
                {formatDate(tenancy.startDate)} – {formatDate(tenancy.endDate)}
              </p>
              <p className={endingSoon ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted"}>
                {remaining}
              </p>
            </div>
            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sunken">
              <div
                className={`h-full rounded-full ${endingSoon ? "bg-amber-500" : "bg-ink/30"}`}
                style={{ width: `${elapsed * 100}%` }}
              />
            </div>
            {tenancy.imported && <p className="text-xs text-muted">שכירות קיימת שנוספה למעקב באמצע התקופה</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-line bg-canvas/50 p-3">
          <Link href={`${base}/payments`} className={`${buttonPrimary} col-span-2`}>
            <WalletIcon />
            תשלומים וצ׳קים
          </Link>
          <Link href={`${base}/timeline`} className={buttonSecondary}>
            <HistoryIcon className="h-4 w-4 text-muted" />
            ציר זמן
          </Link>
          <Link href={`${base}/handover`} className={buttonSecondary}>
            <KeyIcon className="h-4 w-4 text-muted" />
            {tenancy.status === "ENDING" ? "המשך המסירה" : "תהליך מסירה"}
          </Link>
        </div>
      </Panel>

      <TenancyTabs
        tabs={[
          {
            id: "people",
            label: "שוכרים וערבים",
            content:
              tenants.length + guarantors.length === 0 ? (
                <p className="text-sm text-muted">לא נוספו שוכרים לשכירות.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...tenants, ...guarantors].map((p) => (
                    <PartyCard key={p.id} party={p} />
                  ))}
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

function PartyCard({ party }: { party: Party }) {
  const waNumber = party.phone.replace(/^\+/, "");
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{party.fullName}</p>
        <span className="text-sm text-muted">{PARTY_ROLE_LABEL[party.role]}</span>
      </div>
      <div className="flex gap-2">
        <a
          href={`tel:${party.phone}`}
          className={`${buttonSecondary} flex-1`}
          aria-label={`התקשרות אל ${party.fullName}, ${formatPhone(party.phone)}`}
        >
          <PhoneIcon className="h-4 w-4 text-muted" />
          <span dir="ltr" className="tabular-nums">
            {formatPhone(party.phone)}
          </span>
        </a>
        <a
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`וואטסאפ אל ${party.fullName}`}
          title="וואטסאפ"
          className={`${buttonSecondary} w-11 shrink-0 px-0`}
        >
          <WhatsAppIcon className="h-6 w-6 text-[#1c9a4e] dark:text-[#25d366]" />
        </a>
      </div>
      {(party.idNumber || party.email) && (
        <div className="space-y-0.5 text-sm text-muted">
          {party.idNumber && <p>ת״ז {party.idNumber}</p>}
          {party.email && (
            <p dir="ltr" className="truncate text-end">
              {party.email}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
