"use client";

import { useCallback, useEffect, useState } from "react";

type SiteContent = {
  heroTitulo: string;
  heroDescripcion: string;
  nosotrosTitulo: string;
  nosotrosHistoria: string;
  nosotrosPromesa: string;
};

type FaqItem = {
  id: string;
  pregunta: string;
  respuesta: string;
  faqCategoryId: string | null;
  orden: number;
};

type FaqCategory = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
};

type LegalItem = {
  tipo: "privacidad" | "terminos";
  contenido: string;
  fechaVigencia: string;
};

type AdminContentPayload = {
  site: SiteContent;
  faqCategories: FaqCategory[];
  faq: FaqItem[];
  legales: LegalItem[];
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

const FAQ_RESPONSE_MAX_CHARACTERS = 800;

function resolveApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const typed = payload as ApiErrorPayload;
  if (typed.error && typed.error.trim()) {
    return typed.error;
  }

  const formError = typed.details?.formErrors?.find((message) => Boolean(message?.trim()));
  if (formError) {
    return formError;
  }

  const firstField = Object.values(typed.details?.fieldErrors ?? {})
    .flat()
    .find((message) => Boolean(message?.trim()));
  if (firstField) {
    return firstField;
  }

  return fallback;
}

export function AdminContentManager() {
  const [site, setSite] = useState<SiteContent | null>(null);
  const [faqCategories, setFaqCategories] = useState<FaqCategory[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [legales, setLegales] = useState<LegalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<ScopedFeedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newFaq, setNewFaq] = useState({
    faqCategoryId: "",
    pregunta: "",
    respuesta: "",
    orden: 1,
  });
  const [newFaqCategory, setNewFaqCategory] = useState({
    nombre: "",
    descripcion: "",
    orden: 1,
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

  const loadContent = useCallback(async () => {
    const scope = "load-content";
    setLoading(true);
    clearFeedback(scope);

    try {
      const response = await fetch("/api/admin/contenido", { cache: "no-store" });
      const payload = (await response.json()) as AdminContentPayload | ApiErrorPayload;
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar contenido."));
      }

      const typed = payload as AdminContentPayload;
      setSite(typed.site);
      setFaqCategories(typed.faqCategories);
      setFaq(typed.faq);
      setLegales(typed.legales);
      const maxOrder = typed.faq.reduce((max, item) => Math.max(max, item.orden), 0);
      const maxCategoryOrder = typed.faqCategories.reduce((max, item) => Math.max(max, item.orden), 0);
      setNewFaq((current) => ({
        ...current,
        faqCategoryId: typed.faqCategories[0]?.id ?? "",
        orden: Math.max(1, maxOrder + 1),
      }));
      setNewFaqCategory((current) => ({
        ...current,
        orden: Math.max(1, maxCategoryOrder + 1),
      }));
    } catch (loadError) {
      showFeedback(
        scope,
        "error",
        loadError instanceof Error ? loadError.message : "Error cargando contenido.",
      );
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, showFeedback]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  async function saveSiteContent() {
    const scope = "site-content";
    if (!site) {
      return;
    }

    setBusyId("save-site");
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/contenido", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar contenido principal."));
      }
      await loadContent();
      showFeedback(scope, "success", "Contenido principal guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando contenido.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createFaqCategory() {
    const scope = "faq-category-create";
    const nombre = newFaqCategory.nombre.trim();
    const orden = Number(newFaqCategory.orden);

    if (!nombre) {
      showFeedback(scope, "warning", "Categoria FAQ: nombre obligatorio.");
      return;
    }
    if (nombre.length < 3) {
      showFeedback(scope, "warning", "Categoria FAQ: minimo 3 caracteres.");
      return;
    }
    if (!Number.isInteger(orden) || orden < 1 || orden > 999) {
      showFeedback(scope, "warning", "Categoria FAQ: el orden debe estar entre 1 y 999.");
      return;
    }

    setBusyId("create-faq-category");
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/faq/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion: newFaqCategory.descripcion.trim() || undefined,
          orden,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear categoria FAQ."));
      }
      setNewFaqCategory((current) => ({ ...current, nombre: "", descripcion: "" }));
      await loadContent();
      showFeedback(scope, "success", "Categoria FAQ creada correctamente.");
    } catch (createError) {
      showFeedback(
        scope,
        "error",
        createError instanceof Error ? createError.message : "Error creando categoria FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveFaqCategory(category: FaqCategory) {
    const scope = `faq-category-${category.id}`;
    setBusyId(`save-faq-category-${category.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/faq/categorias/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: category.nombre,
          descripcion: category.descripcion,
          orden: Number(category.orden),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar categoria FAQ."));
      }
      await loadContent();
      showFeedback(scope, "success", "Categoria FAQ guardada correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando categoria FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFaqCategory(category: FaqCategory) {
    const scope = `faq-category-${category.id}`;
    const confirmed = window.confirm(`Vas a eliminar la categoria FAQ: "${category.nombre}".`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-faq-category-${category.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/faq/categorias/${category.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar categoria FAQ."));
      }
      await loadContent();
      showFeedback(scope, "success", "Categoria FAQ eliminada correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando categoria FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createFaq() {
    const scope = "faq-create";
    const faqCategoryId = newFaq.faqCategoryId.trim();
    const pregunta = newFaq.pregunta.trim();
    const respuesta = newFaq.respuesta.trim();
    const orden = Number(newFaq.orden);

    if (!faqCategoryId) {
      showFeedback(scope, "warning", "FAQ: selecciona una categoria.");
      return;
    }

    if (!pregunta || !respuesta) {
      showFeedback(scope, "warning", "FAQ: pregunta y respuesta son obligatorias.");
      return;
    }

    if (pregunta.length < 6) {
      showFeedback(scope, "warning", "FAQ: la pregunta debe tener minimo 6 caracteres.");
      return;
    }

    if (respuesta.length < 8) {
      showFeedback(scope, "warning", "FAQ: la respuesta debe tener minimo 8 caracteres.");
      return;
    }
    if (respuesta.length > FAQ_RESPONSE_MAX_CHARACTERS) {
      showFeedback(scope, "warning", `FAQ: la respuesta no puede superar ${FAQ_RESPONSE_MAX_CHARACTERS} caracteres.`);
      return;
    }

    if (!Number.isInteger(orden) || orden < 1 || orden > 999) {
      showFeedback(scope, "warning", "FAQ: el orden debe estar entre 1 y 999.");
      return;
    }

    setBusyId("create-faq");
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faqCategoryId,
          pregunta,
          respuesta,
          orden,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear FAQ."));
      }
      setNewFaq((current) => ({
        ...current,
        pregunta: "",
        respuesta: "",
        orden: Math.max(1, current.orden + 1),
      }));
      await loadContent();
      showFeedback(scope, "success", "FAQ creada correctamente.");
    } catch (createError) {
      showFeedback(
        scope,
        "error",
        createError instanceof Error ? createError.message : "Error creando FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveFaq(item: FaqItem) {
    const scope = `faq-${item.id}`;
    if (item.respuesta.trim().length > FAQ_RESPONSE_MAX_CHARACTERS) {
      showFeedback(scope, "warning", `FAQ: la respuesta no puede superar ${FAQ_RESPONSE_MAX_CHARACTERS} caracteres.`);
      return;
    }
    setBusyId(`save-faq-${item.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/faq/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: item.pregunta,
          respuesta: item.respuesta,
          faqCategoryId: item.faqCategoryId,
          orden: Number(item.orden),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar FAQ."));
      }
      await loadContent();
      showFeedback(scope, "success", "FAQ guardada correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFaq(item: FaqItem) {
    const scope = `faq-${item.id}`;
    const confirmed = window.confirm(`Vas a eliminar la FAQ: "${item.pregunta}".`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-faq-${item.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/faq/${item.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar FAQ."));
      }
      await loadContent();
      showFeedback(scope, "success", "FAQ eliminada correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando FAQ.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveLegal(item: LegalItem) {
    const scope = `legal-${item.tipo}`;
    setBusyId(`save-legal-${item.tipo}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/legal/${item.tipo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contenido: item.contenido,
          fechaVigencia: item.fechaVigencia,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar documento legal."));
      }
      await loadContent();
      showFeedback(scope, "success", "Documento legal guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando legal.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando contenido...</p>;
  }

  if (!site) {
    return (
      <p className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        No se pudo cargar el contenido base.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {renderFeedback("load-content")}
      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        {renderFeedback("site-content")}
        <h2 className="text-xl text-[var(--fg-strong)]">Hero y Nosotros</h2>
        <input
          value={site.heroTitulo}
          onChange={(event) => setSite((current) => (current ? { ...current, heroTitulo: event.target.value } : current))}
          placeholder="Titulo principal del hero"
          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
        <textarea
          value={site.heroDescripcion}
          onChange={(event) =>
            setSite((current) => (current ? { ...current, heroDescripcion: event.target.value } : current))
          }
          placeholder="Descripcion del hero"
          className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
        <input
          value={site.nosotrosTitulo}
          onChange={(event) =>
            setSite((current) => (current ? { ...current, nosotrosTitulo: event.target.value } : current))
          }
          placeholder="Titulo de seccion Nosotros"
          className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
        <textarea
          value={site.nosotrosHistoria}
          onChange={(event) =>
            setSite((current) => (current ? { ...current, nosotrosHistoria: event.target.value } : current))
          }
          placeholder="Historia de marca"
          className="min-h-28 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
        <textarea
          value={site.nosotrosPromesa}
          onChange={(event) =>
            setSite((current) => (current ? { ...current, nosotrosPromesa: event.target.value } : current))
          }
          placeholder="Promesa de marca"
          className="min-h-24 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />
        <button
          type="button"
          onClick={() => void saveSiteContent()}
          disabled={busyId === "save-site"}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
        >
          {busyId === "save-site" ? "Guardando..." : "Guardar contenido principal"}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        {renderFeedback("faq-category-create")}
        {renderFeedback("faq-create")}
        <h2 className="text-xl text-[var(--fg-strong)]">FAQ</h2>
        <div className="space-y-3 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--fg-soft)]">
            Categorias FAQ
          </h3>
          <div className="grid gap-2 md:grid-cols-[1.4fr,2fr,100px,auto]">
            <input
              value={newFaqCategory.nombre}
              onChange={(event) =>
                setNewFaqCategory((current) => ({ ...current, nombre: event.target.value }))
              }
              placeholder="Nombre de categoria"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <input
              value={newFaqCategory.descripcion}
              onChange={(event) =>
                setNewFaqCategory((current) => ({ ...current, descripcion: event.target.value }))
              }
              placeholder="Descripcion breve (opcional)"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <input
              type="number"
              min={1}
              value={newFaqCategory.orden}
              onChange={(event) =>
                setNewFaqCategory((current) => ({
                  ...current,
                  orden: Number(event.target.value) || 1,
                }))
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <button
              type="button"
              onClick={() => void createFaqCategory()}
              disabled={busyId === "create-faq-category"}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
            >
              {busyId === "create-faq-category" ? "Creando..." : "Crear"}
            </button>
          </div>

          <div className="space-y-2">
            {faqCategories.map((category) => (
              <article
                key={category.id}
                className="space-y-2 rounded-lg border border-[var(--border)]/40 bg-[var(--surface)] p-3"
              >
                {renderFeedback(`faq-category-${category.id}`)}
                <div className="grid gap-2 md:grid-cols-[1.4fr,2fr,100px]">
                  <input
                    value={category.nombre}
                    onChange={(event) =>
                      setFaqCategories((current) =>
                        current.map((entry) =>
                          entry.id === category.id ? { ...entry, nombre: event.target.value } : entry,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  />
                  <input
                    value={category.descripcion ?? ""}
                    onChange={(event) =>
                      setFaqCategories((current) =>
                        current.map((entry) =>
                          entry.id === category.id
                            ? { ...entry, descripcion: event.target.value || null }
                            : entry,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  />
                  <input
                    type="number"
                    min={1}
                    value={category.orden}
                    onChange={(event) =>
                      setFaqCategories((current) =>
                        current.map((entry) =>
                          entry.id === category.id
                            ? { ...entry, orden: Number(event.target.value) || 1 }
                            : entry,
                        ),
                      )
                    }
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveFaqCategory(category)}
                    disabled={busyId === `save-faq-category-${category.id}`}
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
                  >
                    {busyId === `save-faq-category-${category.id}`
                      ? "Guardando..."
                      : "Guardar categoria"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteFaqCategory(category)}
                    disabled={busyId === `delete-faq-category-${category.id}`}
                    className="rounded-lg border border-rose-400 px-3 py-2 text-xs text-rose-600 disabled:opacity-60"
                  >
                    {busyId === `delete-faq-category-${category.id}` ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </article>
            ))}
            {!faqCategories.length ? (
              <p className="text-sm text-[var(--fg-muted)]">Aun no hay categorias FAQ.</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <select
            value={newFaq.faqCategoryId}
            onChange={(event) =>
              setNewFaq((current) => ({ ...current, faqCategoryId: event.target.value }))
            }
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            <option value="">Seleccione categoria FAQ</option>
            {faqCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nombre}
              </option>
            ))}
          </select>
          <input
            value={newFaq.pregunta}
            onChange={(event) => setNewFaq((current) => ({ ...current, pregunta: event.target.value }))}
            placeholder="Pregunta"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newFaq.respuesta}
            onChange={(event) => setNewFaq((current) => ({ ...current, respuesta: event.target.value }))}
            maxLength={FAQ_RESPONSE_MAX_CHARACTERS}
            placeholder="Respuesta"
            className="min-h-24 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <p className="text-xs text-[var(--fg-soft)]">
            Caracteres disponibles: {FAQ_RESPONSE_MAX_CHARACTERS - newFaq.respuesta.length}
          </p>
          <input
            type="number"
            min={1}
            value={newFaq.orden}
            onChange={(event) =>
              setNewFaq((current) => ({ ...current, orden: Number(event.target.value) || 1 }))
            }
            placeholder="Orden"
            className="w-28 rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <button
            type="button"
            onClick={() => void createFaq()}
            disabled={busyId === "create-faq"}
            className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-faq" ? "Creando..." : "Crear FAQ"}
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {faq.map((item) => (
            <article
              key={item.id}
              className="space-y-2 rounded-xl border border-[var(--border)]/40 bg-[var(--surface-3)] p-4"
            >
              {renderFeedback(`faq-${item.id}`)}
              <select
                value={item.faqCategoryId ?? ""}
                onChange={(event) =>
                  setFaq((current) =>
                    current.map((entry) =>
                      entry.id === item.id
                        ? { ...entry, faqCategoryId: event.target.value || null }
                        : entry,
                    ),
                  )
                }
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              >
                <option value="">Sin categoria</option>
                {faqCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
              <input
                value={item.pregunta}
                onChange={(event) =>
                  setFaq((current) =>
                    current.map((entry) =>
                      entry.id === item.id ? { ...entry, pregunta: event.target.value } : entry,
                    ),
                  )
                }
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <textarea
                value={item.respuesta}
                onChange={(event) =>
                  setFaq((current) =>
                    current.map((entry) =>
                      entry.id === item.id ? { ...entry, respuesta: event.target.value } : entry,
                    ),
                  )
                }
                maxLength={FAQ_RESPONSE_MAX_CHARACTERS}
                className="min-h-24 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <p className="text-xs text-[var(--fg-soft)]">
                Caracteres disponibles: {FAQ_RESPONSE_MAX_CHARACTERS - item.respuesta.length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={item.orden}
                  onChange={(event) =>
                    setFaq((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, orden: Number(event.target.value) || 1 }
                          : entry,
                      ),
                    )
                  }
                  className="w-24 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--fg)]"
                />
                <button
                  type="button"
                  onClick={() => void saveFaq(item)}
                  disabled={busyId === `save-faq-${item.id}`}
                  className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
                >
                  {busyId === `save-faq-${item.id}` ? "Guardando..." : "Guardar FAQ"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteFaq(item)}
                  disabled={busyId === `delete-faq-${item.id}`}
                  className="rounded-lg border border-rose-400 px-3 py-2 text-xs text-rose-600 disabled:opacity-60"
                >
                  {busyId === `delete-faq-${item.id}` ? "Eliminando..." : "Eliminar FAQ"}
                </button>
              </div>
            </article>
          ))}
          {!faq.length ? <p className="text-sm text-[var(--fg-muted)]">No hay FAQs creadas.</p> : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        <h2 className="text-xl text-[var(--fg-strong)]">Documentos legales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {legales.map((item) => (
            <article key={item.tipo} className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
              {renderFeedback(`legal-${item.tipo}`)}
              <h3 className="text-sm uppercase tracking-wide text-[var(--fg-soft)]">
                {item.tipo === "privacidad" ? "Privacidad" : "Terminos"}
              </h3>
              <input
                type="date"
                value={item.fechaVigencia}
                onChange={(event) =>
                  setLegales((current) =>
                    current.map((entry) =>
                      entry.tipo === item.tipo
                        ? { ...entry, fechaVigencia: event.target.value }
                        : entry,
                    ),
                  )
                }
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <textarea
                value={item.contenido}
                onChange={(event) =>
                  setLegales((current) =>
                    current.map((entry) =>
                      entry.tipo === item.tipo ? { ...entry, contenido: event.target.value } : entry,
                    ),
                  )
                }
                className="min-h-40 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              />
              <button
                type="button"
                onClick={() => void saveLegal(item)}
                disabled={busyId === `save-legal-${item.tipo}`}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
              >
                {busyId === `save-legal-${item.tipo}` ? "Guardando..." : "Guardar"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
