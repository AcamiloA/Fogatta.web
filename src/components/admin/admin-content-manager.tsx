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
  orden: number;
};

type LegalItem = {
  tipo: "privacidad" | "terminos";
  contenido: string;
  fechaVigencia: string;
};

type AdminContentPayload = {
  site: SiteContent;
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
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [legales, setLegales] = useState<LegalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newFaq, setNewFaq] = useState({
    pregunta: "",
    respuesta: "",
    orden: 1,
  });

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/contenido", { cache: "no-store" });
      const payload = (await response.json()) as AdminContentPayload | ApiErrorPayload;
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar contenido."));
      }

      const typed = payload as AdminContentPayload;
      setSite(typed.site);
      setFaq(typed.faq);
      setLegales(typed.legales);
      const maxOrder = typed.faq.reduce((max, item) => Math.max(max, item.orden), 0);
      setNewFaq((current) => ({ ...current, orden: Math.max(1, maxOrder + 1) }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando contenido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  async function saveSiteContent() {
    if (!site) {
      return;
    }

    setBusyId("save-site");
    setError(null);
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando contenido.");
    } finally {
      setBusyId(null);
    }
  }

  async function createFaq() {
    if (!newFaq.pregunta.trim() || !newFaq.respuesta.trim()) {
      setError("FAQ: pregunta y respuesta son obligatorias.");
      return;
    }

    setBusyId("create-faq");
    setError(null);
    try {
      const response = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: newFaq.pregunta,
          respuesta: newFaq.respuesta,
          orden: Number(newFaq.orden),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear FAQ."));
      }
      setNewFaq({ pregunta: "", respuesta: "", orden: Math.max(1, newFaq.orden + 1) });
      await loadContent();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error creando FAQ.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveFaq(item: FaqItem) {
    setBusyId(`save-faq-${item.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/faq/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: item.pregunta,
          respuesta: item.respuesta,
          orden: Number(item.orden),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar FAQ."));
      }
      await loadContent();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando FAQ.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFaq(item: FaqItem) {
    const confirmed = window.confirm(`Vas a eliminar la FAQ: "${item.pregunta}".`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-faq-${item.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/faq/${item.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar FAQ."));
      }
      await loadContent();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando FAQ.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveLegal(item: LegalItem) {
    setBusyId(`save-legal-${item.tipo}`);
    setError(null);
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando legal.");
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
      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
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
        <h2 className="text-xl text-[var(--fg-strong)]">FAQ</h2>
        <div className="grid gap-2">
          <input
            value={newFaq.pregunta}
            onChange={(event) => setNewFaq((current) => ({ ...current, pregunta: event.target.value }))}
            placeholder="Pregunta"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newFaq.respuesta}
            onChange={(event) => setNewFaq((current) => ({ ...current, respuesta: event.target.value }))}
            placeholder="Respuesta"
            className="min-h-24 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
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
                className="min-h-24 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
              />
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
