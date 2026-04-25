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
      showFeedback(scope, "warning", "Ingresa un titulo valido.");
      return;
    }
    if (titulo.length < 2 || titulo.length > 180) {
      showFeedback(scope, "warning", "El titulo debe tener entre 2 y 180 caracteres.");
      return;
    }
    if (!autor) {
      showFeedback(scope, "warning", "Ingresa el autor del articulo.");
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
    if (extracto.length < 8 || extracto.length > 280) {
      showFeedback(scope, "warning", "El extracto debe tener entre 8 y 280 caracteres.");
      return;
    }
    if (!contenido) {
      showFeedback(scope, "warning", "Ingresa el contenido del articulo.");
      return;
    }
    if (contenido.length < 20 || contenido.length > 12000) {
      showFeedback(scope, "warning", "El contenido debe tener entre 20 y 12000 caracteres.");
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
        throw new Error(resolveApiError(payload, "No se pudo crear el articulo."));
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
        createError instanceof Error ? createError.message : "Error creando articulo.",
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
      showFeedback(scope, "warning", "El titulo del articulo no es valido.");
      return;
    }
    if (titulo.length < 2 || titulo.length > 180) {
      showFeedback(scope, "warning", "El titulo debe tener entre 2 y 180 caracteres.");
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
    if (extracto.length < 8 || extracto.length > 280) {
      showFeedback(scope, "warning", "El extracto debe tener entre 8 y 280 caracteres.");
      return;
    }
    if (contenido.length < 20 || contenido.length > 12000) {
      showFeedback(scope, "warning", "El contenido debe tener entre 20 y 12000 caracteres.");
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
        throw new Error(resolveApiError(payload, "No se pudo guardar el articulo."));
      }

      await loadPosts();
      showFeedback(scope, "success", "Artículo guardado correctamente.");
    } catch (saveError) {
      showFeedback(
        scope,
        "error",
        saveError instanceof Error ? saveError.message : "Error guardando articulo.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deletePost(post: BlogPost) {
    const scope = `blog-post-${post.id}`;
    const confirmed = window.confirm(`Vas a eliminar "${post.titulo}". Esta accion no se puede deshacer.`);
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
        throw new Error(resolveApiError(payload, "No se pudo eliminar el articulo."));
      }

      await loadPosts();
      showFeedback(scope, "success", "Artículo eliminado correctamente.");
    } catch (deleteError) {
      showFeedback(
        scope,
        "error",
        deleteError instanceof Error ? deleteError.message : "Error eliminando articulo.",
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
        <h2 className="text-xl text-[var(--fg-strong)]">Crear articulo</h2>
        <div className="grid gap-2">
          <input
            value={newPost.titulo}
            onChange={(event) => setNewPost((current) => ({ ...current, titulo: event.target.value }))}
            placeholder="Titulo del articulo"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <input
            value={newPost.autor}
            onChange={(event) => setNewPost((current) => ({ ...current, autor: event.target.value }))}
            placeholder="Autor"
            className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newPost.extracto}
            onChange={(event) => setNewPost((current) => ({ ...current, extracto: event.target.value }))}
            placeholder="Extracto (resumen corto para la lista del blog)"
            className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <textarea
            value={newPost.contenido}
            onChange={(event) => setNewPost((current) => ({ ...current, contenido: event.target.value }))}
            placeholder="Contenido"
            className="min-h-40 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
          />
          <button
            type="button"
            onClick={() => void createPost()}
            disabled={busyId === "create-post"}
            className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {busyId === "create-post" ? "Creando..." : "Crear articulo"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {renderFeedback("blog-list")}
        <h2 className="text-2xl text-[var(--fg-strong)]">Articulos</h2>
        {!posts.length ? (
          <p className="text-sm text-[var(--fg-muted)]">Aun no hay articulos registrados.</p>
        ) : null}
        {posts.map((post) => (
          <article
            key={post.id}
            className="space-y-3 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5"
          >
            {renderFeedback(`blog-post-${post.id}`)}
            <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{post.slug}</p>
            <input
              value={post.titulo}
              onChange={(event) =>
                updatePostState(post.id, (current) => ({ ...current, titulo: event.target.value }))
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <input
              value={post.autor}
              onChange={(event) =>
                updatePostState(post.id, (current) => ({ ...current, autor: event.target.value }))
              }
              placeholder="Autor"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <textarea
              value={post.extracto}
              onChange={(event) =>
                updatePostState(post.id, (current) => ({ ...current, extracto: event.target.value }))
              }
              placeholder="Extracto (resumen corto para la lista del blog)"
              className="min-h-20 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <textarea
              value={post.contenido}
              onChange={(event) =>
                updatePostState(post.id, (current) => ({ ...current, contenido: event.target.value }))
              }
              className="min-h-40 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
            />
            <p className="text-xs text-[var(--fg-soft)]">Publicado: {post.fechaPublicacion}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void savePost(post)}
                disabled={busyId === `save-post-${post.id}`}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
              >
                {busyId === `save-post-${post.id}` ? "Guardando..." : "Guardar articulo"}
              </button>
              <button
                type="button"
                onClick={() => void deletePost(post)}
                disabled={busyId === `delete-post-${post.id}`}
                className="rounded-lg border border-rose-400 px-4 py-2 text-sm text-rose-600 disabled:opacity-60"
              >
                {busyId === `delete-post-${post.id}` ? "Eliminando..." : "Eliminar articulo"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
