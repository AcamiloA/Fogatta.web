"use client";

import { useMemo, useState } from "react";

import { formatCOP } from "@/lib/currency";
import { ProductDetailDTO } from "@/modules/catalog/contracts";
import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";
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

export function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variantes[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => product.variantes.find((variant) => variant.id === variantId) ?? product.variantes[0],
    [product.variantes, variantId],
  );

  const unitPrice = selectedVariant ? getDiscountedPrice(selectedVariant) : product.precioReferencia;
  const selectedStock = selectedVariant
    ? (selectedVariant.stockDisponible ?? selectedVariant.stockVirtual)
    : 0;

  function handleAdd() {
    if (!selectedVariant) {
      return;
    }
    if (selectedStock <= 0) {
      return;
    }

    const safeQuantity = Math.min(Math.max(quantity, 1), selectedStock);

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
    <div className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] p-4">
      <div className="space-y-2">
        <label className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
          Variante
          <select
            value={selectedVariant?.id}
            onChange={(event) => setVariantId(event.target.value)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2 py-2"
          >
            {product.variantes.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.nombreVariante} - {formatCOP(getDiscountedPrice(variant))}
                {variant.descuentoActivo ? ` (${variant.descuentoPorcentaje}% OFF)` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
          Cantidad
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
            max={selectedStock > 0 ? selectedStock : undefined}
            className="w-24 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2 py-2"
          />
        </label>

        <p className="text-sm text-[var(--ink-muted)]">
          Precio por unidad:{" "}
          {selectedVariant?.descuentoActivo ? (
            <span className="inline-flex items-center gap-2">
              <strong>{formatCOP(unitPrice)}</strong>
              <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {selectedVariant.descuentoPorcentaje}% OFF
              </span>
              <span className="font-medium text-rose-600 line-through">{formatCOP(selectedVariant.precio)}</span>
            </span>
          ) : (
            <strong>{formatCOP(unitPrice)}</strong>
          )}
        </p>
        {selectedVariant ? (
          <p className="text-xs text-[var(--ink-soft)]">
            Stock disponible: <strong>{selectedStock}</strong>
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!selectedVariant || selectedStock <= 0}
        className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--accent-disabled)]"
      >
        {selectedVariant && selectedStock <= 0 ? "Sin stock disponible" : "Agregar al carrito"}
      </button>
    </div>
  );
}
