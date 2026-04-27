"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  descripcion: string | null;
};

type Variant = {
  id: string;
  productId: string;
  nombreVariante: string;
  sku: string;
  stockVirtual: string;
  stockMinimoAlerta: string;
  precio: string;
  imagenes: string[];
  descuentoActivo: boolean;
  descuentoPorcentaje: string;
};

type Product = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precioReferencia: number;
  imagenes: string[];
  activo: boolean;
  categoryId: string;
  categoria: Category;
  variantes: Variant[];
};

type CatalogPayload = {
  categories: Category[];
  products: Product[];
};

type VariantApi = Omit<Variant, "stockVirtual" | "stockMinimoAlerta" | "precio"> & {
  stockVirtual: number;
  stockMinimoAlerta: number;
  precio: number;
  descuentoPorcentaje: number;
};

type ProductApi = Omit<Product, "variantes"> & {
  variantes: VariantApi[];
};

type CatalogPayloadApi = {
  categories: Category[];
  products: ProductApi[];
};

type ValidationDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

type ApiErrorPayload = {
  error?: string;
  details?: ValidationDetails;
};

type FeedbackTone = "success" | "error" | "warning" | "info";
type ScopedFeedback = {
  scope: string;
  tone: FeedbackTone;
  message: string;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const MAX_PRODUCT_IMAGES = 1;
const MAX_VARIANT_IMAGES = 3;

function normalizeDiscountPercentageInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed)) {
    return "";
  }
  return String(Math.min(100, Math.max(1, parsed)));
}

function formatValidationMessage(details?: ValidationDetails) {
  const formMessage = details?.formErrors?.find((message) => Boolean(message?.trim()));
  if (formMessage) {
    return formMessage;
  }

  const fieldEntries = Object.entries(details?.fieldErrors ?? {});
  for (const [field, messages] of fieldEntries) {
    const message = messages?.find((current) => Boolean(current?.trim()));
    if (!message) continue;

    if (field === "descripcion" && message.toLowerCase().includes("too small")) {
      return "Descripción: mínimo 5 caracteres.";
    }
    if (field === "categoryId") {
      return "Categoría: selecciona una categoría.";
    }
    if (field === "precio") {
      return "Precio: ingresa un número válido.";
    }
    if (field === "descuentoPorcentaje") {
      return "Descuento (%): ingresa un número entre 1 y 100.";
    }
    if (field === "stockMinimoAlerta") {
      return "Stock mínimo alerta: ingresa un número válido.";
    }
    if (field === "imagenes") {
      return "Imágenes: agrega al menos una imagen válida.";
    }
    if (field === "resumen") {
      return "Resumen: revisa el texto.";
    }

    const label =
      field === "nombre"
        ? "Nombre"
        : field === "slug"
          ? "Slug"
          : field === "descripcion"
            ? "Descripción"
            : field === "categoryId"
                ? "Categoría"
                : field === "precio"
                  ? "Precio"
                : field === "descuentoPorcentaje"
                  ? "Descuento (%)"
                : field === "stockMinimoAlerta"
                  ? "Stock mínimo alerta"
                : field === "imagenes"
                  ? "Imágenes"
                  : field === "resumen"
                    ? "Resumen"
                  : field;

    return `${label}: ${message}`;
  }

  return null;
}

function resolveApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const typed = payload as ApiErrorPayload;
  const validationMessage = formatValidationMessage(typed.details);
  if (validationMessage) {
    return validationMessage;
  }

  if (typed.error && typed.error.trim()) {
    return typed.error;
  }

  return fallback;
}

export function AdminCatalogManager() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<ScopedFeedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySummary, setNewCategorySummary] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [newProduct, setNewProduct] = useState({
    nombre: "",
    descripcion: "",
    imagenes: [] as string[],
    categoryId: "",
    activo: true,
  });

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

  const loadCatalog = useCallback(async () => {
    const scope = "catalog-list";
    setLoading(true);
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/catalogo", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar el catálogo."));
      }

      const typed = payload as CatalogPayloadApi;
      setCatalog({
        categories: typed.categories,
        products: typed.products.map((product) => ({
          ...product,
          variantes: product.variantes.map((variant) => ({
            ...variant,
            stockVirtual: variant.stockVirtual > 0 ? String(variant.stockVirtual) : "",
            stockMinimoAlerta:
              variant.stockMinimoAlerta > 0 ? String(variant.stockMinimoAlerta) : "",
            precio: variant.precio > 0 ? String(variant.precio) : "",
            descuentoPorcentaje: variant.descuentoPorcentaje > 0 ? String(variant.descuentoPorcentaje) : "",
          })),
        })),
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error de carga.";
      showFeedback(scope, "error", message);
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, showFeedback]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  async function createCategory() {
    const scope = "create-category";
    if (!newCategoryName.trim()) {
      return;
    }

    setBusyId("create-category");
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newCategoryName.trim(),
          slug: toSlug(newCategoryName),
          resumen: newCategorySummary.trim() || undefined,
          descripcion: newCategoryDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(resolveApiError(payload, "No se pudo crear la categoría."));
      }

      setNewCategoryName("");
      setNewCategorySummary("");
      setNewCategoryDescription("");
      await loadCatalog();
      showFeedback(scope, "success", "Categoría creada exitosamente.");
    } catch (categoryError) {
      showFeedback(
        scope,
        "error",
        categoryError instanceof Error ? categoryError.message : "Error creando categoría.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCategory(category: Category) {
    const scope = "create-category";
    const productsInCategory = categoryProductCount[category.id] ?? 0;
    if (productsInCategory > 0) {
      showFeedback(
        scope,
        "warning",
        productsInCategory === 1
          ? "No se puede eliminar la categoría porque tiene 1 producto."
          : `No se puede eliminar la categoría porque tiene ${productsInCategory} productos.`,
      );
      return;
    }

    const confirmed = window.confirm(`Vas a eliminar la categoría "${category.nombre}". ¿Continuar?`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-category-${category.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/categorias/${category.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar la categoría."));
      }

      setNewProduct((current) =>
        current.categoryId === category.id ? { ...current, categoryId: "" } : current,
      );
      await loadCatalog();
      showFeedback(scope, "success", "Categoría eliminada.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando categoría.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveCategory(category: Category) {
    const scope = "create-category";
    if (!category.nombre.trim()) {
      showFeedback(scope, "warning", "El título de la categoría es obligatorio.");
      return;
    }

    const busyKey = `save-category-${category.id}`;
    setBusyId(busyKey);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/categorias/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: category.nombre.trim(),
          resumen: category.resumen?.trim() || "",
          descripcion: category.descripcion?.trim() || "",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar la categoría."));
      }

      await loadCatalog();
      showFeedback(scope, "success", `Categoría "${category.nombre}" actualizada.`);
    } catch (error) {
      showFeedback(
        scope,
        "error",
        error instanceof Error ? error.message : "No se pudo guardar la categoría.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createProduct() {
    const scope = "create-product";
    const generatedSlug = toSlug(newProduct.nombre);
    if (!newProduct.nombre.trim() || !generatedSlug) {
      showFeedback(scope, "warning", "Define un nombre válido para el producto.");
      return;
    }
    if (!newProduct.categoryId) {
      showFeedback(scope, "warning", "Selecciona una categoría.");
      return;
    }
    if (!newProduct.imagenes.length) {
      showFeedback(scope, "warning", "Sube al menos una imagen para el producto.");
      return;
    }
    if (newProduct.imagenes.length > MAX_PRODUCT_IMAGES) {
      showFeedback(scope, "warning", `Maximo ${MAX_PRODUCT_IMAGES} imagen por producto.`);
      return;
    }

    const duplicateProduct = catalog?.products.find(
      (product) => normalizeForMatch(product.nombre) === normalizeForMatch(newProduct.nombre),
    );

    if (duplicateProduct) {
      const shouldReplace = window.confirm(
        `Ya existe un producto llamado "${duplicateProduct.nombre}". ¿Deseas reemplazarlo?`,
      );
      if (!shouldReplace) {
        showFeedback(
          scope,
          "warning",
          "No se guardó el producto. Puedes modificar el nombre e intentar de nuevo.",
        );
        return;
      }
    }

    setBusyId("create-product");
    clearFeedback(scope);
    try {
      const payload = {
        ...newProduct,
        slug: generatedSlug,
      };
      const response = duplicateProduct
        ? await fetch(`/api/admin/productos/${duplicateProduct.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/productos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(
          resolveApiError(
            payload,
            (duplicateProduct
              ? "No se pudo reemplazar el producto existente."
              : "No se pudo crear el producto."),
          ),
        );
      }

      setNewProduct((current) => ({
        ...current,
        nombre: "",
        descripcion: "",
        imagenes: [],
      }));
      await loadCatalog();
      showFeedback(
        scope,
        "success",
        duplicateProduct ? "Producto reemplazado correctamente." : "Producto creado correctamente.",
      );
    } catch (productError) {
      showFeedback(
        scope,
        "error",
        productError instanceof Error ? productError.message : "Error creando producto.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function uploadImage(file: File, busyKey: string, scope: string) {
    setBusyId(busyKey);
    clearFeedback(scope);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo subir la imagen."));
      }

      showFeedback(scope, "success", "Imagen subida correctamente.");
      return payload.url as string;
    } catch (uploadError) {
      showFeedback(
        scope,
        "error",
        uploadError instanceof Error ? uploadError.message : "Error subiendo imagen.",
      );
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function saveProduct(product: Product) {
    const scope = `product-${product.id}`;
    if (!product.imagenes.length) {
      showFeedback(scope, "warning", "Cada producto debe tener al menos una imagen.");
      return;
    }

    setBusyId(`save-product-${product.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/productos/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          nombre: product.nombre,
          descripcion: product.descripcion,
          imagenes: product.imagenes,
          categoryId: product.categoryId,
          activo: product.activo,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(resolveApiError(payload, "No se pudo guardar el producto."));
      }

      await loadCatalog();
      showFeedback(scope, "success", "Producto guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando producto.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveVariant(variant: Variant) {
    const scope = `variant-${variant.id}`;
    const stockVirtualRaw = variant.stockVirtual.trim();
    const stockVirtual = stockVirtualRaw ? Number.parseInt(stockVirtualRaw, 10) : 0;
    const stockMinimoAlerta = variant.stockMinimoAlerta.trim()
      ? Number.parseInt(variant.stockMinimoAlerta, 10)
      : 0;
    const precioRaw = variant.precio.trim();
    const precio = precioRaw ? Number.parseInt(precioRaw, 10) : 0;
    const descuentoPorcentaje = variant.descuentoPorcentaje.trim()
      ? Number.parseInt(variant.descuentoPorcentaje, 10)
      : 0;
    if (!Number.isFinite(stockVirtual) || stockVirtual < 0) {
      showFeedback(scope, "warning", "Stock: ingresa un número válido.");
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      showFeedback(scope, "warning", "Precio final: ingresa un número válido.");
      return;
    }
    if (!Number.isFinite(stockMinimoAlerta) || stockMinimoAlerta < 0) {
      showFeedback(scope, "warning", "Stock mínimo alerta: ingresa un número válido.");
      return;
    }
    if (
      variant.descuentoActivo &&
      (!Number.isFinite(descuentoPorcentaje) || descuentoPorcentaje < 1 || descuentoPorcentaje > 100)
    ) {
      showFeedback(scope, "warning", "Descuento (%): ingresa un número entre 1 y 100.");
      return;
    }

    if (variant.descuentoActivo && descuentoPorcentaje > 20) {
      const confirmed = window.confirm(
        `Vas a aplicar ${descuentoPorcentaje}% de descuento en esta variante. ¿Deseas continuar?`,
      );
      if (!confirmed) {
        return;
      }
    }

    if (!Number.isFinite(descuentoPorcentaje) || descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      showFeedback(scope, "warning", "Descuento (%): ingresa un número válido.");
      return;
    }

    setBusyId(`save-variant-${variant.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/variantes/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreVariante: variant.nombreVariante,
          sku: variant.sku,
          stockVirtual,
          stockMinimoAlerta,
          precio,
          imagenes: variant.imagenes,
          descuentoActivo: variant.descuentoActivo,
          descuentoPorcentaje: variant.descuentoActivo ? descuentoPorcentaje : 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(resolveApiError(payload, "No se pudo guardar la variante."));
      }

      await loadCatalog();
      showFeedback(scope, "success", "Variante guardada correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando variante.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createVariant(productId: string) {
    const scope = `product-${productId}`;
    setBusyId(`create-variant-${productId}`);
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/variantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          nombreVariante: "Nueva variante",
          sku: `SKU-${Math.floor(Math.random() * 100000)}`,
          stockVirtual: 0,
          stockMinimoAlerta: 0,
          precio: 0,
          imagenes: [],
          descuentoActivo: false,
          descuentoPorcentaje: 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(resolveApiError(payload, "No se pudo crear la variante."));
      }

      await loadCatalog();
      showFeedback(scope, "success", "Variante creada correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error creando variante.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(productId: string) {
    const scope = `product-${productId}`;
    const confirmed = window.confirm("Vas a eliminar este producto y sus variantes. ¿Continuar?");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-product-${productId}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/productos/${productId}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar el producto."));
      }

      await loadCatalog();
      showFeedback(scope, "success", "Producto eliminado correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando producto.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteVariant(variantId: string) {
    const scope = `variant-${variantId}`;
    const confirmed = window.confirm("Vas a eliminar esta variante. ¿Continuar?");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-variant-${variantId}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/variantes/${variantId}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar la variante."));
      }

      await loadCatalog();
      showFeedback(scope, "success", "Variante eliminada correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando variante.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function updateCategoryState(categoryId: string, updater: (category: Category) => Category) {
    setCatalog((current) => {
      if (!current) return current;
      return {
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId ? updater(category) : category,
        ),
      };
    });
  }

  function updateProductState(productId: string, updater: (product: Product) => Product) {
    setCatalog((current) => {
      if (!current) return current;
      return {
        ...current,
        products: current.products.map((product) =>
          product.id === productId ? updater(product) : product,
        ),
      };
    });
  }

  function updateVariantState(productId: string, variantId: string, updater: (variant: Variant) => Variant) {
    updateProductState(productId, (product) => ({
      ...product,
      variantes: product.variantes.map((variant) =>
        variant.id === variantId ? updater(variant) : variant,
      ),
    }));
  }

  const categoryOptions = useMemo(() => catalog?.categories ?? [], [catalog]);
  const categoryProductCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of catalog?.products ?? []) {
      counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [catalog?.products]);

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando catálogo...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5 md:grid-cols-2">
        <div className="space-y-3">
          {renderFeedback("create-category")}
          <h2 className="text-xl text-[var(--fg-strong)]">Crear categoría</h2>
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Título de categoría"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <input
            value={newCategorySummary}
            onChange={(event) => setNewCategorySummary(event.target.value)}
            placeholder="Resumen breve (ficha)"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newCategoryDescription}
            onChange={(event) => setNewCategoryDescription(event.target.value)}
            placeholder="Descripción larga (opcional)"
            className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <button
            type="button"
            onClick={() => void createCategory()}
            disabled={busyId === "create-category"}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-category" ? "Creando..." : "Crear categoría"}
          </button>
          {categoryOptions.length ? (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-[var(--fg-muted)]">Categorías existentes</p>
              {categoryOptions.map((category) => {
                const productsInCategory = categoryProductCount[category.id] ?? 0;
                const deleteBusyId = `delete-category-${category.id}`;
                const saveBusyId = `save-category-${category.id}`;
                const isInUse = productsInCategory > 0;
                return (
                  <div
                    key={category.id}
                    className="space-y-3 rounded-lg border border-[var(--border)]/50 bg-[var(--surface-3)] p-3"
                  >
                    <div className="grid gap-2">
                      <input
                        value={category.nombre}
                        onChange={(event) =>
                          updateCategoryState(category.id, (current) => ({
                            ...current,
                            nombre: event.target.value,
                          }))
                        }
                        placeholder="Título"
                        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]"
                      />
                      <input
                        value={category.resumen ?? ""}
                        onChange={(event) =>
                          updateCategoryState(category.id, (current) => ({
                            ...current,
                            resumen: event.target.value,
                          }))
                        }
                        placeholder="Resumen breve"
                        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]"
                      />
                      <textarea
                        value={category.descripcion ?? ""}
                        onChange={(event) =>
                          updateCategoryState(category.id, (current) => ({
                            ...current,
                            descripcion: event.target.value,
                          }))
                        }
                        placeholder="Descripción larga"
                        className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]"
                      />
                      <p className="text-xs text-[var(--fg-muted)]">
                        {productsInCategory === 1
                          ? "1 producto asociado"
                          : `${productsInCategory} productos asociados`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveCategory(category)}
                        disabled={busyId === saveBusyId}
                        className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
                      >
                        {busyId === saveBusyId ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCategory(category)}
                        disabled={busyId === deleteBusyId || isInUse}
                        className="rounded-md border border-rose-400 px-3 py-1 text-xs text-rose-600 disabled:opacity-60"
                      >
                        {busyId === deleteBusyId ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          {renderFeedback("create-product")}
          <h2 className="text-xl text-[var(--fg-strong)]">Crear producto</h2>
          <input
            value={newProduct.nombre}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                nombre: event.target.value,
              }))
            }
            placeholder="Nombre del producto"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newProduct.descripcion}
            onChange={(event) =>
              setNewProduct((current) => ({ ...current, descripcion: event.target.value }))
            }
            placeholder="Descripción"
            className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <div className="grid grid-cols-1 gap-2">
            <select
              value={newProduct.categoryId}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, categoryId: event.target.value }))
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            >
              <option value="">Seleccione categoría</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>
          <label className="block text-xs text-[var(--fg-muted)]">
            Subir imagen
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                const url = await uploadImage(file, "upload-image-new-product", "create-product");
                if (url) {
                  setNewProduct((current) => ({
                    ...current,
                    imagenes: [url],
                  }));
                }
                input.value = "";
              }}
              className="mt-1 block w-full text-xs text-[var(--fg-muted)]"
            />
          </label>
          {newProduct.imagenes.length ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {newProduct.imagenes.map((image, index) => (
                <div key={`${image}-${index}`} className="relative h-20 overflow-hidden rounded-lg border border-[var(--border)]">
                  <Image src={image} alt={`Imagen ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setNewProduct((current) => ({
                        ...current,
                        imagenes: current.imagenes.filter((_, imageIndex) => imageIndex !== index),
                      }))
                    }
                    className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-[10px] text-white"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={newProduct.activo}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, activo: event.target.checked }))
              }
            />
            Activo
          </label>
          <button
            type="button"
            onClick={() => void createProduct()}
            disabled={busyId === "create-product"}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-product" ? "Creando..." : "Crear producto"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {renderFeedback("catalog-list")}
        <h2 className="text-2xl text-[var(--fg-strong)]">Productos del catálogo</h2>
        {!catalog?.products.length ? (
          <p className="text-sm text-[var(--fg-muted)]">No hay productos registrados aún.</p>
        ) : null}
        {catalog?.products.map((product) => (
          <article
            key={product.id}
            className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
          >
            {renderFeedback(`product-${product.id}`)}
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={product.nombre}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({ ...current, nombre: event.target.value }))
                }
                className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <textarea
                value={product.descripcion}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    descripcion: event.target.value,
                  }))
                }
                className="min-h-20 rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)] md:col-span-2"
              />
              <select
                value={product.categoryId}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
              <div className="space-y-2 md:col-span-2">
                <p className="text-xs text-[var(--fg-muted)]">
                  Imágenes ({product.imagenes.length}/{MAX_PRODUCT_IMAGES})
                </p>
                {product.imagenes.length ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {product.imagenes.map((image, index) => (
                      <div
                        key={`${product.id}-${index}-${image}`}
                        className="relative h-20 overflow-hidden rounded-lg border border-[var(--border)]"
                      >
                        <Image
                          src={image}
                          alt={`${product.nombre} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateProductState(product.id, (current) => ({
                              ...current,
                              imagenes: current.imagenes.filter((_, imageIndex) => imageIndex !== index),
                            }))
                          }
                          className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-[10px] text-white"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--fg-muted)]">Sin imágenes.</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                <input
                  type="checkbox"
                  checked={product.activo}
                  onChange={(event) =>
                    updateProductState(product.id, (current) => ({
                      ...current,
                      activo: event.target.checked,
                    }))
                  }
                />
                Activo
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveProduct(product)}
                disabled={busyId === `save-product-${product.id}`}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
              >
                {busyId === `save-product-${product.id}` ? "Guardando..." : "Guardar producto"}
              </button>
              <button
                type="button"
                onClick={() => void deleteProduct(product.id)}
                disabled={busyId === `delete-product-${product.id}`}
                className="rounded-lg border border-rose-400 px-4 py-2 text-sm text-rose-600 disabled:opacity-60"
              >
                {busyId === `delete-product-${product.id}` ? "Eliminando..." : "Eliminar producto"}
              </button>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                Subir imagen
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    const url = await uploadImage(file, `upload-image-${product.id}`, `product-${product.id}`);
                    if (url) {
                      updateProductState(product.id, (current) => ({
                        ...current,
                        imagenes: [url],
                      }));
                    }
                    input.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border)]/30 bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-[var(--fg-strong)]">Variantes</h3>
                <button
                  type="button"
                  onClick={() => void createVariant(product.id)}
                  disabled={busyId === `create-variant-${product.id}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
                >
                  {busyId === `create-variant-${product.id}` ? "Creando..." : "Nueva variante"}
                </button>
              </div>
              {product.variantes.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-2 rounded-lg border border-[var(--border)]/30 bg-[var(--surface-2)] p-3 md:grid-cols-6"
                >
                  <div className="md:col-span-6">{renderFeedback(`variant-${variant.id}`)}</div>
                  <input
                    value={variant.nombreVariante}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        nombreVariante: event.target.value,
                      }))
                    }
                    placeholder="Nombre variante (ej. 220g)"
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                    placeholder="SKU"
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={variant.stockVirtual}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        stockVirtual: event.target.value,
                      }))
                    }
                    placeholder="Stock"
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={variant.stockMinimoAlerta}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        stockMinimoAlerta: event.target.value,
                      }))
                    }
                    placeholder="Stock mínimo alerta (0 desactiva)"
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={variant.precio}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        precio: event.target.value,
                      }))
                    }
                    placeholder="Precio final"
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <div className="flex items-center gap-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--fg)]">
                      <input
                        type="checkbox"
                        checked={variant.descuentoActivo}
                        onChange={(event) =>
                          updateVariantState(product.id, variant.id, (current) => ({
                            ...current,
                            descuentoActivo: event.target.checked,
                            descuentoPorcentaje: event.target.checked
                              ? current.descuentoPorcentaje || "1"
                              : "",
                          }))
                        }
                      />
                      Aplicar descuento
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      disabled={!variant.descuentoActivo}
                      value={variant.descuentoPorcentaje}
                      onChange={(event) =>
                        updateVariantState(product.id, variant.id, (current) => ({
                          ...current,
                          descuentoPorcentaje: normalizeDiscountPercentageInput(event.target.value),
                        }))
                      }
                      placeholder="Porcentaje (%)"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--surface-2)] px-2 py-2 text-xs text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <p className="text-xs text-[var(--fg-muted)]">
                      Precio que verá el cliente:{" "}
                      {(() => {
                        const precioBase = Number.parseInt(variant.precio || "0", 10);
                        const porcentaje = Number.parseInt(variant.descuentoPorcentaje || "0", 10);
                        const porcentajeSeguro = Number.isFinite(porcentaje)
                          ? Math.min(Math.max(porcentaje, 0), 100)
                          : 0;
                        const precioFinal =
                          Number.isFinite(precioBase)
                            ? Math.max(
                                Math.round(
                                  (precioBase * (100 - (variant.descuentoActivo ? porcentajeSeguro : 0))) / 100,
                                ),
                                0,
                              )
                            : 0;
                        return `$${precioFinal.toLocaleString("es-CO")}${
                          variant.descuentoActivo ? ` (${porcentajeSeguro}% OFF)` : ""
                        }`;
                      })()}
                    </p>
                    {(() => {
                      const stock = Number.parseInt(variant.stockVirtual || "0", 10);
                      const minimo = Number.parseInt(variant.stockMinimoAlerta || "0", 10);
                      if (!Number.isFinite(stock) || !Number.isFinite(minimo) || minimo <= 0) {
                        return null;
                      }
                      if (stock > minimo) {
                        return null;
                      }
                      return (
                        <p className="mt-1 text-xs font-medium text-amber-500">
                          Alerta activa: stock bajo ({stock}) en o por debajo del mínimo ({minimo}).
                        </p>
                      );
                    })()}
                  </div>
                  <div className="space-y-2 md:col-span-6">
                    <p className="text-xs text-[var(--fg-muted)]">
                      Imagenes de la variante ({variant.imagenes.length}/{MAX_VARIANT_IMAGES})
                    </p>
                    {variant.imagenes.length ? (
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                        {variant.imagenes.map((image, imageIndex) => (
                          <div
                            key={`${variant.id}-image-${imageIndex}-${image}`}
                            className="relative h-16 overflow-hidden rounded-lg border border-[var(--border)]"
                          >
                            <Image
                              src={image}
                              alt={`${variant.nombreVariante} ${imageIndex + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateVariantState(product.id, variant.id, (current) => ({
                                  ...current,
                                  imagenes: current.imagenes.filter((_, idx) => idx !== imageIndex),
                                }))
                              }
                              className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--fg-muted)]">Sin imagenes en esta variante.</p>
                    )}
                    <label className="inline-flex cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                      Subir imagen variante
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          if (variant.imagenes.length >= MAX_VARIANT_IMAGES) {
                            showFeedback(
                              `variant-${variant.id}`,
                              "warning",
                              `Maximo ${MAX_VARIANT_IMAGES} imagenes por variante.`,
                            );
                            input.value = "";
                            return;
                          }
                          const url = await uploadImage(
                            file,
                            `upload-variant-image-${variant.id}`,
                            `variant-${variant.id}`,
                          );
                          if (url) {
                            updateVariantState(product.id, variant.id, (current) => ({
                              ...current,
                              imagenes: [...current.imagenes, url].slice(0, MAX_VARIANT_IMAGES),
                            }));
                          }
                          input.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveVariant(variant)}
                    disabled={busyId === `save-variant-${variant.id}`}
                    className="mt-1 rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)] md:col-span-3"
                  >
                    {busyId === `save-variant-${variant.id}` ? "Guardando..." : "Guardar variante"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteVariant(variant.id)}
                    disabled={busyId === `delete-variant-${variant.id}`}
                    className="mt-1 rounded-md border border-rose-400 px-3 py-2 text-xs text-rose-600 disabled:opacity-60 md:col-span-3"
                  >
                    {busyId === `delete-variant-${variant.id}` ? "Eliminando..." : "Eliminar variante"}
                  </button>
                </div>
              ))}
              {!product.variantes.length ? (
                <p className="text-xs text-[var(--fg-muted)]">Sin variantes todavía.</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

