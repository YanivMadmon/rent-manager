import type { MagicLink } from "@/generated/prisma/client";
import { Pill } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { UTILITY_LABEL, UTILITY_STATE, UTILITY_TYPES, utilityState } from "@/lib/utilities";
import { LinkMessage } from "./link-message";
import { UtilityUpload } from "./utility-form";

export async function UtilityReport({ link, token }: { link: MagicLink; token: string }) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: link.tenancyId },
    include: { property: { select: { address: true, city: true } }, utilityTransfers: true },
  });
  if (!tenancy || tenancy.status === "CLOSED") {
    return <LinkMessage title="הקישור לא תקף" body="השכירות הסתיימה." />;
  }

  const rows = UTILITY_TYPES.map((type) => {
    const row = tenancy.utilityTransfers.find((u) => u.type === type);
    return { type, state: utilityState(row) };
  }).filter((r) => r.state !== "skipped");

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">העברת חשבונות</h1>
        <p className="text-muted">
          {tenancy.property.address}, {tenancy.property.city}
        </p>
      </div>
      <p className="text-sm text-muted">
        אחרי שהעברת חשבון לשמך, מעלים כאן צילום מסך או מסמך שמאשר את ההעברה.
      </p>

      <ul className="space-y-3">
        {rows.map(({ type, state }) => (
          <li key={type} className="space-y-3 rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{UTILITY_LABEL[type]}</p>
              <Pill tone={UTILITY_STATE[state].tone}>
                {state === "uploaded" ? "האישור התקבל" : UTILITY_STATE[state].label}
              </Pill>
            </div>
            {state !== "confirmed" && (
              <UtilityUpload token={token} type={type} replacing={state === "uploaded"} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
