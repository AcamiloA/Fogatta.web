"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { formatCOP } from "@/lib/currency";
import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";
import { useCart } from "@/modules/checkout-whatsapp/cart-context";
import { siteConfig } from "@/config/site";
import {
  readCachedShippingDestinationRates,
  writeCachedShippingDestinationRates,
} from "@/modules/shipping/client-destination-cache";
import { listShippingDestinationRatesResponseSchema } from "@/modules/shipping/contracts";
import type { ShippingDestinationRateDTO } from "@/modules/shipping/contracts";
import { calculateShippingCost } from "@/modules/shipping/pricing";

export function CartSheet() {
  const { items, subtotal, removeItem, checkoutByWhatsApp, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingDestinations, setShippingDestinations] = useState<ShippingDestinationRateDTO[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [shippingDestinationsLoaded, setShippingDestinationsLoaded] = useState(false);
  const [shippingDestinationsLoadFailed, setShippingDestinationsLoadFailed] = useState(false);
  const shippingDestinationsLoadStartedRef = useRef(false);

  const [clienteNombre, setClienteNombre] = useState("");
  const [destinoSlug, setDestinoSlug] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items],
  );
  const selectedDestination = useMemo(
    () => shippingDestinations.find((destination) => destination.destinoSlug === destinoSlug),
    [destinoSlug, shippingDestinations],
  );
  const shippingCost = selectedDestination ? calculateShippingCost(selectedDestination, totalItems) : 0;
  const totalWithShipping = subtotal + shippingCost;

  useEffect(() => {
    if (
      shippingDestinationsLoaded ||
      shippingDestinationsLoadFailed ||
      shippingDestinationsLoadStartedRef.current
    ) {
      return;
    }

    shippingDestinationsLoadStartedRef.current = true;
    const cachedDestinations = readCachedShippingDestinationRates();
    if (cachedDestinations?.length) {
      setShippingDestinations(cachedDestinations);
      setShippingDestinationsLoaded(true);
      setShippingDestinationsLoadFailed(false);
      setError(null);
      return;
    }

    let ignore = false;

    async function loadDestinations() {
      setLoadingDestinations(true);
      try {
        const response = await fetch("/api/envios/destinos", {
          headers: {
            Accept: "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("No se pudieron cargar los destinos.");
        }
        const payload = listShippingDestinationRatesResponseSchema.parse(await response.json());
        if (!ignore) {
          setShippingDestinations(payload.data);
          writeCachedShippingDestinationRates(payload.data);
          setShippingDestinationsLoaded(true);
          setShippingDestinationsLoadFailed(false);
          setError(null);
        }
      } catch {
        if (!ignore) {
          setShippingDestinationsLoaded(false);
          setShippingDestinationsLoadFailed(true);
          setError("No se pudieron cargar las ciudades de envio.");
        }
      } finally {
        if (!ignore) {
          setLoadingDestinations(false);
        }
      }
    }

    void loadDestinations();

    return () => {
      ignore = true;
    };
  }, [shippingDestinationsLoadFailed, shippingDestinationsLoaded]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    trackEvent(analyticsEvents.viewCart, {
      currency: "COP",
      value: totalWithShipping,
      items_count: totalItems,
      items: items.map((item) => ({
        item_id: item.variantId ?? item.productId ?? item.slug,
        item_name: item.nombreProducto,
        item_variant: item.nombreVariante ?? "base",
        price: item.precioUnitario,
        quantity: item.cantidad,
      })),
    });
  }, [isOpen, items, totalItems, totalWithShipping]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedDestination) {
      setLoading(false);
      setError("Selecciona una ciudad de envio.");
      return;
    }

    const result = await checkoutByWhatsApp({
      clienteNombre,
      clienteCiudad: selectedDestination.destino,
      destinoSlug: selectedDestination.destinoSlug,
      telefono,
      notas: notas.trim() ? notas.trim() : undefined,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    clearCart();
    setIsOpen(false);
    setClienteNombre("");
    setDestinoSlug("");
    setTelefono("");
    setNotas("");
  }

  function openCart() {
    setIsOpen(true);

    if (shippingDestinationsLoadFailed) {
      shippingDestinationsLoadStartedRef.current = false;
      setShippingDestinationsLoadFailed(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-contrast)] shadow-lg transition hover:bg-[var(--accent-hover)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
          <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7.2" />
        </svg>
        Carrito ({totalItems})
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 p-4">
          <button
            type="button"
            aria-label="Cerrar carrito"
            className="absolute inset-0 h-full w-full cursor-default bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            className="relative z-10 ml-auto h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--fg-strong)]">
                Carrito <BrandWordmark />
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-[var(--accent)]/45 px-2 py-1 text-sm text-[var(--fg-muted)]"
              >
                Cerrar
              </button>
            </div>

            {!items.length ? (
              <p className="rounded-xl bg-[var(--surface-2)] p-4 text-sm text-[var(--fg-muted)]">
                Tu carrito está vacío. Agrega productos desde el catálogo.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const itemSubtotal = item.cantidad * item.precioUnitario;
                  return (
                    <article
                      key={`${item.slug}:${item.nombreVariante ?? "base"}`}
                      className="rounded-xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-3"
                    >
                      <h3 className="font-medium text-[var(--fg-strong)]">{item.nombreProducto}</h3>
                      <p className="text-xs text-[var(--fg-soft)]">{item.nombreVariante ?? "Base"}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="text-sm text-[var(--fg-muted)]">
                          <p>
                            Cantidad: <strong className="text-[var(--fg-strong)]">{item.cantidad}</strong>
                          </p>
                          <p>{formatCOP(itemSubtotal)}</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => removeItem(item.slug, item.nombreVariante)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              <div className="rounded-xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-3 text-xs text-[var(--fg-muted)]">
                <p className="font-medium text-[var(--fg-strong)]">Antes de finalizar</p>
                <p>Envíos: Cobertura nacional en Colombia.</p>
                <p>El costo de envío es estimado y está sujeto a cambios</p>
                <p>Atención: {siteConfig.supportHours}.</p>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-soft)]">
                Datos para pedido por WhatsApp
              </h3>
              <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
                Nombre completo
                <input
                  required
                  placeholder="Ej: Ana Pérez"
                  value={clienteNombre}
                  onChange={(event) => setClienteNombre(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
                Ciudad de envío
                <select
                  required
                  value={destinoSlug}
                  onChange={(event) => setDestinoSlug(event.target.value)}
                  disabled={loadingDestinations || !shippingDestinationsLoaded}
                  className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                >
                  <option value="">
                    {loadingDestinations
                      ? "Cargando ciudades..."
                      : shippingDestinationsLoaded
                        ? "Selecciona una ciudad"
                        : "Ciudades no disponibles"}
                  </option>
                  {shippingDestinations.map((destination) => (
                    <option key={destination.destinoSlug} value={destination.destinoSlug}>
                      {destination.destino} - {destination.departamento}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
                Teléfono
                <input
                  required
                  placeholder="Ej: 300 123 4567"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
                Notas del pedido
                <textarea
                  placeholder="Opcional"
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <div className="space-y-2 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--fg-muted)]">
                <p className="font-medium text-[var(--fg-strong)]">Detalle del pedido</p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={`${item.slug}:${item.nombreVariante ?? "base"}:summary`}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="min-w-0 break-words">
                        {item.nombreProducto}
                        {item.nombreVariante ? ` (${item.nombreVariante})` : ""} x{" "}
                        {item.cantidad}
                      </span>
                      <strong className="shrink-0 text-[var(--fg-strong)]">
                        {formatCOP(item.precioUnitario * item.cantidad)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border)]/45 pt-2">
                  <div className="flex justify-between gap-3">
                    <span>Subtotal productos</span>
                    <strong className="text-[var(--fg-strong)]">{formatCOP(subtotal)}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>
                      Envío
                      {selectedDestination
                        ? ` a ${selectedDestination.destino}`
                        : " (selecciona ciudad)"}
                    </span>
                    <strong className="text-[var(--fg-strong)]">
                      {selectedDestination ? formatCOP(shippingCost) : "--"}
                    </strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-base text-[var(--fg-strong)]">
                    <span>Total referencia</span>
                    <strong>{formatCOP(totalWithShipping)}</strong>
                  </div>
                </div>
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading || loadingDestinations || !items.length || !selectedDestination}
                className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
              >
                {loading ? "Abriendo WhatsApp..." : "Enviar pedido a WhatsApp"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
