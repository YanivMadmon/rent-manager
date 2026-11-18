import type { DocumentCategory } from "@/generated/prisma/enums";
import { formatDate, DOCUMENT_CATEGORY_LABEL } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createAdminClient, FILES_BUCKET } from "@/lib/supabase/admin";
import { AddFileButton } from "./add-file-button";
import { DeleteFileButton } from "./delete-file-button";

const CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABEL) as DocumentCategory[];

// Caller must have verified that the tenancy belongs to the current landlord.
export async function TenancyFiles({ tenancyId }: { tenancyId: string }) {
  const documents = await prisma.document.findMany({
    where: { tenancyId },
    orderBy: { createdAt: "asc" },
  });

  // Files are private: open them through signed URLs valid for an hour. Word
  // files download under their own name; PDFs and images open in the browser.
  const admin = createAdminClient().storage.from(FILES_BUCKET);
  const urls = new Map<string, string>();
  const isInline = (d: { mimeType: string }) => d.mimeType === "application/pdf" || d.mimeType.startsWith("image/");
  const inline = documents.filter(isInline);
  await Promise.all([
    // PDFs and images: one request for all of them.
    inline.length > 0 &&
      admin.createSignedUrls(inline.map((d) => d.path), 60 * 60).then(({ data }) => {
        const byPath = new Map(data?.map((u) => [u.path, u.signedUrl]));
        inline.forEach((d) => byPath.get(d.path) && urls.set(d.id, byPath.get(d.path)!));
      }),
    // Word files each need their own URL so they download under their name.
    ...documents
      .filter((d) => !isInline(d))
      .map(async (d) => {
        const { data } = await admin.createSignedUrl(d.path, 60 * 60, { download: d.name });
        if (data) urls.set(d.id, data.signedUrl);
      }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddFileButton tenancyId={tenancyId} />
      </div>

      {documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">
          עוד אין קבצים לשכירות. אפשר להעלות את החוזה, ביטחונות וכל מסמך אחר.
        </p>
      ) : (
        CATEGORIES.map((category) => {
          const inCategory = documents.filter((d) => d.category === category);
          if (inCategory.length === 0) return null;
          return (
            <section key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">{DOCUMENT_CATEGORY_LABEL[category]}</h3>
              <ul className="space-y-2">
                {inCategory.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"
                  >
                    <div className="min-w-0">
                      {urls.get(d.id) ? (
                        <a
                          href={urls.get(d.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate font-medium text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {d.name}
                        </a>
                      ) : (
                        <p className="truncate font-medium">{d.name}</p>
                      )}
                      <p className="text-xs text-muted">{formatDate(d.createdAt)}</p>
                    </div>
                    <DeleteFileButton documentId={d.id} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
