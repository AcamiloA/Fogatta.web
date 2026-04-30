"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";
import { ProductSummaryDTO } from "@/modules/catalog/contracts";

type Props = {
  products: ProductSummaryDTO[];
};

type CategoryView = {
  id: string;
  nombre: string;
  resumen: string | null;
  descripcion: string | null;
  total: number;
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
  const hasTrackedListViewRef = useRef(false);
  const lastSearchTermTrackedRef = useRef("");

  const normalizedSearch = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const categories = useMemo(() => {
    const byId = new Map<string, CategoryView>();

    for (const product of products) {
      const existing = byId.get(product.categoryId);
      if (existing) {
        existing.total += 1;
        continue;
      }

      byId.set(product.categoryId, {
        id: product.categoryId,
        nombre: product.categoria.nombre,
        resumen: product.categoria.resumen,
        descripcion: product.categoria.descripcion,
        total: 1,
      });
    }

    return [...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"));
  }, [products]);

  const selectedCategory =
    selectedCategoryId === "all"
      ? null
      : categories.find((category) => category.id === selectedCategoryId) ?? null;

  const filteredProducts = useMemo(() => {
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
  }, [normalizedSearch, products, selectedCategoryId]);

  const showCategoryCards = !normalizedSearch && selectedCategoryId === "all";

  useEffect(() => {
    if (hasTrackedListViewRef.current) {
      return;
    }
    hasTrackedListViewRef.current = true;

    trackEvent(analyticsEvents.viewItemList, {
      item_list_name: "catalogo",
      items: products.slice(0, 20).map((product, index) => ({
        item_id: product.slug,
        item_name: product.nombre,
        item_category: product.categoria.nombre,
        index: index + 1,
      })),
    });
  }, [products]);

  useEffect(() => {
    if (normalizedSearch.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastSearchTermTrackedRef.current === normalizedSearch) {
        return;
      }
      lastSearchTermTrackedRef.current = normalizedSearch;

      trackEvent(analyticsEvents.search, {
        search_term: searchTerm.trim(),
        results_count: filteredProducts.length,
      });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filteredProducts.length, normalizedSearch, searchTerm]);

  return (
    <>
      <section className="mt-8 rounded-2xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-[var(--fg-muted)]">
            Categoria
            <select
              value={selectedCategoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                setSelectedCategoryId(nextCategoryId);

                trackEvent(analyticsEvents.catalogFilterSelect, {
                  filter_type: "catalogo_categoria",
                  filter_value: nextCategoryId,
                });
              }}
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
          {showCategoryCards
            ? `${categories.length} categorías disponibles.`
            : `Mostrando ${filteredProducts.length} de ${products.length} productos.`}
        </p>
      </section>

      {showCategoryCards ? (
        <section className="mt-6 space-y-4">
          <h2 className="text-2xl text-[var(--fg-strong)]">Explora por categorías</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <article
                key={category.id}
                className="space-y-3 rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] p-5"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Categoría</p>
                <h3 className="text-xl font-semibold text-[var(--ink)]">{category.nombre}</h3>
                <p className="text-sm text-[var(--ink-muted)]">
                  {category.resumen?.trim() || "Velas artesanales seleccionadas para esta colección."}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {category.total === 1 ? "1 producto" : `${category.total} productos`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    trackEvent(analyticsEvents.selectItem, {
                      item_list_name: "categorias_catalogo",
                      item_category: category.nombre,
                      item_category_id: category.id,
                    });
                  }}
                  className="inline-flex rounded-lg border border-[var(--ink)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--fg)]"
                >
                  Ver productos
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedCategory ? (
        <section className="mt-6 rounded-2xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">Categoría</p>
              <h2 className="text-2xl text-[var(--fg-strong)]">{selectedCategory.nombre}</h2>
              <p className="max-w-3xl text-sm text-[var(--fg-muted)]">
                {selectedCategory.descripcion?.trim() ||
                  selectedCategory.resumen?.trim() ||
                  "Descubre los productos de esta categoría."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className="rounded-lg border border-[var(--input-border)] px-3 py-2 text-sm text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)]"
            >
              Ver categorías
            </button>
          </div>
        </section>
      ) : null}

      {!showCategoryCards ? (
        filteredProducts.length ? (
          <div className="mt-6 grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--fg-muted)]">
            No encontramos productos con esos filtros. Prueba otra categoría o cambia el texto de búsqueda.
          </p>
        )
      ) : null}
    </>
  );
}
