"use client";

import { useRef, useState, useTransition } from "react";
import { CloseIcon } from "@/components/icons";
import { buttonSecondary, fieldClass } from "@/components/ui";
import { FEATURE_LABEL, type PropertyDetails, detailsSummary } from "@/lib/property-details";
import { saveListingText } from "../../actions";

const YAD2_PUBLISH_URL = "https://www.yad2.co.il/publish";

type Listing = PropertyDetails & {
  id: string;
  address: string;
  city: string;
  notes: string | null;
  listingText: string | null;
};

// Yad2 has no API for posting, and one site can't fill another site's form.
// So the ad is prepared here: text to paste and the photos to upload, then
// Yad2's own publish page opens in a new tab.
export function Yad2Button({
  listing,
  rent,
  photos,
}: {
  listing: Listing;
  rent: number | null;
  photos: { url: string; name: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The saved wording wins; otherwise start from the property's details.
  const [text, setText] = useState(listing.listingText ?? adText(listing, rent));
  const [saved, setSaved] = useState(listing.listingText ?? "");
  const [saveError, setSaveError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [copied, setCopied] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string>();
  const dirty = text.trim() !== saved.trim();

  function save() {
    setSaveError(undefined);
    startSaving(async () => {
      const result = await saveListingText(listing.id, text);
      if (result.error) setSaveError(result.error);
      else setSaved(text);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Phones can hand the photos to the share sheet ("save images"); elsewhere
  // each photo downloads as a file.
  async function savePhotos() {
    setPhotoStatus("מכין את התמונות...");
    try {
      const files = await Promise.all(
        photos.map(async (p) => {
          const blob = await (await fetch(p.url)).blob();
          return new File([blob], p.name, { type: blob.type });
        }),
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
      } else {
        for (const file of files) {
          const href = URL.createObjectURL(file);
          const a = Object.assign(document.createElement("a"), { href, download: file.name });
          a.click();
          URL.revokeObjectURL(href);
        }
      }
      setPhotoStatus(undefined);
    } catch (e) {
      // Closing the share sheet isn't an error worth showing.
      setPhotoStatus(e instanceof DOMException && e.name === "AbortError" ? undefined : "לא הצלחנו להכין את התמונות. נסו שוב.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="פרסום ביד2"
        title="פרסום ביד2"
        className={buttonSecondary}
      >
        <Yad2Mark />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="yad2-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 id="yad2-title" className="flex items-center gap-2 text-lg font-semibold">
              <Yad2Mark />
              פרסום מודעה ביד2
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="סגירה"
              className="-me-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="text-sm text-muted">
            יד2 לא מאפשרת למלא את המודעה מבחוץ, אז הכנו לך הכל: מעתיקים את הטקסט, שומרים את התמונות, ומדביקים
            ומעלים בטופס של יד2.
          </p>

          <ol className="space-y-5">
            <li className="space-y-2">
              <h3 className="font-medium">1. הטקסט למודעה</h3>
              <label className="block space-y-1 text-sm">
                <span className="text-muted">אפשר לערוך, למשל לשנות מחיר או להוסיף פרטים. הטקסט נשמר לפעם הבאה.</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  maxLength={4000}
                  className={`${fieldClass} py-2 leading-relaxed`}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copy} className={buttonSecondary}>
                  {copied ? "הועתק" : "העתקת הטקסט"}
                </button>
                <button type="button" onClick={save} disabled={saving || !dirty} className={buttonSecondary}>
                  {saving ? "שומר..." : dirty ? "שמירת הטקסט" : "נשמר"}
                </button>
                <button
                  type="button"
                  onClick={() => setText(adText(listing, rent))}
                  className="min-h-11 rounded-lg px-2 text-sm text-muted hover:bg-sunken hover:text-ink"
                >
                  יצירה מחדש מפרטי הנכס
                </button>
              </div>
              {saveError && <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>}
            </li>

            <li className="space-y-2">
              <h3 className="font-medium">2. התמונות</h3>
              {photos.length === 0 ? (
                <p className="text-sm text-muted">עוד אין תמונות לנכס. כדאי להוסיף לפני הפרסום.</p>
              ) : (
                <>
                  <button type="button" onClick={savePhotos} className={buttonSecondary}>
                    {photos.length === 1 ? "שמירת התמונה" : `שמירת ${photos.length} התמונות`}
                  </button>
                  {photoStatus && <p className="text-sm text-muted">{photoStatus}</p>}
                </>
              )}
            </li>

            <li className="space-y-2">
              <h3 className="font-medium">3. פותחים את טופס הפרסום ביד2</h3>
              <p className="text-sm text-muted">
                בוחרים &quot;נדל״ן&quot; ואז &quot;השכרה&quot;, מדביקים את הטקסט בתיאור הנכס ומעלים את התמונות ששמרת.
              </p>
              <a
                href={YAD2_PUBLISH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ff7100] px-5 text-sm font-medium text-white hover:bg-[#e66600]"
              >
                <Yad2Mark inverted />
                מעבר לפרסום ביד2
              </a>
              <p className="text-xs text-muted">נפתח בלשונית חדשה. צריך להיות מחובר לחשבון ביד2.</p>
            </li>
          </ol>
        </div>
      </dialog>
    </>
  );
}

function adText(l: Listing, rent: number | null) {
  const summary = detailsSummary(l);
  const lines = [
    `להשכרה${summary ? `: ${summary}` : ""}`,
    `${l.address}, ${l.city}`,
    l.features.length > 0 && l.features.map((f) => FEATURE_LABEL[f]).join(", "),
    rent !== null && rent > 0 && `${(rent / 100).toLocaleString("he-IL")} ₪ לחודש`,
    l.notes,
  ];
  return lines.filter(Boolean).join("\n");
}

// A small orange "יד2" badge so the button reads at a glance. It's our own
// lettering in Yad2's orange, not their logo file.
function Yad2Mark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-6 shrink-0 items-center rounded-md px-1.5 text-xs leading-none font-bold ${
        inverted ? "bg-white text-[#ff7100]" : "bg-[#ff7100] text-white"
      }`}
    >
      יד2
    </span>
  );
}
