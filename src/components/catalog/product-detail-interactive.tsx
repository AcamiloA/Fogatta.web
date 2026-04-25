"use client";

import { useMemo, useState } from "react";

import { ProductImageCarousel } from "@/components/catalog/product-image-carousel";
import { formatCOP } from "@/lib/currency";
import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";
import { ProductDetailDTO } from "@/modules/catalog/contracts";
import { useCart } from "@/modules/checkout-whatsapp/cart-context";

type Props = {
  product: ProductDetailDTO;
};

function getDiscountedPrice(variant: ProductDetailDTO["variantes"][number]) {
  if (!variant.descuentoActivo) {
    return variant.precio;
  }
  const safePercentage = Math.min(Math.max(variant.descuentoPorcentaje, 0), 100);
  return Math.max(Math.round((variant.precio * (100 - safePercentage)) / 100), 0);
}

function normalizeQuantityInput(rawValue: string, maxStock: number) {
  if (!rawValue) {
    return "";
  }

  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (maxStock <= 0) {
    return "";
  }

  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return String(Math.min(parsed, maxStock));
}

export function ProductDetailInteractive({ product }: Props) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState("");
  const [quantityInput, setQuantityInput] = useState("");

  const selectedVariant = useMemo(
    () => product.variantes.find((variant) => variant.id === variantId) ?? null,
    [product.variantes, variantId],
  );

  const unitPrice = selectedVariant ? getDiscountedPrice(selectedVariant) : null;
  const selectedStock =
    selectedVariant ? (selectedVariant.stockDisponible ?? selectedVariant.stockVirtual) : 0;
  const galleryImages = selectedVariant ? selectedVariant.imagenes : product.imagenes;
  const parsedQuantity = Number.parseInt(quantityInput, 10);
  const quantity = Number.isNaN(parsedQuantity) ? 0 : parsedQuantity;

  function handleAdd() {
    if (!selectedVariant || unitPrice === null) {
      return;
    }
    if (selectedStock <= 0) {
      return;
    }

    if (quantity < 1) {
      return;
    }

    const safeQuantity = Math.min(quantity, selectedStock);

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      nombreProducto: product.nombre,
      nombreVariante: selectedVariant.nombreVariante,
      precioUnitario: unitPrice,
      cantidad: safeQuantity,
    });

    trackEvent(analyticsEvents.addToCart, {
      item_name: product.nombre,
      item_variant: selectedVariant.nombreVariante,
      value: unitPrice,
      quantity: safeQuantity,
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ProductImageCarousel images={galleryImages} alt={product.nombre} />

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{product.categoria.nombre}</p>
        <h1 className="mt-2 text-4xl text-[var(--fg-strong)]">{product.nombre}</h1>
        <p className="mt-4 text-[var(--fg-muted)]">{product.descripcion}</p>

        <div className="mt-6 rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] p-4">
          <div className="space-y-2">
            <label className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
              Variante
              <select
                value={variantId}
                onChange={(event) => {
                  const nextVariantId = event.target.value;
                  const nextVariant =
                    product.variantes.find((variant) => variant.id === nextVariantId) ?? null;
                  const nextStock = nextVariant
                    ? (nextVariant.stockDisponible ?? nextVariant.stockVirtual)
                    : 0;
                  setVariantId(nextVariantId);
                  setQuantityInput((current) => normalizeQuantityInput(current, nextStock));
                }}
                className="rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2 py-2"
              >
                <option value="">Seleccione una variante</option>
                {product.variantes.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.nombreVariante} - {formatCOP(getDiscountedPrice(variant))}
                    {variant.descuentoActivo ? ` (${variant.descuentoPorcentaje}% OFF)` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedVariant ? (
              <label className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
                Cantidad
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Cantidad"
                  value={quantityInput}
                  onChange={(event) => {
                    setQuantityInput(normalizeQuantityInput(event.target.value, selectedStock));
                  }}
                  className="w-24 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2 py-2"
                />
              </label>
            ) : null}

            {selectedVariant && unitPrice !== null ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Precio por unidad:{" "}
                {selectedVariant.descuentoActivo ? (
                  <span className="inline-flex items-center gap-2">
                    <strong>{formatCOP(unitPrice)}</strong>
                    <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      {selectedVariant.descuentoPorcentaje}% OFF
                    </span>
                    <span className="font-medium text-rose-600 line-through">
                      {formatCOP(selectedVariant.precio)}
                    </span>
                  </span>
                ) : (
                  <strong>{formatCOP(unitPrice)}</strong>
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">
                Selecciona una variante para ver precio y disponibilidad de imagenes.
              </p>
            )}
            {selectedVariant ? (
              <p className="text-xs text-[var(--ink-soft)]">
                Stock disponible: <strong>{selectedStock}</strong>
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedVariant || selectedStock <= 0 || quantity < 1}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--accent-disabled)]"
          >
            {selectedVariant && selectedStock <= 0 ? "Sin stock disponible" : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
