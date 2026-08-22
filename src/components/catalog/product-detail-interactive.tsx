"use client";

import { useMemo, useState } from "react";

import { ProductImageCarousel } from "@/components/catalog/product-image-carousel";
import { siteConfig } from "@/config/site";
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
  const { addItem, items } = useCart();
  const [variantId, setVariantId] = useState(product.variantes[0]?.id ?? "");
  const [quantityInput, setQuantityInput] = useState("");

  const selectedVariant = useMemo(
    () => product.variantes.find((variant) => variant.id === variantId) ?? product.variantes[0] ?? null,
    [product.variantes, variantId],
  );

  const unitPrice = selectedVariant ? getDiscountedPrice(selectedVariant) : null;
  const selectedStock =
    selectedVariant ? (selectedVariant.stockDisponible ?? selectedVariant.stockVirtual) : 0;
  const productImages = product.imagenes.filter((image) => image.trim().length > 0);
  const selectedVariantImages = selectedVariant
    ? selectedVariant.imagenes.filter((image) => image.trim().length > 0)
    : [];
  const galleryImages =
    selectedVariant && selectedVariantImages.length > 0 ? selectedVariantImages : productImages;
  const currentCartQuantity = useMemo(() => {
    if (!selectedVariant) {
      return 0;
    }

    return items.reduce((acc, item) => {
      const sameVariant = item.variantId
        ? item.variantId === selectedVariant.id
        : item.slug === product.slug && item.nombreVariante === selectedVariant.nombreVariante;

      return sameVariant ? acc + item.cantidad : acc;
    }, 0);
  }, [items, product.slug, selectedVariant]);
  const remainingStock = Math.max(selectedStock - currentCartQuantity, 0);
  const quantityInputValue = normalizeQuantityInput(quantityInput, remainingStock);
  const parsedQuantity = Number.parseInt(quantityInputValue, 10);
  const quantity = Number.isNaN(parsedQuantity) ? 0 : parsedQuantity;
  const canAddToCart = Boolean(selectedVariant && remainingStock > 0 && quantity >= 1);

  function handleAdd() {
    if (!selectedVariant || unitPrice === null) {
      return;
    }
    if (remainingStock <= 0) {
      return;
    }

    if (quantity < 1) {
      return;
    }

    const safeQuantity = Math.min(quantity, remainingStock);

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      nombreProducto: product.nombre,
      nombreVariante: selectedVariant.nombreVariante,
      precioUnitario: unitPrice,
      cantidad: safeQuantity,
      stockDisponible: selectedStock,
    });

    trackEvent(analyticsEvents.addToCart, {
      currency: "COP",
      value: unitPrice * safeQuantity,
      items: [
        {
          item_id: selectedVariant.sku || selectedVariant.id,
          item_name: product.nombre,
          item_variant: selectedVariant.nombreVariante,
          item_category: product.categoria.nombre,
          price: unitPrice,
          quantity: safeQuantity,
        },
      ],
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ProductImageCarousel images={galleryImages} alt={product.nombre} />

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{product.categoria.nombre}</p>
        <h1 className="mt-2 text-4xl text-[var(--fg-strong)]">{product.nombre}</h1>
        <p className="mt-4 whitespace-pre-line text-[var(--fg-muted)]">
          {product.resumen?.trim() || product.descripcion}
        </p>

        <div className="mt-4 grid gap-2 text-sm text-[var(--fg-muted)] md:grid-cols-2">
          {product.duracionAprox ? <p>Duración aproximada: <strong>{product.duracionAprox}</strong></p> : null}
          {selectedVariant?.nombreVariante.trim() ? (
            <p>Tamaño/peso: <strong>{selectedVariant.nombreVariante}</strong></p>
          ) : null}
          {product.notasOlfativas ? <p className="md:col-span-2">Notas olfativas: <strong>{product.notasOlfativas}</strong></p> : null}
          {product.idealPara ? <p className="md:col-span-2">Ideal para: <strong>{product.idealPara}</strong></p> : null}
        </div>

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

                  if (nextVariant) {
                    trackEvent(analyticsEvents.selectItem, {
                      item_list_name: "variantes_producto",
                      items: [
                        {
                          item_id: nextVariant.sku || nextVariant.id,
                          item_name: product.nombre,
                          item_variant: nextVariant.nombreVariante,
                          item_category: product.categoria.nombre,
                          price: getDiscountedPrice(nextVariant),
                        },
                      ],
                    });
                  }
                }}
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

            {selectedVariant ? (
              <label className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
                Cantidad
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Cantidad"
                  value={quantityInputValue}
                  onChange={(event) => {
                    setQuantityInput(normalizeQuantityInput(event.target.value, remainingStock));
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
                Selecciona una variante para ver la disponibilidad.
              </p>
            )}
            {selectedVariant ? (
              <p className="text-xs text-[var(--ink-soft)]">
                Stock disponible: <strong>{selectedStock}</strong>
                {currentCartQuantity > 0 ? (
                  <>
                    {" "}
                    | En carrito: <strong>{currentCartQuantity}</strong>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAddToCart}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-hover)] disabled:bg-[var(--accent-disabled)]"
          >
            {selectedVariant && remainingStock <= 0
              ? "Sin stock disponible"
              : "Agregar al carrito"}
          </button>

          <div className="mt-4 rounded-xl border border-[var(--border)]/45 bg-[var(--surface)] p-3 text-xs text-[var(--fg-muted)]">
            <p>Envíos nacionales a toda Colombia.</p>
            <p>Atención: {siteConfig.supportHours}.</p>
          </div>
        </div>

        {product.historiaAroma ? (
          <section className="mt-6 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
            <h2 className="text-base font-semibold text-[var(--fg-strong)]">Historia del aroma</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--fg-muted)]">{product.historiaAroma}</p>
          </section>
        ) : null}
        {product.instruccionesUso ? (
          <section className="mt-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
            <h2 className="text-base font-semibold text-[var(--fg-strong)]">Uso recomendado</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--fg-muted)]">{product.instruccionesUso}</p>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)]/60 bg-[var(--surface)]/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-[var(--fg-soft)]">{product.nombre}</p>
            <p className="text-sm font-semibold text-[var(--fg-strong)]">
              {unitPrice !== null ? formatCOP(unitPrice) : "Selecciona variante"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAddToCart}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {selectedVariant && remainingStock <= 0 ? "Sin stock" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

