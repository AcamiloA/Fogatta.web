"use client";

import { useCallback, useEffect, useState } from "react";

type BlogPost = {
  id: string;
  slug: string;
  titulo: string;
  autor: string;
  extracto: string;
  contenido: string;
  fechaPublicacion: string;
  createdAt: string;
  updatedAt: string;
};

type BlogPayload = {
  posts: BlogPost[];
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

const BLOG_EXTRACT_MAX_CHARACTERS = 400;
const BLOG_CONTENT_MAX_CHARACTERS = 12000;

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

  if (typed.error && typed.error.trim()) {
    return typed.error;
  }

  return fallback;
}

export function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<ScopedFeedback | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newPost, setNewPost] = useState({
    titulo: "",
    autor: "",
    extracto: "",
    contenido: "",
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

  const loadPosts = useCallback(async () => {
    const scope = "blog-list";
    setLoading(true);
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/blog", { cache: "no-store" });
      const payload = (await response.json()) as BlogPayload | ApiErrorPayload;
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo cargar el blog."));
      }

      setPosts((payload as BlogPayload).posts);
    } catch (loadError) {
      showFeedback(scope, "error", loadError instanceof Error ? loadError.message : "Error de carga.");
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, showFeedback]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function createPost() {
    const scope = "blog-create";
    const titulo = newPost.titulo.trim();
    const autor = newPost.autor.trim();
    const extracto = newPost.extracto.trim();
    const contenido = newPost.contenido.trim();
    const slug = toSlug(titulo);

    if (!titulo || !slug) {
      showFeedback(scope, "warning", "Ingresa un título válido.");
      return;
    }
    if (titulo.length < 2 || titulo.length > 180) {
      showFeedback(scope, "warning", "El título debe tener entre 2 y 180 caracteres.");
      return;
    }
    if (!autor) {
      showFeedback(scope, "warning", "Ingresa el autor del artículo.");
      return;
    }
    if (autor.length < 2 || autor.length > 120) {
      showFeedback(scope, "warning", "El autor debe tener entre 2 y 120 caracteres.");
      return;
    }
    if (!extracto) {
      showFeedback(scope, "warning", "Ingresa un extracto.");
      return;
    }
    if (extracto.length < 8 || extracto.length > BLOG_EXTRACT_MAX_CHARACTERS) {
      showFeedback(
        scope,
        "warning",
        `El extracto debe tener entre 8 y ${BLOG_EXTRACT_MAX_CHARACTERS} caracteres.`,
      );
      return;
    }
    if (!contenido) {
      showFeedback(scope, "warning", "Ingresa el contenido del artículo.");
      return;
    }
    if (contenido.length < 20 || contenido.length > BLOG_CONTENT_MAX_CHARACTERS) {
      showFeedback(
        scope,
        "warning",
        `El contenido debe tener entre 20 y ${BLOG_CONTENT_MAX_CHARACTERS} caracteres.`,
      );
      return;
    }

    setBusyId("create-post");
    clearFeedback(scope);
    try {
      const response = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          titulo,
          autor,
          extracto,
          contenido,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo crear el artículo."));
      }

      setNewPost({
        titulo: "",
        autor: "",
        extracto: "",
        contenido: "",
      });
      await loadPosts();
      showFeedback(scope, "success", "Artículo creado correctamente.");
    } catch (createError) {
      showFeedback(
        scope,
        "error",
        createError instanceof Error ? createError.message : "Error creando artículo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function savePost(post: BlogPost) {
    const scope = `blog-post-${post.id}`;
    const titulo = post.titulo.trim();
    const autor = post.autor.trim();
    const extracto = post.extracto.trim();
    const contenido = post.contenido.trim();
    const slug = toSlug(titulo);

    if (!titulo || !slug) {
      showFeedback(scope, "warning", "El título del artículo no es válido.");
      return;
    }
    if (titulo.length < 2 || titulo.length > 180) {
      showFeedback(scope, "warning", "El título debe tener entre 2 y 180 caracteres.");
      return;
    }
    if (!autor) {
      showFeedback(scope, "warning", "Autor: valor obligatorio.");
      return;
    }
    if (autor.length < 2 || autor.length > 120) {
      showFeedback(scope, "warning", "El autor debe tener entre 2 y 120 caracteres.");
      return;
    }
    if (!extracto || !contenido) {
      showFeedback(scope, "warning", "Extracto y contenido son obligatorios.");
      return;
    }
    if (extracto.length < 8 || extracto.length > BLOG_EXTRACT_MAX_CHARACTERS) {
      showFeedback(
        scope,
        "warning",
        `El extracto debe tener entre 8 y ${BLOG_EXTRACT_MAX_CHARACTERS} caracteres.`,
      );
      return;
    }
    if (contenido.length < 20 || contenido.length > BLOG_CONTENT_MAX_CHARACTERS) {
      showFeedback(
        scope,
        "warning",
        `El contenido debe tener entre 20 y ${BLOG_CONTENT_MAX_CHARACTERS} caracteres.`,
      );
      return;
    }

    setBusyId(`save-post-${post.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          titulo,
          autor,
          extracto,
          contenido,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo guardar el artículo."));
      }

      await loadPosts();
      showFeedback(scope, "success", "Artículo guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando artículo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deletePost(post: BlogPost) {
    const scope = `blog-post-${post.id}`;
    const confirmed = window.confirm(`Vas a eliminar "${post.titulo}". Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-post-${post.id}`);
    clearFeedback(scope);
    try {
      const response = await fetch(`/api/admin/blog/${post.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(resolveApiError(payload, "No se pudo eliminar el artículo."));
      }

      await loadPosts();
      showFeedback(scope, "success", "Artículo eliminado correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando artículo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function updatePostState(postId: string, updater: (post: BlogPost) => BlogPost) {
    setPosts((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  }

  if (loading) {
    return <p className="text-sm text-[var(--fg-muted)]">Cargando blog...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        {renderFeedback("blog-create")}
        <h2 className="text-xl text-[var(--fg-strong)]">Crear artículo</h2>
        <div className="grid gap-2">
          <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
            Título del artículo
            <input
              value={newPost.titulo}
              onChange={(event) => setNewPost((current) => ({ ...current, titulo: event.target.value }))}
              placeholder="Ej: Cómo elegir una vela aromática"
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
          <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
            Autor
            <input
              value={newPost.autor}
              onChange={(event) => setNewPost((current) => ({ ...current, autor: event.target.value }))}
              placeholder="Nombre visible"
              className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
          <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
            Extracto
            <textarea
              value={newPost.extracto}
              onChange={(event) =>
                setNewPost((current) => ({
                  ...current,
                  extracto: event.target.value.slice(0, BLOG_EXTRACT_MAX_CHARACTERS),
                }))
              }
              maxLength={BLOG_EXTRACT_MAX_CHARACTERS}
              placeholder="Resumen corto para la lista del blog"
              className="mt-1 min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
          <p className="text-xs text-[var(--fg-soft)]">
            Caracteres disponibles: {BLOG_EXTRACT_MAX_CHARACTERS - newPost.extracto.length}
          </p>
          <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
            Contenido
            <textarea
              value={newPost.contenido}
              onChange={(event) =>
                setNewPost((current) => ({
                  ...current,
                  contenido: event.target.value.slice(0, BLOG_CONTENT_MAX_CHARACTERS),
                }))
              }
              maxLength={BLOG_CONTENT_MAX_CHARACTERS}
              placeholder="Contenido completo del artículo"
              className="mt-1 min-h-40 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </label>
          <p className="text-xs text-[var(--fg-soft)]">
            Caracteres disponibles: {BLOG_CONTENT_MAX_CHARACTERS - newPost.contenido.length}
          </p>
          <button
            type="button"
            onClick={() => void createPost()}
            disabled={busyId === "create-post"}
            className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-post" ? "Creando..." : "Crear artículo"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {renderFeedback("blog-list")}
        <h2 className="text-2xl text-[var(--fg-strong)]">Articulos</h2>
        {!posts.length ? (
          <p className="text-sm text-[var(--fg-muted)]">Aún no hay artículos registrados.</p>
        ) : null}
        {posts.map((post) => (
          <article
            key={post.id}
            className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
          >
            {renderFeedback(`blog-post-${post.id}`)}
            <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{post.slug}</p>
            <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
              Título del artículo
              <input
                value={post.titulo}
                onChange={(event) =>
                  updatePostState(post.id, (current) => ({ ...current, titulo: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
            </label>
            <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
              Autor
              <input
                value={post.autor}
                onChange={(event) =>
                  updatePostState(post.id, (current) => ({ ...current, autor: event.target.value }))
                }
                placeholder="Nombre visible"
                className="mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
            </label>
            <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
              Extracto
              <textarea
                value={post.extracto}
                onChange={(event) =>
                  updatePostState(post.id, (current) => ({
                    ...current,
                    extracto: event.target.value.slice(0, BLOG_EXTRACT_MAX_CHARACTERS),
                  }))
                }
                maxLength={BLOG_EXTRACT_MAX_CHARACTERS}
                placeholder="Resumen corto para la lista del blog"
                className="mt-1 min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
            </label>
            <p className="text-xs text-[var(--fg-soft)]">
              Caracteres disponibles: {BLOG_EXTRACT_MAX_CHARACTERS - post.extracto.length}
            </p>
            <label className="block min-w-0 text-sm font-medium text-[var(--fg-muted)]">
              Contenido
              <textarea
                value={post.contenido}
                onChange={(event) =>
                  updatePostState(post.id, (current) => ({
                    ...current,
                    contenido: event.target.value.slice(0, BLOG_CONTENT_MAX_CHARACTERS),
                  }))
                }
                maxLength={BLOG_CONTENT_MAX_CHARACTERS}
                className="mt-1 min-h-40 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
              />
            </label>
            <p className="text-xs text-[var(--fg-soft)]">
              Caracteres disponibles: {BLOG_CONTENT_MAX_CHARACTERS - post.contenido.length}
            </p>
            <p className="text-xs text-[var(--fg-soft)]">Publicado: {post.fechaPublicacion}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void savePost(post)}
                disabled={busyId === `save-post-${post.id}`}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
              >
                {busyId === `save-post-${post.id}` ? "Guardando..." : "Guardar artículo"}
              </button>
              <button
                type="button"
                onClick={() => void deletePost(post)}
                disabled={busyId === `delete-post-${post.id}`}
                className="rounded-lg border border-rose-400 px-4 py-2 text-sm text-rose-600 disabled:opacity-60"
              >
                {busyId === `delete-post-${post.id}` ? "Eliminando..." : "Eliminar artículo"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
