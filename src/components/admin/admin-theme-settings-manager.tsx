"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ThemePalette = "navidad" | "octubre";
type ThemeAnimationType = "none" | "snow" | "sparkles" | "float_icons";

type ThemeItem = {
  id: string;
  slug: string;
  nombre: string;
  palette: ThemePalette;
  backgroundImageUrl: string | null;
  heroImageUrl: string | null;
  iconImageUrl: string | null;
  animationType: ThemeAnimationType;
  animationIntensity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ThemePayload = {
  activeThemeId: string | null;
  themes: ThemeItem[];
};

type ValidationDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

type ApiErrorPayload = {
  error?: string;
  details?: ValidationDetails;
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

  const firstFieldError = Object.values(typed.details?.fieldErrors ?? {})
    .flat()
    .find((message) => Boolean(message?.trim()));
  if (firstFieldError) {
    return firstFieldError;
  }

  return fallback;
}

const paletteOptions: Array<{ value: ThemePalette; label: string }> = [
  { value: "navidad", label: "Navidad" },
  { value: "octubre", label: "Octubre" },
];
const animationOptions: Array<{ value: ThemeAnimationType; label: string }> = [
  { value: "none", label: "Sin animacion" },
  { value: "snow", label: "Nieve sutil" },
  { value: "sparkles", label: "Destellos" },
  { value: "float_icons", label: "Iconos flotantes" },
];
const baseThemeSlugs = new Set(["navidad", "octubre"]);

function defaultAnimationForPalette(palette: ThemePalette): ThemeAnimationType {
  return palette === "octubre" ? "float_icons" : "snow";
}

export function AdminThemeSettingsManager() {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTheme, setNewTheme] = useState({
    nombre: "",
    palette: "navidad" as ThemePalette,
    animationType: "snow" as ThemeAnimationType,
    animationIntensity: 1,
  });

  const canCreateTheme = useMemo(() => {
    return newTheme.nombre.trim().length >= 2;
  }, [newTheme.nombre]);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/configuracion/temas", { cache: "no-store" });
      const payload = (await response.json()) as ThemePayload | ApiErrorPayload;
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar la configuracion de temas."));
      }

      const typed = payload as ThemePayload;
      setThemes(typed.themes);
      setActiveThemeId(typed.activeThemeId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando configuracion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  async function createTheme() {
    const nombre = newTheme.nombre.trim();
    const slug = toSlug(nombre);
    if (!nombre || !slug) {
      setError("Nombre de tema invalido.");
      return;
    }

    setBusyId("create-theme");
    setError(null);

    try {
      const response = await fetch("/api/admin/configuracion/temas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          slug,
          palette: newTheme.palette,
          animationType: newTheme.animationType,
          animationIntensity: newTheme.animationIntensity,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear el tema."));
      }

      setNewTheme({ nombre: "", palette: "navidad", animationType: "snow", animationIntensity: 1 });
      await loadThemes();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error creando tema.");
    } finally {
      setBusyId(null);
    }
  }

  function updateThemeState(id: string, updater: (theme: ThemeItem) => ThemeItem) {
    setThemes((current) => current.map((theme) => (theme.id === id ? updater(theme) : theme)));
  }

  async function saveTheme(theme: ThemeItem) {
    setBusyId(`save-${theme.id}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: theme.nombre,
          palette: theme.palette,
          backgroundImageUrl: theme.backgroundImageUrl,
          heroImageUrl: theme.heroImageUrl,
          iconImageUrl: theme.iconImageUrl,
          animationType: theme.animationType,
          animationIntensity: Math.min(3, Math.max(1, theme.animationIntensity || 1)),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar el tema."));
      }
      await loadThemes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando tema.");
    } finally {
      setBusyId(null);
    }
  }

  async function activateTheme(theme: ThemeItem) {
    setBusyId(`activate-${theme.id}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}/activar`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo activar el tema."));
      }
      await loadThemes();
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Error activando tema.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTheme(theme: ThemeItem) {
    const confirmed = window.confirm(`Vas a eliminar el tema "${theme.nombre}".`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-${theme.id}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar el tema."));
      }
      await loadThemes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando tema.");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadThemeImage(file: File, themeId: string, target: "background" | "hero" | "icon") {
    setBusyId(`upload-${target}-${themeId}`);
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
        throw new Error(resolveApiError(payload, "No se pudo subir la imagen."));
      }

      const uploadedUrl = payload.url as string;
      updateThemeState(themeId, (theme) =>
        target === "background"
          ? { ...theme, backgroundImageUrl: uploadedUrl }
          : target === "hero"
            ? { ...theme, heroImageUrl: uploadedUrl }
            : { ...theme, iconImageUrl: uploadedUrl },
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error subiendo imagen.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando configuracion de temas...</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        <h2 className="text-xl text-[var(--fg-strong)]">Crear tema de temporada</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Warm y Night son modo visual del usuario. Aqui solo gestionas temporadas (Navidad/Octubre) con efectos.
        </p>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input
            value={newTheme.nombre}
            onChange={(event) =>
              setNewTheme((current) => ({ ...current, nombre: event.target.value }))
            }
            placeholder="Nombre del tema (ej. San Valentin 2027)"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <select
            value={newTheme.palette}
            onChange={(event) =>
              setNewTheme((current) => ({
                ...current,
                palette: event.target.value as ThemePalette,
                animationType: defaultAnimationForPalette(event.target.value as ThemePalette),
              }))
            }
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            {paletteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={newTheme.animationType}
            onChange={(event) =>
              setNewTheme((current) => ({
                ...current,
                animationType: event.target.value as ThemeAnimationType,
              }))
            }
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            {animationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={newTheme.animationIntensity}
            onChange={(event) =>
              setNewTheme((current) => ({
                ...current,
                animationIntensity: Math.min(3, Math.max(1, Number(event.target.value) || 1)),
              }))
            }
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            <option value={1}>Intensidad baja</option>
            <option value={2}>Intensidad media</option>
            <option value={3}>Intensidad alta</option>
          </select>
          <button
            type="button"
            onClick={() => void createTheme()}
            disabled={busyId === "create-theme" || !canCreateTheme}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-theme" ? "Creando..." : "Crear"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-[var(--fg-strong)]">Temas disponibles</h2>
        <div className="grid gap-4">
          {themes.map((theme) => {
            const isBaseTheme = baseThemeSlugs.has(theme.slug);

            return (
              <article
                key={theme.id}
                className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-[var(--fg-soft)]">Slug: {theme.slug}</p>
                    <p className="text-lg text-[var(--fg-strong)]">{theme.nombre}</p>
                    {isBaseTheme ? (
                      <p className="text-xs text-[var(--fg-soft)]">Tema base protegido</p>
                    ) : null}
                  </div>
                  {activeThemeId === theme.id ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Tema activo
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={theme.nombre}
                    onChange={(event) =>
                      updateThemeState(theme.id, (current) => ({ ...current, nombre: event.target.value }))
                    }
                    className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  />
                  <select
                    value={theme.palette}
                    onChange={(event) =>
                      updateThemeState(theme.id, (current) => ({
                        ...current,
                        palette: event.target.value as ThemePalette,
                        animationType: defaultAnimationForPalette(event.target.value as ThemePalette),
                      }))
                    }
                    className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  >
                    {paletteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
                  <select
                    value={theme.animationType}
                    onChange={(event) =>
                      updateThemeState(theme.id, (current) => ({
                        ...current,
                        animationType: event.target.value as ThemeAnimationType,
                      }))
                    }
                    className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  >
                    {animationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={Math.min(3, Math.max(1, theme.animationIntensity || 1))}
                    onChange={(event) =>
                      updateThemeState(theme.id, (current) => ({
                        ...current,
                        animationIntensity: Math.min(3, Math.max(1, Number(event.target.value) || 1)),
                      }))
                    }
                    className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
                  >
                    <option value={1}>Intensidad baja</option>
                    <option value={2}>Intensidad media</option>
                    <option value={3}>Intensidad alta</option>
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">Imagen de fondo global</p>
                    <input
                      value={theme.backgroundImageUrl ?? ""}
                      onChange={(event) =>
                        updateThemeState(theme.id, (current) => ({
                          ...current,
                          backgroundImageUrl: event.target.value.trim() || null,
                        }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                    />
                    <label className="inline-flex cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                      Subir fondo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          await uploadThemeImage(file, theme.id, "background");
                          input.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">Arte de hero</p>
                    <input
                      value={theme.heroImageUrl ?? ""}
                      onChange={(event) =>
                        updateThemeState(theme.id, (current) => ({
                          ...current,
                          heroImageUrl: event.target.value.trim() || null,
                        }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                    />
                    <label className="inline-flex cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                      Subir arte hero
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          await uploadThemeImage(file, theme.id, "hero");
                          input.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">Icono flotante (opcional)</p>
                    <input
                      value={theme.iconImageUrl ?? ""}
                      onChange={(event) =>
                        updateThemeState(theme.id, (current) => ({
                          ...current,
                          iconImageUrl: event.target.value.trim() || null,
                        }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
                    />
                    <label className="inline-flex cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--fg-muted)]">
                      Subir icono
                      <input
                        type="file"
                        accept="image/png,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          await uploadThemeImage(file, theme.id, "icon");
                          input.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveTheme(theme)}
                    disabled={Boolean(busyId)}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
                  >
                    {busyId === `save-${theme.id}` ? "Guardando..." : "Guardar tema"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void activateTheme(theme)}
                    disabled={Boolean(busyId) || activeThemeId === theme.id}
                    className="rounded-lg border border-[var(--accent)]/50 px-4 py-2 text-xs text-[var(--fg-strong)] disabled:opacity-60"
                  >
                    {busyId === `activate-${theme.id}` ? "Aplicando..." : "Aplicar tema"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteTheme(theme)}
                    disabled={Boolean(busyId) || isBaseTheme}
                    title={isBaseTheme ? "Los temas base no se pueden eliminar." : undefined}
                    className="rounded-lg border border-rose-400 px-4 py-2 text-xs text-rose-600 disabled:opacity-60"
                  >
                    {busyId === `delete-${theme.id}` ? "Eliminando..." : "Eliminar tema"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
