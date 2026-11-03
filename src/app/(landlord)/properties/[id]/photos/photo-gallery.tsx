"use client";

import { useRef, useState } from "react";
import { DeletePhotoButton } from "./delete-photo-button";

const SWIPE_THRESHOLD_PX = 50;

// Thumbnail grid that opens photos over the page, so viewing never leaves it.
export function PhotoGallery({ photos }: { photos: { id: string; url: string | null }[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const viewable = photos.filter((p) => p.url);
  const index = viewable.findIndex((p) => p.id === activeId);
  const active = viewable[index];

  function open(id: string) {
    setActiveId(id);
    dialogRef.current?.showModal();
  }

  function step(delta: number) {
    if (viewable.length === 0) return;
    setActiveId(viewable[(index + delta + viewable.length) % viewable.length].id);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <li
            key={photo.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-black/5 dark:bg-white/10"
          >
            {photo.url && (
              <button
                type="button"
                onClick={() => open(photo.id)}
                aria-label="הגדלת התמונה"
                className="block h-full w-full cursor-zoom-in"
              >
                {/* Signed URLs change hourly, so next/image caching adds nothing here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="תמונת הנכס" loading="lazy" className="h-full w-full object-cover" />
              </button>
            )}
            <DeletePhotoButton photoId={photo.id} />
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="תצוגת תמונה"
        onClose={() => setActiveId(null)}
        onKeyDown={(e) => {
          // Pages are RTL, so the next photo sits on the left.
          if (e.key === "ArrowLeft") step(1);
          if (e.key === "ArrowRight") step(-1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-white backdrop:bg-black/90"
      >
        {active && (
          <div
            onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const distance = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(distance) >= SWIPE_THRESHOLD_PX) step(distance > 0 ? 1 : -1);
            }}
            className="relative flex h-full w-full items-center justify-center p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.url ?? undefined} alt="תמונת הנכס" className="max-h-full max-w-full object-contain" />

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="סגירה"
              className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-xl hover:bg-black/80"
            >
              ✕
            </button>

            {viewable.length > 1 && (
              <>
                <span className="absolute top-6 right-4 rounded-full bg-black/60 px-3 py-1 text-sm">
                  {index + 1} מתוך {viewable.length}
                </span>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="התמונה הקודמת"
                  dir="ltr"
                  className="absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl hover:bg-black/80"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="התמונה הבאה"
                  dir="ltr"
                  className="absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl hover:bg-black/80"
                >
                  ‹
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
