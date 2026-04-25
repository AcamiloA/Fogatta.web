"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ThemePalette = "warm" | "night" | "navidad" | "octubre";
type ThemeAnimationType = "none" | "snow" | "sparkles" | "float_icons";

type ThemeItem = {
  id: string;
  slug: string;
  nombre: string;
  palette: ThemePalette;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  heroImageUrl: string | null;
  heroOpacity: number;
  iconImageUrls: string[];
  animationType: ThemeAnimationType;
  animationIntensity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const MAX_THEME_ICONS = 4;

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

function clampOpacity(value: number) {
  if (Number.isNaN(value)) {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeIconSlots(iconImageUrls: string[] | null | undefined) {
  const normalized = (iconImageUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .slice(0, MAX_THEME_ICONS);

  return Array.from({ length: MAX_THEME_ICONS }, (_, index) => normalized[index] ?? "");
}

const paletteOptions: Array<{ value: ThemePalette; label: string }> = [
  { value: "warm", label: "Acento calido" },
  { value: "night", label: "Acento noche" },
  { value: "navidad", label: "Acento festivo" },
  { value: "octubre", label: "Acento mistico" },
];
const animationOptions: Array<{ value: ThemeAnimationType; label: string }> = [
  { value: "none", label: "Sin animacion" },
  { value: "snow", label: "Nieve sutil" },
  { value: "sparkles", label: "Destellos" },
  { value: "float_icons", label: "Iconos flotantes" },
];

export function AdminThemeSettingsManager() {
  const router = useRouter();
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScopedFeedback | null>(null);
  const [newTheme, setNewTheme] = useState({
    nombre: "",
    slug: "",
    slugEdited: false,
    palette: "warm" as ThemePalette,
    animationType: "none" as ThemeAnimationType,
    animationIntensity: 1,
    backgroundOpacity: 100,
    heroOpacity: 100,
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

  const canCreateTheme = useMemo(() => {
    return newTheme.nombre.trim().length >= 2 && newTheme.slug.trim().length >= 2;
  }, [newTheme.nombre, newTheme.slug]);

  const loadThemes = useCallback(async () => {
    const scope = "themes-list";
    setLoading(true);
    clearFeedback(scope);

    try {
      const response = await fetch("/api/admin/configuracion/temas", { cache: "no-store" });
      const payload = (await response.json()) as ThemePayload | ApiErrorPayload;
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar la configuracion de temas."));
      }

      const typed = payload as ThemePayload;
      setThemes(
        typed.themes.map((theme) => ({
          ...theme,
          iconImageUrls: normalizeIconSlots(theme.iconImageUrls),
        })),
      );
      setActiveThemeId(typed.activeThemeId);
    } catch (loadError) {
      showFeedback(
        scope,
        "error",
        loadError instanceof Error ? loadError.message : "Error cargando configuracion.",
      );
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, showFeedback]);

  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  async function createTheme() {
    const scope = "theme-create";
    const nombre = newTheme.nombre.trim();
    const slug = toSlug(newTheme.slug);
    if (!nombre || !slug) {
      showFeedback(scope, "warning", "Nombre o slug invalido.");
      return;
    }

    setBusyId("create-theme");
    clearFeedback(scope);

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
          backgroundOpacity: newTheme.backgroundOpacity,
          heroOpacity: newTheme.heroOpacity,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear el tema."));
      }

      setNewTheme({
        nombre: "",
        slug: "",
        slugEdited: false,
        palette: "warm",
        animationType: "none",
        animationIntensity: 1,
        backgroundOpacity: 100,
        heroOpacity: 100,
      });
      await loadThemes();
      router.refresh();
      showFeedback(scope, "success", "Tema creado correctamente.");
    } catch (createError) {
      showFeedback(
        scope,
        "error",
        createError instanceof Error ? createError.message : "Error creando tema.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function updateThemeState(id: string, updater: (theme: ThemeItem) => ThemeItem) {
    setThemes((current) => current.map((theme) => (theme.id === id ? updater(theme) : theme)));
  }

  async function saveTheme(theme: ThemeItem) {
    const scope = `theme-${theme.id}`;
    setBusyId(`save-${theme.id}`);
    clearFeedback(scope);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: theme.nombre,
          palette: theme.palette,
          backgroundImageUrl: theme.backgroundImageUrl,
          heroImageUrl: theme.heroImageUrl,
          backgroundOpacity: clampOpacity(theme.backgroundOpacity),
          heroOpacity: clampOpacity(theme.heroOpacity),
          iconImageUrls: theme.iconImageUrls
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
            .slice(0, MAX_THEME_ICONS),
          animationType: theme.animationType,
          animationIntensity: Math.min(3, Math.max(1, theme.animationIntensity || 1)),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar el tema."));
      }
      await loadThemes();
      if (theme.id === activeThemeId) {
        router.refresh();
      }
      showFeedback(scope, "success", "Tema guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando tema.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function activateTheme(theme: ThemeItem) {
    const scope = `theme-${theme.id}`;
    setBusyId(`activate-${theme.id}`);
    clearFeedback(scope);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}/activar`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo activar el tema."));
      }
      await loadThemes();
      router.refresh();
      showFeedback(scope, "success", `Tema "${theme.nombre}" activado.`);
    } catch (activateError) {
      showFeedback(
        scope,
        "error",
        activateError instanceof Error ? activateError.message : "Error activando tema.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTheme(theme: ThemeItem) {
    const scope = `theme-${theme.id}`;
    const confirmed = window.confirm(`Vas a eliminar el tema "${theme.nombre}".`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-${theme.id}`);
    clearFeedback(scope);

    try {
      const response = await fetch(`/api/admin/configuracion/temas/${theme.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar el tema."));
      }
      await loadThemes();
      router.refresh();
      showFeedback(scope, "success", "Tema eliminado correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando tema.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function uploadThemeImage(file: File, themeId: string, target: "background" | "hero") {
    const scope = `theme-${themeId}`;
    setBusyId(`upload-${target}-${themeId}`);
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

      const uploadedUrl = payload.url as string;
      updateThemeState(themeId, (theme) =>
        target === "background"
          ? { ...theme, backgroundImageUrl: uploadedUrl }
          : { ...theme, heroImageUrl: uploadedUrl },
      );
      showFeedback(
        scope,
        "success",
        target === "background" ? "Fondo subido correctamente." : "Arte de hero subido correctamente.",
      );
    } catch (uploadError) {
      showFeedback(
        scope,
        "error",
        uploadError instanceof Error ? uploadError.message : "Error subiendo imagen.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function uploadThemeIcon(file: File, themeId: string, iconIndex: number) {
    const scope = `theme-${themeId}`;
    setBusyId(`upload-icon-${themeId}-${iconIndex}`);
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
        throw new Error(resolveApiError(payload, "No se pudo subir el icono."));
      }

      const uploadedUrl = payload.url as string;
      updateThemeState(themeId, (theme) => {
        const nextIcons = normalizeIconSlots(theme.iconImageUrls);
        nextIcons[iconIndex] = uploadedUrl;
        return { ...theme, iconImageUrls: nextIcons };
      });
      showFeedback(scope, "success", `Icono ${iconIndex + 1} subido correctamente.`);
    } catch (uploadError) {
      showFeedback(
        scope,
        "error",
        uploadError instanceof Error ? uploadError.message : "Error subiendo icono.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando configuracion de temas...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        {renderFeedback("theme-create")}
        <h2 className="text-xl text-[var(--fg-strong)]">Crear tema personalizado</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Warm/Night es el modo visual del usuario final. Aqui creas temas libres con tu propio nombre, assets y
          animaciones.
        </p>
        <div className="grid gap-2 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto]">
          <input
            value={newTheme.nombre}
            onChange={(event) =>
              setNewTheme((current) => {
                const nextName = event.target.value;
                return {
                  ...current,
                  nombre: nextName,
                  slug: current.slugEdited ? current.slug : toSlug(nextName),
                };
              })
            }
            placeholder="Nombre del tema (ej. Enero Brillante)"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <input
            value={newTheme.slug}
            onChange={(event) =>
              setNewTheme((current) => ({
                ...current,
                slug: event.target.value,
                slugEdited: true,
              }))
            }
            placeholder="slug (ej. enero-brillante)"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <select
            value={newTheme.palette}
            onChange={(event) =>
              setNewTheme((current) => ({
                ...current,
                palette: event.target.value as ThemePalette,
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
        <div className="grid gap-2 md:grid-cols-2">
          <label className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2">
            <span className="text-xs text-[var(--fg-soft)]">Opacidad fondo: {newTheme.backgroundOpacity}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={newTheme.backgroundOpacity}
              onChange={(event) =>
                setNewTheme((current) => ({
                  ...current,
                  backgroundOpacity: clampOpacity(Number(event.target.value)),
                }))
              }
              className="mt-2 w-full"
            />
          </label>
          <label className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2">
            <span className="text-xs text-[var(--fg-soft)]">Opacidad hero: {newTheme.heroOpacity}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={newTheme.heroOpacity}
              onChange={(event) =>
                setNewTheme((current) => ({
                  ...current,
                  heroOpacity: clampOpacity(Number(event.target.value)),
                }))
              }
              className="mt-2 w-full"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        {renderFeedback("themes-list")}
        <h2 className="text-xl text-[var(--fg-strong)]">Temas disponibles</h2>
        <div className="grid gap-4">
          {themes.map((theme) => {
            return (
              <article
                key={theme.id}
                className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
              >
                {renderFeedback(`theme-${theme.id}`)}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-[var(--fg-soft)]">Slug: {theme.slug}</p>
                    <p className="text-lg text-[var(--fg-strong)]">{theme.nombre}</p>
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
                        accept="image/png,image/jpeg,image/webp,image/avif"
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
                    <label className="block">
                      <span className="text-xs text-[var(--fg-soft)]">Opacidad fondo: {clampOpacity(theme.backgroundOpacity)}%</span>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={clampOpacity(theme.backgroundOpacity)}
                          onChange={(event) =>
                            updateThemeState(theme.id, (current) => ({
                              ...current,
                              backgroundOpacity: clampOpacity(Number(event.target.value)),
                            }))
                          }
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={clampOpacity(theme.backgroundOpacity)}
                          onChange={(event) =>
                            updateThemeState(theme.id, (current) => ({
                              ...current,
                              backgroundOpacity: clampOpacity(Number(event.target.value)),
                            }))
                          }
                          className="w-20 rounded border border-[var(--input-border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)]"
                        />
                      </div>
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
                        accept="image/png,image/jpeg,image/webp,image/avif"
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
                    <label className="block">
                      <span className="text-xs text-[var(--fg-soft)]">Opacidad hero: {clampOpacity(theme.heroOpacity)}%</span>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={clampOpacity(theme.heroOpacity)}
                          onChange={(event) =>
                            updateThemeState(theme.id, (current) => ({
                              ...current,
                              heroOpacity: clampOpacity(Number(event.target.value)),
                            }))
                          }
                          className="w-full"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={clampOpacity(theme.heroOpacity)}
                          onChange={(event) =>
                            updateThemeState(theme.id, (current) => ({
                              ...current,
                              heroOpacity: clampOpacity(Number(event.target.value)),
                            }))
                          }
                          className="w-20 rounded border border-[var(--input-border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)]"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">
                      Iconos flotantes (maximo 4)
                    </p>
                    <div className="space-y-2">
                      {Array.from({ length: MAX_THEME_ICONS }).map((_, iconIndex) => (
                        <div key={`${theme.id}-icon-slot-${iconIndex}`} className="rounded-lg border border-[var(--border)]/45 p-2">
                          <p className="mb-2 text-[11px] text-[var(--fg-soft)]">Icono {iconIndex + 1}</p>
                          <input
                            value={theme.iconImageUrls[iconIndex] ?? ""}
                            onChange={(event) =>
                              updateThemeState(theme.id, (current) => {
                                const nextIcons = normalizeIconSlots(current.iconImageUrls);
                                nextIcons[iconIndex] = event.target.value.trim();
                                return { ...current, iconImageUrls: nextIcons };
                              })
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--fg)]"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--fg-muted)]">
                              Subir
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/avif"
                                className="sr-only"
                                onChange={async (event) => {
                                  const input = event.currentTarget;
                                  const file = input.files?.[0];
                                  if (!file) return;
                                  await uploadThemeIcon(file, theme.id, iconIndex);
                                  input.value = "";
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateThemeState(theme.id, (current) => {
                                  const nextIcons = normalizeIconSlots(current.iconImageUrls);
                                  nextIcons[iconIndex] = "";
                                  return { ...current, iconImageUrls: nextIcons };
                                })
                              }
                              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--fg-muted)]"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    disabled={Boolean(busyId)}
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
