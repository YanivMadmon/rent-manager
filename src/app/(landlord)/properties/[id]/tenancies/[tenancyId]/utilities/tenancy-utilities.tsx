import { FileLink } from "@/components/file-link";
import { PreparedMessage } from "@/components/prepared-message";
import { buttonPrimary, Panel, Pill } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { UTILITY_LABEL, UTILITY_STATE, UTILITY_TYPES, utilityState } from "@/lib/utilities";
import { signProofUrls } from "@/lib/utility-proofs";
import { createUtilityLink } from "./actions";
import { UtilityActions } from "./utility-actions";

// Caller must have verified that the tenancy belongs to the current landlord.
export async function TenancyUtilities({ tenancyId }: { tenancyId: string }) {
  const tenancy = await prisma.tenancy.findUniqueOrThrow({
    where: { id: tenancyId },
    include: { utilityTransfers: true },
  });
  const rows = UTILITY_TYPES.map((type) => {
    const row = tenancy.utilityTransfers.find((u) => u.type === type);
    return { type, row, state: utilityState(row) };
  });
  const urls = await signProofUrls(rows.flatMap((r) => r.row?.proofPath ?? []));
  const open = rows.filter((r) => r.state === "pending" || r.state === "uploaded").length;
  const closed = tenancy.status === "CLOSED";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {open === 0 ? "כל החשבונות טופלו." : `${open} חשבונות עוד לא הועברו לשם השוכר.`}
        </p>
        {!closed && open > 0 && (
          <PreparedMessage
            prepare={createUtilityLink.bind(null, tenancyId)}
            label="בקשת אישורים מהשוכר"
            className={buttonPrimary}
          />
        )}
      </div>

      <Panel>
        <ul className="divide-y divide-line">
          {rows.map(({ type, row, state }) => {
            const url = row?.proofPath ? urls.get(row.proofPath) : undefined;
            return (
              <li key={type} className="space-y-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{UTILITY_LABEL[type]}</p>
                  <Pill tone={UTILITY_STATE[state].tone}>{UTILITY_STATE[state].label}</Pill>
                </div>
                {row?.uploadedAt && state !== "skipped" && (
                  <p className="text-sm text-muted">השוכר העלה אישור ב-{formatDate(row.uploadedAt)}</p>
                )}
                {url && state !== "skipped" && (
                  <FileLink url={url} isPdf={row!.proofPath!.endsWith(".pdf")} label="צפייה באישור" />
                )}
                {!closed && <UtilityActions tenancyId={tenancyId} type={type} state={state} />}
              </li>
            );
          })}
        </ul>
      </Panel>
    </section>
  );
}
