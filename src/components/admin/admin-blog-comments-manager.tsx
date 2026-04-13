"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CommentStatus = "pending" | "approved" | "rejected";

type AdminBlogComment = {
  id: string;
  mensaje: string;
  status: CommentStatus;
  postId: string;
  postSlug: string;
  postTitulo: string;
  createdAt: string;
  moderatedAt: string | null;
};

type CommentsPayload = {
  comments: AdminBlogComment[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminBlogCommentsManager() {
  const [statusFilter, setStatusFilter] = useState<CommentStatus | "all">("pending");
  const [comments, setComments] = useState<AdminBlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusCount = useMemo(() => {
    return {
      pending: comments.filter((item) => item.status === "pending").length,
      approved: comments.filter((item) => item.status === "approved").length,
      rejected: comments.filter((item) => item.status === "rejected").length,
    };
  }, [comments]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await fetch(`/api/admin/blog/comentarios${query}`, { cache: "no-store" });
      const payload = (await response.json()) as CommentsPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar comentarios.");
      }

      setComments((payload as CommentsPayload).comments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando comentarios.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function updateStatus(comment: AdminBlogComment, nextStatus: CommentStatus) {
    setBusyId(`status-${comment.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/blog/comentarios/${comment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo actualizar el comentario.");
      }
      await loadComments();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Error actualizando comentario.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteComment(comment: AdminBlogComment) {
    const confirmed = window.confirm("Vas a eliminar este comentario. Esta accion no se puede deshacer.");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-${comment.id}`);
    setError(null);
    try {
      const response = await fetch(`/api/admin/blog/comentarios/${comment.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo eliminar el comentario.");
      }
      await loadComments();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error eliminando comentario.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl text-[var(--fg-strong)]">Moderacion de comentarios</h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Aprueba, rechaza o elimina comentarios del blog.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                statusFilter === status
                  ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--fg-strong)]"
                  : "border-[var(--border)] text-[var(--fg-muted)]"
              }`}
            >
              {status === "pending" && `Pendientes (${statusCount.pending})`}
              {status === "approved" && `Aprobados (${statusCount.approved})`}
              {status === "rejected" && `Rechazados (${statusCount.rejected})`}
              {status === "all" && "Todos"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-[var(--fg-muted)]">Cargando comentarios...</p> : null}

      {!loading && !comments.length ? (
        <p className="text-sm text-[var(--fg-muted)]">No hay comentarios en este filtro.</p>
      ) : null}

      <div className="space-y-3">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">
              {comment.postTitulo} ({comment.postSlug})
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--fg)]">{comment.mensaje}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-soft)]">
              <span>Estado: {comment.status}</span>
              <span>Creado: {formatDate(comment.createdAt)}</span>
              {comment.moderatedAt ? <span>Moderado: {formatDate(comment.moderatedAt)}</span> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void updateStatus(comment, "approved")}
                disabled={busyId === `status-${comment.id}` || comment.status === "approved"}
                className="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs text-emerald-600 disabled:opacity-60"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(comment, "rejected")}
                disabled={busyId === `status-${comment.id}` || comment.status === "rejected"}
                className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs text-amber-600 disabled:opacity-60"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => void deleteComment(comment)}
                disabled={busyId === `delete-${comment.id}`}
                className="rounded-lg border border-rose-500 px-3 py-1.5 text-xs text-rose-600 disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
