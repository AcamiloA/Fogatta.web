"use client";

import { FormEvent, useMemo, useState } from "react";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { formatCOP } from "@/lib/currency";
import { useCart } from "@/modules/checkout-whatsapp/cart-context";

export function CartSheet() {
  const { items, subtotal, setQuantity, removeItem, checkoutByWhatsApp, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteCiudad, setClienteCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await checkoutByWhatsApp({
      clienteNombre,
      clienteCiudad,
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
    setClienteCiudad("");
    setTelefono("");
    setNotas("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-contrast)] shadow-lg transition hover:bg-[var(--accent-hover)]"
      >
        Pedido ({totalItems})
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="ml-auto h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--surface)] p-5 shadow-2xl">
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
                      <p className="text-sm text-[var(--fg-muted)]">{formatCOP(itemSubtotal)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(event) =>
                            setQuantity(
                              item.slug,
                              item.nombreVariante,
                              Number(event.target.value),
                            )
                          }
                          className="w-20 rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-1 text-sm text-[var(--fg)]"
                        />
                        <button
                          type="button"
                          className="text-xs text-rose-300 hover:text-rose-200"
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-soft)]">
                Datos para pedido por WhatsApp
              </h3>
              <input
                required
                placeholder="Nombre completo"
                value={clienteNombre}
                onChange={(event) => setClienteNombre(event.target.value)}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <input
                required
                placeholder="Ciudad"
                value={clienteCiudad}
                onChange={(event) => setClienteCiudad(event.target.value)}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <input
                required
                placeholder="Teléfono"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <textarea
                placeholder="Notas (opcional)"
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                className="min-h-20 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <div className="rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--fg-muted)]">
                Subtotal referencia: <strong>{formatCOP(subtotal)}</strong>
              </div>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading || !items.length}
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
