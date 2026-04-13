"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { ProductSummaryDTO } from "@/modules/catalog/contracts";

type Props = {
  products: ProductSummaryDTO[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CatalogListing({ products }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const categories = useMemo(() => {
    const byId = new Map<string, { id: string; nombre: string; total: number }>();

    for (const product of products) {
      const existing = byId.get(product.categoryId);
      if (existing) {
        existing.total += 1;
        continue;
      }

      byId.set(product.categoryId, {
        id: product.categoryId,
        nombre: product.categoria.nombre,
        total: 1,
      });
    }

    return [...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return products.filter((product) => {
      const categoryMatches =
        selectedCategoryId === "all" || product.categoryId === selectedCategoryId;
      if (!categoryMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableContent = normalizeText(`${product.nombre} ${product.descripcion}`);
      return searchableContent.includes(normalizedSearch);
    });
  }, [products, searchTerm, selectedCategoryId]);

  return (
    <>
      <section className="mt-8 rounded-2xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-[var(--fg-muted)]">
            Categoria
            <select
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            >
              <option value="all">Todas las categorias ({products.length})</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre} ({category.total})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-[var(--fg-muted)]">
            Buscar
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre o descripcion"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-[var(--fg-soft)]">
          Mostrando {filteredProducts.length} de {products.length} productos.
        </p>
      </section>

      {filteredProducts.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--fg-muted)]">
          No encontramos productos con esos filtros. Prueba otra categoria o cambia el texto de busqueda.
        </p>
      )}
    </>
  );
}