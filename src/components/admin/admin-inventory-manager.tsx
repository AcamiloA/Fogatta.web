"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Category = { id: string; nombre: string };
type Variant = {
  id: string;
  productId: string;
  nombreVariante: string;
  sku: string;
  stockVirtual: number;
  stockDisponible?: number;
  stockMinimoAlerta: number;
};
type Product = { id: string; nombre: string; categoryId: string; categoria: Category; variantes: Variant[] };
type CatalogPayload = { categories: Category[]; products: Product[] };

type InventorySupply = {
  id: string;
  nombre: string;
  unidad: string;
  precioTotal: number;
  cantidadTotal: number;
  activo: boolean;
};

type InventoryRecipeItem = {
  id: string;
  supplyId: string;
  cantidadUsada: number;
  supply: { id: string; nombre: string; unidad: string };
};

type InventoryBaseProduct = {
  id: string;
  nombre: string;
  categoria: string;
  precioBrutoReferencia: number;
  recipeItems: InventoryRecipeItem[];
};

type ApiListResponse<T> = { data: T[] };
type ApiErrorPayload = { error?: string; details?: { formErrors?: string[] } };
type FeedbackTone = "success" | "error" | "warning" | "info";
type ScopedFeedback = {
  scope: string;
  tone: FeedbackTone;
  message: string;
};

type VariantDraft = { stockVirtual: string; stockMinimoAlerta: string };
type SupplyDraft = {
  nombre: string;
  unidad: string;
  cantidadTotal: string;
  precioTotal: string;
  activo: boolean;
};

const UNIT_OPTIONS = ["g", "kg", "mg", "ml", "l", "oz", "lb", "cm3", "m3", "unidad", "docena", "paquete", "caja", "gal"];

function normalizeForMatch(value: string) {
  return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function parsePositiveDecimal(value: string) {
  const parsed = Number.parseFloat(value.trim().replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function resolveApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const typed = payload as ApiErrorPayload;
  const form = typed.details?.formErrors?.find(Boolean);
  if (form) return form;
  return typed.error?.trim() || fallback;
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export function AdminInventoryManager() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [supplies, setSupplies] = useState<InventorySupply[]>([]);
  const [baseProducts, setBaseProducts] = useState<InventoryBaseProduct[]>([]);

  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [supplyDrafts, setSupplyDrafts] = useState<Record<string, SupplyDraft>>({});
  const [newSupply, setNewSupply] = useState<SupplyDraft>({ nombre: "", unidad: UNIT_OPTIONS[0] ?? "g", cantidadTotal: "", precioTotal: "", activo: true });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<ScopedFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);
  const [busySupplyId, setBusySupplyId] = useState<string | null>(null);
  const [isCreatingSupply, setIsCreatingSupply] = useState(false);

  const clearFeedback = useCallback((scope?: string) => {
    setFeedback((current) => {
      if (!current) {
        return current;
      }
      if (!scope || current.scope === scope) {
        return null;
      }
      return current;
    });
  }, []);

  const showFeedback = useCallback((scope: string, tone: FeedbackTone, message: string) => {
    setFeedback({ scope, tone, message });
  }, []);

  function renderFeedback(scope: string) {
    if (!feedback || feedback.scope !== scope) {
      return null;
    }

    const className =
      feedback.tone === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
        : feedback.tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : feedback.tone === "info"
            ? "border-sky-300 bg-sky-50 text-sky-700"
            : "border-rose-300 bg-rose-50 text-rose-700";

    return (
      <p className={`rounded-lg border px-4 py-3 text-sm ${className}`}>
        {feedback.message}
      </p>
    );
  }

  const loadInventory = useCallback(async () => {
    const scope = "inventory-stock";
    setLoading(true);
    clearFeedback(scope);
    try {
      const [catalogResponse, suppliesResponse, baseProductsResponse] = await Promise.all([
        fetch("/api/admin/catalogo", { cache: "no-store" }),
        fetch("/api/admin/inventario/insumos", { cache: "no-store" }),
        fetch("/api/admin/inventario/productos-base", { cache: "no-store" }),
      ]);

      const catalogPayload = (await catalogResponse.json()) as CatalogPayload;
      const suppliesPayload = (await suppliesResponse.json()) as ApiListResponse<InventorySupply>;
      const baseProductsPayload = (await baseProductsResponse.json()) as ApiListResponse<InventoryBaseProduct>;

      if (!catalogResponse.ok) throw new Error(resolveApiError(catalogPayload, "No se pudo cargar el inventario de variantes."));
      if (!suppliesResponse.ok) throw new Error(resolveApiError(suppliesPayload, "No se pudo cargar insumos."));
      if (!baseProductsResponse.ok) throw new Error(resolveApiError(baseProductsPayload, "No se pudo cargar productos base."));

      setCatalog(catalogPayload);
      setSupplies(suppliesPayload.data);
      setBaseProducts(baseProductsPayload.data);

      const nextVariantDrafts: Record<string, VariantDraft> = {};
      for (const product of catalogPayload.products) {
        for (const variant of product.variantes) {
          nextVariantDrafts[variant.id] = {
            stockVirtual: String(variant.stockVirtual),
            stockMinimoAlerta: String(variant.stockMinimoAlerta),
          };
        }
      }
      setVariantDrafts(nextVariantDrafts);

      const nextSupplyDrafts: Record<string, SupplyDraft> = {};
      for (const supply of suppliesPayload.data) {
        nextSupplyDrafts[supply.id] = {
          nombre: supply.nombre,
          unidad: supply.unidad,
          cantidadTotal: String(supply.cantidadTotal),
          precioTotal: String(supply.precioTotal),
          activo: supply.activo,
        };
      }
      setSupplyDrafts(nextSupplyDrafts);
    } catch (loadError) {
      showFeedback(
        scope,
        "error",
        loadError instanceof Error ? loadError.message : "Error cargando inventario.",
      );
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, showFeedback]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const stockRows = useMemo(() => {
    if (!catalog) return [] as Array<{
      variantId: string;
      categoryId: string;
      productName: string;
      categoryName: string;
      variantName: string;
      sku: string;
      stockVirtual: number;
      stockDisponible: number;
      stockReservado: number;
      stockMinimoAlerta: number;
      isLowStock: boolean;
    }>;

    return catalog.products
      .flatMap((product) =>
        product.variantes.map((variant) => {
          const stockDisponible = variant.stockDisponible ?? variant.stockVirtual;
          const stockReservado = Math.max(variant.stockVirtual - stockDisponible, 0);
          return {
            variantId: variant.id,
            categoryId: product.categoryId,
            productName: product.nombre,
            categoryName: product.categoria.nombre,
            variantName: variant.nombreVariante,
            sku: variant.sku,
            stockVirtual: variant.stockVirtual,
            stockDisponible,
            stockReservado,
            stockMinimoAlerta: variant.stockMinimoAlerta,
            isLowStock: variant.stockMinimoAlerta > 0 && stockDisponible <= variant.stockMinimoAlerta,
          };
        }),
      )
      .sort((a, b) => `${a.productName}-${a.variantName}`.localeCompare(`${b.productName}-${b.variantName}`, "es"));
  }, [catalog]);

  const filteredStockRows = useMemo(() => {
    const query = normalizeForMatch(searchQuery);
    return stockRows.filter((row) => {
      if (categoryFilter !== "all" && row.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return (
        normalizeForMatch(row.productName).includes(query) ||
        normalizeForMatch(row.variantName).includes(query) ||
        normalizeForMatch(row.sku).includes(query)
      );
    });
  }, [stockRows, searchQuery, categoryFilter]);

  const supplySummary = useMemo(() => {
    const activos = supplies.filter((s) => s.activo);
    return {
      total: supplies.length,
      activos: activos.length,
      inversionTotal: activos.reduce((acc, s) => acc + s.precioTotal, 0),
      cantidadTotal: activos.reduce((acc, s) => acc + s.cantidadTotal, 0),
    };
  }, [supplies]);

  const capacityRows = useMemo(() => {
    const supplyById = new Map(supplies.map((s) => [s.id, s]));
    return baseProducts
      .map((base) => {
        if (!base.recipeItems.length) {
          return { id: base.id, nombre: base.nombre, categoria: base.categoria, maxUnidades: null as number | null, limitante: null as string | null, costo: base.precioBrutoReferencia };
        }
        let minUnits = Number.POSITIVE_INFINITY;
        let limitante = "";
        for (const item of base.recipeItems) {
          const supply = supplyById.get(item.supplyId);
          const available = supply?.activo ? supply.cantidadTotal : 0;
          const possible = item.cantidadUsada > 0 ? available / item.cantidadUsada : Number.POSITIVE_INFINITY;
          if (possible < minUnits) {
            minUnits = possible;
            limitante = supply?.nombre ?? item.supply?.nombre ?? "Insumo no disponible";
          }
        }
        return {
          id: base.id,
          nombre: base.nombre,
          categoria: base.categoria,
          maxUnidades: Number.isFinite(minUnits) ? Math.max(Math.floor(minUnits), 0) : 0,
          limitante,
          costo: base.precioBrutoReferencia,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [baseProducts, supplies]);

  function updateVariantDraft(variantId: string, field: keyof VariantDraft, value: string) {
    setVariantDrafts((current) => ({
      ...current,
      [variantId]: {
        ...current[variantId],
        stockVirtual: current[variantId]?.stockVirtual ?? "0",
        stockMinimoAlerta: current[variantId]?.stockMinimoAlerta ?? "0",
        [field]: sanitizeIntegerInput(value),
      },
    }));
  }

  function updateSupplyDraft(supplyId: string, field: keyof SupplyDraft, value: string | boolean) {
    setSupplyDrafts((current) => ({ ...current, [supplyId]: { ...current[supplyId], [field]: value as never } }));
  }

  async function saveVariant(variantId: string) {
    const scope = `inventory-variant-${variantId}`;
    const draft = variantDrafts[variantId];
    if (!draft) return;
    const stockVirtual = Number.parseInt(draft.stockVirtual || "0", 10);
    const stockMinimoAlerta = Number.parseInt(draft.stockMinimoAlerta || "0", 10);
    if (!Number.isFinite(stockVirtual) || stockVirtual < 0) {
      showFeedback(scope, "warning", "Stock virtual invalido.");
      return;
    }
    if (!Number.isFinite(stockMinimoAlerta) || stockMinimoAlerta < 0) {
      showFeedback(scope, "warning", "Stock minimo alerta invalido.");
      return;
    }

    setBusyVariantId(variantId);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/variantes/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockVirtual, stockMinimoAlerta }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(resolveApiError(payload, "No se pudo guardar la variante."));
      await loadInventory();
      showFeedback(scope, "success", "Variante de inventario guardada.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando variante.",
      );
    } finally {
      setBusyVariantId(null);
    }
  }

  async function createSupply() {
    const scope = "inventory-supply-create";
    const nombre = newSupply.nombre.trim();
    const unidad = newSupply.unidad.trim();
    const cantidadTotal = parsePositiveDecimal(newSupply.cantidadTotal);
    const precioTotal = Number.parseInt(newSupply.precioTotal || "0", 10);

    if (!nombre) {
      showFeedback(scope, "warning", "Nombre del insumo requerido.");
      return;
    }
    if (!unidad) {
      showFeedback(scope, "warning", "Unidad de medida requerida.");
      return;
    }
    if (!Number.isFinite(cantidadTotal) || cantidadTotal <= 0) {
      showFeedback(scope, "warning", "Cantidad comprada invalida.");
      return;
    }
    if (!Number.isFinite(precioTotal) || precioTotal < 0) {
      showFeedback(scope, "warning", "Costo total invalido.");
      return;
    }

    setIsCreatingSupply(true);
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/inventario/insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, unidad, cantidadTotal, precioTotal, activo: newSupply.activo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(resolveApiError(payload, "No se pudo crear el insumo."));
      setNewSupply({ nombre: "", unidad: UNIT_OPTIONS[0] ?? "g", cantidadTotal: "", precioTotal: "", activo: true });
      await loadInventory();
      showFeedback(scope, "success", "Insumo creado correctamente.");
    } catch (createError) {
      showFeedback(
        scope,
        "error",
        createError instanceof Error ? createError.message : "Error creando insumo.",
      );
    } finally {
      setIsCreatingSupply(false);
    }
  }

  async function saveSupply(supplyId: string) {
    const scope = `inventory-supply-${supplyId}`;
    const draft = supplyDrafts[supplyId];
    if (!draft) return;
    const cantidadTotal = parsePositiveDecimal(draft.cantidadTotal);
    const precioTotal = Number.parseInt(draft.precioTotal || "0", 10);
    if (!draft.nombre.trim()) {
      showFeedback(scope, "warning", "Nombre del insumo requerido.");
      return;
    }
    if (!draft.unidad.trim()) {
      showFeedback(scope, "warning", "Unidad de medida requerida.");
      return;
    }
    if (!Number.isFinite(cantidadTotal) || cantidadTotal <= 0) {
      showFeedback(scope, "warning", "Cantidad comprada invalida.");
      return;
    }
    if (!Number.isFinite(precioTotal) || precioTotal < 0) {
      showFeedback(scope, "warning", "Costo total invalido.");
      return;
    }

    setBusySupplyId(supplyId);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/inventario/insumos/${supplyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: draft.nombre.trim(),
          unidad: draft.unidad.trim(),
          cantidadTotal,
          precioTotal,
          activo: draft.activo,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(resolveApiError(payload, "No se pudo actualizar el insumo."));
      await loadInventory();
      showFeedback(scope, "success", "Insumo actualizado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error actualizando insumo.",
      );
    } finally {
      setBusySupplyId(null);
    }
  }

  if (loading) return <p className="text-sm text-[var(--fg-muted)]">Cargando inventario...</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        {renderFeedback("inventory-stock")}
        <h3 className="text-xl text-[var(--fg-strong)]">Stock por producto y variante</h3>
        <div className="grid gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4 md:grid-cols-[2fr,1fr,auto]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por producto, variante o SKU"
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            <option value="all">Todas las categorias</option>
            {(catalog?.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>{category.nombre}</option>
            ))}
          </select>
          <button type="button" onClick={() => void loadInventory()} className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--fg-strong)]">
            Refrescar
          </button>
        </div>

        <div className="space-y-3">
          {!filteredStockRows.length ? (
            <div className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--fg-muted)]">
              No hay variantes para el filtro seleccionado.
            </div>
          ) : null}

          {filteredStockRows.map((row) => {
            const draft = variantDrafts[row.variantId] ?? { stockVirtual: String(row.stockVirtual), stockMinimoAlerta: String(row.stockMinimoAlerta) };
            return (
              <article key={row.variantId} className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
                {renderFeedback(`inventory-variant-${row.variantId}`)}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--fg-strong)]">{row.productName} · {row.variantName}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{row.categoryName} · SKU: {row.sku}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
                    Disp: {row.stockDisponible} | Res: {row.stockReservado}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
                  <input value={draft.stockVirtual} onChange={(e) => updateVariantDraft(row.variantId, "stockVirtual", e.target.value)} inputMode="numeric" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
                  <input value={draft.stockMinimoAlerta} onChange={(e) => updateVariantDraft(row.variantId, "stockMinimoAlerta", e.target.value)} inputMode="numeric" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
                  <button type="button" onClick={() => void saveVariant(row.variantId)} disabled={busyVariantId === row.variantId} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]">
                    {busyVariantId === row.variantId ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        {renderFeedback("inventory-supply-create")}
        <h3 className="text-xl text-[var(--fg-strong)]">Insumos y costos de materia prima</h3>

        <div className="grid gap-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4 md:grid-cols-4">
          <article className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">Insumos activos</p>
            <p className="mt-1 text-2xl text-[var(--fg-strong)]">{supplySummary.activos}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">Insumos totales</p>
            <p className="mt-1 text-2xl text-[var(--fg-strong)]">{supplySummary.total}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">Inversion en insumos</p>
            <p className="mt-1 text-2xl text-amber-400">{formatCurrency(supplySummary.inversionTotal)}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-3">
            <p className="text-xs text-[var(--fg-muted)]">Cantidad total activa</p>
            <p className="mt-1 text-2xl text-emerald-400">{supplySummary.cantidadTotal.toFixed(2)}</p>
          </article>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
          <h4 className="text-lg text-[var(--fg-strong)]">Crear insumo</h4>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input value={newSupply.nombre} onChange={(e) => setNewSupply((c) => ({ ...c, nombre: e.target.value }))} placeholder="Nombre del insumo" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
            <select value={newSupply.unidad} onChange={(e) => setNewSupply((c) => ({ ...c, unidad: e.target.value }))} className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]">
              {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <input value={newSupply.cantidadTotal} onChange={(e) => setNewSupply((c) => ({ ...c, cantidadTotal: e.target.value.replace(/[^0-9.,]/g, "") }))} placeholder="Cantidad comprada" inputMode="decimal" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
            <input value={newSupply.precioTotal} onChange={(e) => setNewSupply((c) => ({ ...c, precioTotal: sanitizeIntegerInput(e.target.value) }))} placeholder="Costo total (COP)" inputMode="numeric" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
            <label className="flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg-muted)]"><input type="checkbox" checked={newSupply.activo} onChange={(e) => setNewSupply((c) => ({ ...c, activo: e.target.checked }))} />Activo</label>
          </div>
          <button type="button" onClick={() => void createSupply()} disabled={isCreatingSupply} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]">
            {isCreatingSupply ? "Creando..." : "Crear insumo"}
          </button>
        </div>

        <div className="space-y-3">
          {supplies.map((supply) => {
            const draft = supplyDrafts[supply.id] ?? { nombre: supply.nombre, unidad: supply.unidad, cantidadTotal: String(supply.cantidadTotal), precioTotal: String(supply.precioTotal), activo: supply.activo };
            const cantidad = parsePositiveDecimal(draft.cantidadTotal);
            const precio = Number.parseInt(draft.precioTotal || "0", 10);
            const costoUnitario = Number.isFinite(cantidad) && cantidad > 0 && Number.isFinite(precio) ? precio / cantidad : 0;

            return (
              <article key={supply.id} className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
                {renderFeedback(`inventory-supply-${supply.id}`)}
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <input value={draft.nombre} onChange={(e) => updateSupplyDraft(supply.id, "nombre", e.target.value)} className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
                  <select value={draft.unidad} onChange={(e) => updateSupplyDraft(supply.id, "unidad", e.target.value)} className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]">
                    {Array.from(new Set([...UNIT_OPTIONS, draft.unidad])).map((unit) => <option key={`${supply.id}-${unit}`} value={unit}>{unit}</option>)}
                  </select>
                  <input value={draft.cantidadTotal} onChange={(e) => updateSupplyDraft(supply.id, "cantidadTotal", e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
                  <input value={draft.precioTotal} onChange={(e) => updateSupplyDraft(supply.id, "precioTotal", sanitizeIntegerInput(e.target.value))} inputMode="numeric" className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]" />
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg-muted)]"><input type="checkbox" checked={draft.activo} onChange={(e) => updateSupplyDraft(supply.id, "activo", e.target.checked)} />Activo</label>
                </div>

                <div className="grid gap-2 text-xs text-[var(--fg-muted)] sm:grid-cols-3">
                  <p>Costo total: <span className="font-semibold text-[var(--fg-strong)]">{formatCurrency(Number.isFinite(precio) ? precio : 0)}</span></p>
                  <p>Cantidad: <span className="font-semibold text-[var(--fg-strong)]">{Number.isFinite(cantidad) ? cantidad.toFixed(2) : "0.00"} {draft.unidad}</span></p>
                  <p>Costo unitario: <span className="font-semibold text-amber-400">{formatCurrency(Math.round(costoUnitario))} / {draft.unidad}</span></p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void saveSupply(supply.id)} disabled={busySupplyId === supply.id} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]">
                    {busySupplyId === supply.id ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4">
        <h3 className="text-xl text-[var(--fg-strong)]">Capacidad estimada de produccion</h3>
        <p className="text-sm text-[var(--fg-muted)]">Estimacion por receta con materia prima activa. No considera consumo cruzado entre recetas.</p>
        {!capacityRows.length ? <p className="text-sm text-[var(--fg-muted)]">Aun no hay recetas para calcular capacidad.</p> : null}
        <div className="space-y-3">
          {capacityRows.map((row) => (
            <article key={row.id} className="rounded-xl border border-[var(--border)]/40 bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--fg-strong)]">{row.nombre}</p>
                  <p className="text-xs text-[var(--fg-muted)]">{row.categoria}</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
                  {row.maxUnidades === null ? "Sin receta" : `${row.maxUnidades} velas aprox.`}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-xs text-[var(--fg-muted)] sm:grid-cols-2">
                <p>Costo bruto referencia: <span className="font-semibold text-[var(--fg-strong)]">{formatCurrency(row.costo)}</span></p>
                <p>Insumo limitante: <span className="font-semibold text-amber-400">{row.limitante ?? "No aplica"}</span></p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
