"use client";

import { useEffect, useMemo, useState } from "react";

type CommercialStatus = "standard" | "new" | "limited" | "low_stock";

type ProductItem = {
  id: string;
  nombre: string;
  slug: string;
  resumen: string | null;
  historiaAroma: string | null;
  notasOlfativas: string | null;
  duracionAprox: string | null;
  tamanoPeso: string | null;
  idealPara: string | null;
  instruccionesUso: string | null;
  estadoComercial: CommercialStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  sortOrder: number;
};

type CatalogApiResponse = {
  products: ProductItem[];
};

const statusOptions: Array<{ value: CommercialStatus; label: string }> = [
  { value: "standard", label: "Estandar" },
  { value: "new", label: "Nuevo" },
  { value: "limited", label: "Edicion limitada" },
  { value: "low_stock", label: "Ultimas unidades" },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function AdminProductCommercialManager() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/catalogo", { cache: "no-store" });
      const payload = (await response.json()) as CatalogApiResponse;
      if (!response.ok) {
        throw new Error("No se pudo cargar el editor comercial.");
      }
      setProducts(payload.products);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error de carga.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = normalizeText(searchTerm);
    if (!normalized) {
      return products;
    }
    return products.filter((product) =>
      normalizeText(`${product.nombre} ${product.slug}`).includes(normalized),
    );
  }, [products, searchTerm]);

  function updateProductState(id: string, updater: (product: ProductItem) => ProductItem) {
    setProducts((current) => current.map((product) => (product.id === id ? updater(product) : product)));
  }

  async function saveProduct(product: ProductItem) {
    setBusyId(product.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/productos/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumen: product.resumen?.trim() || "",
          historiaAroma: product.historiaAroma?.trim() || "",
          notasOlfativas: product.notasOlfativas?.trim() || "",
          duracionAprox: product.duracionAprox?.trim() || "",
          tamanoPeso: product.tamanoPeso?.trim() || "",
          idealPara: product.idealPara?.trim() || "",
          instruccionesUso: product.instruccionesUso?.trim() || "",
          estadoComercial: product.estadoComercial,
          seoTitle: product.seoTitle?.trim() || "",
          seoDescription: product.seoDescription?.trim() || "",
          isFeatured: product.isFeatured,
          sortOrder: Number.isFinite(product.sortOrder) ? Math.max(0, product.sortOrder) : 0,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo guardar la ficha comercial.");
      }
      setFeedback(`Guardado: ${product.nombre}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error guardando.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-4">
      <div className="space-y-1">
        <h3 className="text-xl text-[var(--fg-strong)]">Editor comercial de productos</h3>
        <p className="text-sm text-[var(--fg-muted)]">
          Gestiona resumen, historia del aroma, notas olfativas, estado comercial, destacados,
          orden y SEO sin tocar código.
        </p>
      </div>
      <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
        Buscar producto
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Nombre o slug"
          className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
      </label>
      {feedback ? (
        <p className="rounded-lg border border-[var(--accent)]/35 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg-muted)]">
          {feedback}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--fg-muted)]">Cargando productos...</p> : null}
      {!loading && !filteredProducts.length ? (
        <p className="text-sm text-[var(--fg-muted)]">No hay productos para mostrar con ese filtro.</p>
      ) : null}
      <div className="space-y-4">
        {filteredProducts.map((product) => (
          <article
            key={product.id}
            className="space-y-3 rounded-xl border border-[var(--border)]/35 bg-[var(--surface)] p-4"
          >
            <div>
              <h4 className="text-lg text-[var(--fg-strong)]">{product.nombre}</h4>
              <p className="text-xs text-[var(--fg-soft)]">/{product.slug}</p>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Descripción corta
                <input
                  value={product.resumen ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({ ...current, resumen: event.target.value }))
                  }
                  placeholder="Texto para la ficha"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Notas olfativas
                <input
                  value={product.notasOlfativas ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      notasOlfativas: event.target.value,
                    }))
                  }
                  placeholder="Ej: vainilla, canela, madera"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Duración aproximada
                <input
                  value={product.duracionAprox ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      duracionAprox: event.target.value,
                    }))
                  }
                  placeholder="Ej: 35h"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Tamaño / peso
                <input
                  value={product.tamanoPeso ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      tamanoPeso: event.target.value,
                    }))
                  }
                  placeholder="Ej: 220g"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)] md:col-span-2">
                Ideal para
                <input
                  value={product.idealPara ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      idealPara: event.target.value,
                    }))
                  }
                  placeholder="Ej: regalo, lectura, ritual nocturno"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)] md:col-span-2">
                Historia del aroma
                <textarea
                  value={product.historiaAroma ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      historiaAroma: event.target.value,
                    }))
                  }
                  placeholder="Relato comercial del aroma"
                  className="mt-1 min-h-24 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)] md:col-span-2">
                Instrucciones de uso y seguridad
                <textarea
                  value={product.instruccionesUso ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      instruccionesUso: event.target.value,
                    }))
                  }
                  placeholder="Cuidados, uso recomendado o advertencias"
                  className="mt-1 min-h-24 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Estado comercial
                <select
                  value={product.estadoComercial}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      estadoComercial: event.target.value as CommercialStatus,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]">
                <input
                  type="checkbox"
                  checked={product.isFeatured}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      isFeatured: event.target.checked,
                    }))
                  }
                />
                Destacado
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                Orden
                <input
                  type="number"
                  min={0}
                  value={product.sortOrder}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      sortOrder: Number.parseInt(event.target.value || "0", 10) || 0,
                    }))
                  }
                  placeholder="Orden"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                SEO title
                <input
                  value={product.seoTitle ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      seoTitle: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--fg-muted)]">
                SEO description
                <input
                  value={product.seoDescription ?? ""}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      seoDescription: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="mt-1 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void saveProduct(product)}
              disabled={busyId === product.id}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
            >
              {busyId === product.id ? "Guardando..." : "Guardar ficha comercial"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
