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
      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Buscar producto por nombre o slug"
        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
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
              <input
                value={product.resumen ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({ ...current, resumen: event.target.value }))
                }
                placeholder="Descripcion corta (ficha)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.notasOlfativas ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    notasOlfativas: event.target.value,
                  }))
                }
                placeholder="Notas olfativas (ej: vainilla, canela, madera)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.duracionAprox ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    duracionAprox: event.target.value,
                  }))
                }
                placeholder="Duracion aproximada (ej: 35h)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.tamanoPeso ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    tamanoPeso: event.target.value,
                  }))
                }
                placeholder="Tamano / peso (ej: 220g)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.idealPara ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    idealPara: event.target.value,
                  }))
                }
                placeholder="Ideal para (regalo, lectura, ritual nocturno...)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)] md:col-span-2"
              />
              <textarea
                value={product.historiaAroma ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    historiaAroma: event.target.value,
                  }))
                }
                placeholder="Historia del aroma"
                className="min-h-24 rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)] md:col-span-2"
              />
              <textarea
                value={product.instruccionesUso ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    instruccionesUso: event.target.value,
                  }))
                }
                placeholder="Instrucciones de uso y seguridad"
                className="min-h-24 rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)] md:col-span-2"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <select
                value={product.estadoComercial}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    estadoComercial: event.target.value as CommercialStatus,
                  }))
                }
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={product.seoTitle ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    seoTitle: event.target.value,
                  }))
                }
                placeholder="SEO title (opcional)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.seoDescription ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    seoDescription: event.target.value,
                  }))
                }
                placeholder="SEO description (opcional)"
                className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-sm text-[var(--fg)]"
              />
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
