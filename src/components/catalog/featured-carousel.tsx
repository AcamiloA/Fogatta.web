"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ProductSummaryDTO } from "@/modules/catalog/contracts";
import { ProductCard } from "@/components/catalog/product-card";

type Props = {
  products: ProductSummaryDTO[];
};

export function FeaturedCarousel({ products }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const updateButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxLeft = container.scrollWidth - container.clientWidth;
    setCanScrollPrev(container.scrollLeft > 8);
    setCanScrollNext(container.scrollLeft < maxLeft - 8);
  }, []);

  useEffect(() => {
    updateButtons();

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);

    return () => {
      container.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons]);

  function scroll(direction: "prev" | "next") {
    const container = containerRef.current;
    if (!container) return;

    const firstCard = container.querySelector<HTMLElement>("[data-carousel-card]");
    const cardWidth = firstCard?.offsetWidth ?? container.clientWidth * 0.85;
    const amount = cardWidth + 20;

    container.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          className="rounded-full border border-[var(--border)]/50 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)] disabled:opacity-40"
          aria-label="Desplazar productos hacia la izquierda"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          className="rounded-full border border-[var(--border)]/50 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)] disabled:opacity-40"
          aria-label="Desplazar productos hacia la derecha"
        >
          →
        </button>
      </div>

      <div
        ref={containerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-carousel-card
            className="w-[85%] shrink-0 snap-start sm:w-[60%] lg:w-[33.333%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
