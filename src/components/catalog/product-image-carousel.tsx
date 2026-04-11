"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  images: string[];
  alt: string;
};

export function ProductImageCarousel({ images, alt }: Props) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  function goPrevious() {
    if (!images.length) return;
    setIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1));
  }

  function goNext() {
    if (!images.length) return;
    setIndex((currentIndex) => (currentIndex === images.length - 1 ? 0 : currentIndex + 1));
  }

  if (!current) {
    return (
      <div className="aspect-square rounded-3xl border border-[var(--accent)]/30 bg-[var(--card)]" />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-[var(--accent)]/30 bg-[var(--card)]">
        <Image src={current} alt={alt} fill className="object-cover" />
        {images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
            <button
              type="button"
              onClick={goPrevious}
              className="pointer-events-auto rounded-full bg-black/55 px-3 py-2 text-xs text-white transition hover:bg-black/70"
              aria-label="Imagen anterior"
            >
              {"←"}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="pointer-events-auto rounded-full bg-black/55 px-3 py-2 text-xs text-white transition hover:bg-black/70"
              aria-label="Siguiente imagen"
            >
              {"→"}
            </button>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, imageIndex) => (
            <button
              key={`${image}-${imageIndex}`}
              type="button"
              onClick={() => setIndex(imageIndex)}
              className={`relative aspect-square overflow-hidden rounded-lg border ${
                imageIndex === index
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/45"
                  : "border-[var(--border)]"
              }`}
              aria-label={`Ver imagen ${imageIndex + 1}`}
            >
              <Image src={image} alt={`${alt} ${imageIndex + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
