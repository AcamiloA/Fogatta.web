"use client";

import { useMemo, useState } from "react";

type FaqCategory = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

type FaqItem = {
  id: string;
  pregunta: string;
  respuesta: string;
  faqCategoryId: string | null;
  faqCategory: FaqCategory | null;
  orden: number;
};

type Props = {
  categories: FaqCategory[];
  faq: FaqItem[];
};

const UNCATEGORIZED_ID = "__uncategorized__";

export function FAQListing({ categories, faq }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const availableFilters = useMemo(() => {
    const base = categories.map((category) => ({
      id: category.id,
      nombre: category.nombre,
      orden: category.orden,
    }));

    const hasUncategorized = faq.some((item) => !item.faqCategoryId);
    if (hasUncategorized) {
      base.push({
        id: UNCATEGORIZED_ID,
        nombre: "Sin categoría",
        orden: 999,
      });
    }

    return base.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  }, [categories, faq]);

  const filteredFaq = useMemo(() => {
    if (selectedCategoryId === "all") {
      return faq;
    }

    if (selectedCategoryId === UNCATEGORIZED_ID) {
      return faq.filter((item) => !item.faqCategoryId);
    }

    return faq.filter((item) => item.faqCategoryId === selectedCategoryId);
  }, [faq, selectedCategoryId]);

  const groupedFaq = useMemo(() => {
    const groups = new Map<string, { id: string; nombre: string; items: FaqItem[]; orden: number }>();

    for (const item of filteredFaq) {
      const id = item.faqCategoryId ?? UNCATEGORIZED_ID;
      const matchedFilter = availableFilters.find((filter) => filter.id === id);
      const fromCategory = item.faqCategory
        ? {
            nombre: item.faqCategory.nombre,
            orden: item.faqCategory.orden,
          }
        : matchedFilter
          ? {
              nombre: matchedFilter.nombre,
              orden: matchedFilter.orden,
            }
          : {
              nombre: "Sin categoría",
              orden: 999,
            };

      const existing = groups.get(id);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(id, {
          id,
          nombre: fromCategory.nombre,
          orden: fromCategory.orden,
          items: [item],
        });
      }
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => a.orden - b.orden),
      }))
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  }, [availableFilters, filteredFaq]);

  return (
    <div className="mt-8 space-y-4">
      <section className="rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
        <label className="space-y-1 text-sm text-[var(--fg-muted)]">
          Filtrar por categoría
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            <option value="all">Todas las categorías</option>
            {availableFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      {groupedFaq.length ? (
        groupedFaq.map((group) => (
          <section key={group.id} className="space-y-3">
            <h2 className="text-2xl text-[var(--fg-strong)]">{group.nombre}</h2>
            <div className="space-y-4">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-5"
                >
                  <h3 className="text-xl text-[var(--fg-strong)]">{item.pregunta}</h3>
                  <p className="mt-3 whitespace-pre-line text-[var(--fg-muted)]">{item.respuesta}</p>
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-[var(--fg-muted)]">
          No hay FAQs para la categoría seleccionada.
        </p>
      )}
    </div>
  );
}
