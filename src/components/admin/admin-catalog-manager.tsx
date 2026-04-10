"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
};

type Variant = {
  id: string;
  productId: string;
  nombreVariante: string;
  sku: string;
  stockVirtual: number;
  precioDelta: number;
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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminCatalogManager() {
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [newProduct, setNewProduct] = useState({
    nombre: "",
    slug: "",
    descripcion: "",
    precioReferencia: 0,
    imagenUrl: "/images/products/",
    categoryId: "",
    activo: true,
  });

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/catalogo", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo cargar el catálogo.");
      }

      const typed = payload as CatalogPayload;
      setCatalog(typed);
      if (typed.categories.length > 0) {
        setNewProduct((current) =>
          current.categoryId
            ? current
            : {
                ...current,
                categoryId: typed.categories[0].id,
              },
        );
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error de carga.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  async function createCategory() {
    if (!newCategoryName.trim()) {
      return;
    }

    setBusyId("create-category");
    setError(null);
    try {
      const response = await fetch("/api/admin/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newCategoryName.trim(),
          slug: toSlug(newCategoryName),
          descripcion: newCategoryDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo crear la categoría.");
      }

      setNewCategoryName("");
      setNewCategoryDescription("");
      await loadCatalog();
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "Error creando categoría.");
    } finally {
      setBusyId(null);
    }
  }

  async function createProduct() {
    if (!newProduct.nombre.trim() || !newProduct.slug.trim()) {
      return;
    }

    setBusyId("create-product");
    setError(null);
    try {
      const response = await fetch("/api/admin/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo crear el producto.");
      }

      setNewProduct((current) => ({
        ...current,
        nombre: "",
        slug: "",
        descripcion: "",
        precioReferencia: 0,
        imagenUrl: "/images/products/",
      }));
      await loadCatalog();
    } catch (productError) {
      setError(productError instanceof Error ? productError.message : "Error creando producto.");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadImage(file: File, busyKey: string) {
    setBusyId(busyKey);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo subir la imagen.");
      }

      return payload.url as string;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error subiendo imagen.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function saveProduct(product: Product) {
    setBusyId(`save-product-${product.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/productos/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          nombre: product.nombre,
          descripcion: product.descripcion,
          precioReferencia: product.precioReferencia,
          imagenUrl: product.imagenes[0] ?? "",
          categoryId: product.categoryId,
          activo: product.activo,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo guardar el producto.");
      }

      await loadCatalog();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando producto.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveVariant(variant: Variant) {
    setBusyId(`save-variant-${variant.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/variantes/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreVariante: variant.nombreVariante,
          sku: variant.sku,
          stockVirtual: variant.stockVirtual,
          precioDelta: variant.precioDelta,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo guardar la variante.");
      }

      await loadCatalog();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando variante.");
    } finally {
      setBusyId(null);
    }
  }

  async function createVariant(productId: string) {
    setBusyId(`create-variant-${productId}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/variantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          nombreVariante: "Nueva variante",
          sku: `SKU-${Math.floor(Math.random() * 100000)}`,
          stockVirtual: 0,
          precioDelta: 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "No se pudo crear la variante.");
      }

      await loadCatalog();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error creando variante.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm("Vas a eliminar este producto y sus variantes. ¿Continuar?");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-product-${productId}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/productos/${productId}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar el producto.");
      }

      await loadCatalog();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando producto.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteVariant(variantId: string) {
    const confirmed = window.confirm("Vas a eliminar esta variante. ¿Continuar?");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-variant-${variantId}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/variantes/${variantId}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la variante.");
      }

      await loadCatalog();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando variante.");
    } finally {
      setBusyId(null);
    }
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

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando catálogo...</p>;
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-xl text-[var(--fg-strong)]">Crear categoría</h2>
          <input
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Nombre de categoría"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newCategoryDescription}
            onChange={(event) => setNewCategoryDescription(event.target.value)}
            placeholder="Descripción (opcional)"
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
        </div>

        <div className="space-y-2">
          <h2 className="text-xl text-[var(--fg-strong)]">Crear producto</h2>
          <input
            value={newProduct.nombre}
            onChange={(event) =>
              setNewProduct((current) => ({
                ...current,
                nombre: event.target.value,
                slug: toSlug(event.target.value),
              }))
            }
            placeholder="Nombre del producto"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <input
            value={newProduct.slug}
            onChange={(event) => setNewProduct((current) => ({ ...current, slug: event.target.value }))}
            placeholder="Slug"
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
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={newProduct.precioReferencia}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  precioReferencia: Number(event.target.value),
                }))
              }
              placeholder="Precio de referencia"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <select
              value={newProduct.categoryId}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, categoryId: event.target.value }))
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            >
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>
          <input
            value={newProduct.imagenUrl}
            onChange={(event) => setNewProduct((current) => ({ ...current, imagenUrl: event.target.value }))}
            placeholder="/images/products/archivo.png"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <label className="block text-xs text-[var(--fg-muted)]">
            Subir imagen
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const url = await uploadImage(file, "upload-image-new-product");
                if (url) {
                  setNewProduct((current) => ({ ...current, imagenUrl: url }));
                }
                event.currentTarget.value = "";
              }}
              className="mt-1 block w-full text-xs text-[var(--fg-muted)]"
            />
          </label>
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
        <h2 className="text-2xl text-[var(--fg-strong)]">Productos del catálogo</h2>
        {!catalog?.products.length ? (
          <p className="text-sm text-[var(--fg-muted)]">No hay productos registrados aún.</p>
        ) : null}
        {catalog?.products.map((product) => (
          <article
            key={product.id}
            className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={product.nombre}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({ ...current, nombre: event.target.value }))
                }
                className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <input
                value={product.slug}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({ ...current, slug: event.target.value }))
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
              <input
                type="number"
                min={0}
                value={product.precioReferencia}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    precioReferencia: Number(event.target.value),
                  }))
                }
                className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
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
              <input
                value={product.imagenes[0] ?? ""}
                onChange={(event) =>
                  updateProductState(product.id, (current) => ({
                    ...current,
                    imagenes: [event.target.value],
                  }))
                }
                className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)] md:col-span-2"
              />
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
            <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
              Subir imagen
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file, `upload-image-${product.id}`);
                  if (url) {
                    updateProductState(product.id, (current) => ({
                      ...current,
                      imagenes: [url],
                    }));
                  }
                  event.currentTarget.value = "";
                }}
                className="w-36 text-xs"
              />
            </label>

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
                  className="grid gap-2 rounded-lg border border-[var(--border)]/30 bg-[var(--surface-2)] p-3 md:grid-cols-4"
                >
                  <input
                    value={variant.nombreVariante}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        nombreVariante: event.target.value,
                      }))
                    }
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
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={variant.stockVirtual}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        stockVirtual: Number(event.target.value),
                      }))
                    }
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    value={variant.precioDelta}
                    onChange={(event) =>
                      updateVariantState(product.id, variant.id, (current) => ({
                        ...current,
                        precioDelta: Number(event.target.value),
                      }))
                    }
                    className="rounded-md border border-[var(--input-border)] bg-[var(--surface-3)] px-2 py-2 text-xs text-[var(--fg)]"
                  />
                  <button
                    type="button"
                    onClick={() => void saveVariant(variant)}
                    disabled={busyId === `save-variant-${variant.id}`}
                    className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)] md:col-span-4"
                  >
                    {busyId === `save-variant-${variant.id}` ? "Guardando..." : "Guardar variante"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteVariant(variant.id)}
                    disabled={busyId === `delete-variant-${variant.id}`}
                    className="rounded-md border border-rose-400 px-3 py-2 text-xs text-rose-600 disabled:opacity-60 md:col-span-4"
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
