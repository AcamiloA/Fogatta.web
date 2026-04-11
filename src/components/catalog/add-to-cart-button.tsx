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

export function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(product.variantes[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => product.variantes.find((variant) => variant.id === variantId) ?? product.variantes[0],
    [product.variantes, variantId],
  );

  const unitPrice = selectedVariant?.precio ?? product.precioReferencia;

  function handleAdd() {
    if (!selectedVariant) {
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      nombreProducto: product.nombre,
      nombreVariante: selectedVariant.nombreVariante,
      precioUnitario: unitPrice,
      cantidad: quantity,
    });

    trackEvent(analyticsEvents.viewProduct, {
      item_name: product.nombre,
      item_variant: selectedVariant.nombreVariante,
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
                {variant.nombreVariante} - {formatCOP(variant.precio)}
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
            className="w-24 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2 py-2"
          />
        </label>

        <p className="text-sm text-[var(--ink-muted)]">
          Precio por unidad: <strong>{formatCOP(unitPrice)}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-hover)]"
      >
        Agregar al carrito
      </button>
    </div>
  );
}
