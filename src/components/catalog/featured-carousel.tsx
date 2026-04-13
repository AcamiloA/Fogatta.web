"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ProductSummaryDTO } from "@/modules/catalog/contracts";
import { ProductCard } from "@/components/catalog/product-card";

type Props = {
  products: ProductSummaryDTO[];
};

export function FeaturedCarousel({ products }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const getStepSize = useCallback((container: HTMLDivElement) => {
    const firstCard = container.querySelector<HTMLElement>("[data-carousel-card]");
    const cardWidth = firstCard?.offsetWidth ?? container.clientWidth * 0.85;
    return cardWidth + 20;
  }, []);

  const scroll = useCallback(
    (direction: "prev" | "next") => {
      const container = containerRef.current;
      if (!container) return;

      const amount = getStepSize(container);
      const maxLeft = container.scrollWidth - container.clientWidth;
      if (maxLeft <= 0) return;

      const nextLeft =
        direction === "next" ? container.scrollLeft + amount : container.scrollLeft - amount;

      const targetLeft =
        direction === "next"
          ? nextLeft > maxLeft - 2
            ? 0
            : nextLeft
          : nextLeft < 2
            ? maxLeft
            : nextLeft;

      container.scrollTo({
        left: targetLeft,
        behavior: "smooth",
      });
    },
    [getStepSize],
  );

  useEffect(() => {
    if (!autoScrollEnabled || products.length < 2) return;

    const intervalId = window.setInterval(() => {
      scroll("next");
    }, 3800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoScrollEnabled, products.length, scroll]);

  function handleArrowClick(direction: "prev" | "next") {
    setAutoScrollEnabled(false);
    scroll(direction);
  }

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => handleArrowClick("prev")}
          disabled={products.length < 2}
          className="rounded-full border border-[var(--border)]/50 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)] disabled:opacity-40"
          aria-label="Desplazar productos hacia la izquierda"
        >
          {"\u2190"}
        </button>
        <button
          type="button"
          onClick={() => handleArrowClick("next")}
          disabled={products.length < 2}
          className="rounded-full border border-[var(--border)]/50 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)] disabled:opacity-40"
          aria-label="Desplazar productos hacia la derecha"
        >
          {"\u2192"}
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
