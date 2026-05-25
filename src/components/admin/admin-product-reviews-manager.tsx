"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewStatus = "pending" | "approved" | "rejected";

type AdminProductReview = {
  id: string;
  productNombre: string;
  productSlug: string;
  nombre: string | null;
  rating: number;
  mensaje: string;
  fotos: string[];
  status: ReviewStatus;
  createdAt: string;
  moderatedAt: string | null;
};

type ReviewsPayload = {
  reviews: AdminProductReview[];
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

export function AdminProductReviewsManager() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const statusCount = useMemo(() => {
    return {
      pending: reviews.filter((item) => item.status === "pending").length,
      approved: reviews.filter((item) => item.status === "approved").length,
      rejected: reviews.filter((item) => item.status === "rejected").length,
    };
  }, [reviews]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const response = await fetch(`/api/admin/resenas${query}`, { cache: "no-store" });
      const payload = (await response.json()) as ReviewsPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar reseñas.");
      }

      setReviews((payload as ReviewsPayload).reviews);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error cargando reseñas.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function updateStatus(id: string, nextStatus: ReviewStatus) {
    setBusyId(`status-${id}`);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/resenas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo actualizar la reseña.");
      }

      await loadReviews();
      setFeedback("Reseña actualizada correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error actualizando reseña.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(id: string) {
    const confirmed = window.confirm("Vas a eliminar esta reseña. Esta accion no se puede deshacer.");
    if (!confirmed) {
      return;
    }

    setBusyId(`delete-${id}`);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/resenas/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo eliminar la reseña.");
      }

      await loadReviews();
      setFeedback("Reseña eliminada.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error eliminando reseña.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl text-[var(--fg-strong)]">Moderación de reseñas</h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Aprueba, rechaza o elimina reseñas de productos.
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
              {status === "approved" && `Aprobadas (${statusCount.approved})`}
              {status === "rejected" && `Rechazadas (${statusCount.rejected})`}
              {status === "all" && "Todas"}
            </button>
          ))}
        </div>
      </div>

      {feedback ? (
        <p className="rounded-lg border border-[var(--accent)]/35 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg-muted)]">
          {feedback}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-[var(--fg-muted)]">Cargando reseñas...</p> : null}

      {!loading && !reviews.length ? (
        <p className="text-sm text-[var(--fg-muted)]">No hay reseñas en este filtro.</p>
      ) : null}

      <div className="space-y-3">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface-3)] p-4"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">
              {review.productNombre} (/{review.productSlug})
            </p>
            <p className="text-sm text-[var(--fg)]">
              {"?".repeat(review.rating)}{"?".repeat(5 - review.rating)} · {review.nombre || "Cliente"}
            </p>
            <p className="whitespace-pre-line text-sm text-[var(--fg-muted)]">{review.mensaje}</p>
            {review.fotos.length ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {review.fotos.map((photoUrl) => (
                  <a
                    key={photoUrl}
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-[var(--border)]/45"
                  >
                    <img src={photoUrl} alt="Foto de reseña" className="h-24 w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-soft)]">
              <span>Estado: {review.status}</span>
              <span>Creada: {formatDate(review.createdAt)}</span>
              {review.moderatedAt ? <span>Moderada: {formatDate(review.moderatedAt)}</span> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void updateStatus(review.id, "approved")}
                disabled={busyId === `status-${review.id}` || review.status === "approved"}
                className="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs text-emerald-600 disabled:opacity-60"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(review.id, "rejected")}
                disabled={busyId === `status-${review.id}` || review.status === "rejected"}
                className="rounded-lg border border-amber-500 px-3 py-1.5 text-xs text-amber-600 disabled:opacity-60"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => void deleteReview(review.id)}
                disabled={busyId === `delete-${review.id}`}
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

