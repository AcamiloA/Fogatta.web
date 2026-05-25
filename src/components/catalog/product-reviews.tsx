"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";

type ProductReview = {
  id: string;
  nombre: string | null;
  rating: number;
  mensaje: string;
  fotos: string[];
  createdAt: string;
};

type ReviewsPayload = {
  reviews: ProductReview[];
  averageRating: number;
  totalReviews: number;
};

type Props = {
  productSlug: string;
};

const MAX_MESSAGE = 800;
const MAX_PHOTOS = 3;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(date);
}

function renderStars(value: number) {
  return "\u2605".repeat(value) + "\u2606".repeat(Math.max(0, 5 - value));
}

export function ProductReviews({ productSlug }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [rating, setRating] = useState(5);
  const [mensaje, setMensaje] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const remainingChars = useMemo(() => MAX_MESSAGE - mensaje.length, [mensaje]);

  async function loadReviews() {
    setLoading(true);
    try {
      const response = await fetch(`/api/catalogo/productos/${productSlug}/resenas`, { cache: "no-store" });
      const payload = (await response.json()) as ReviewsPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || "No se pudieron cargar las reseñas.");
      }
      const parsed = payload as ReviewsPayload;
      setReviews(parsed.reviews);
      setAverageRating(parsed.averageRating);
      setTotalReviews(parsed.totalReviews);
    } catch {
      setReviews([]);
      setAverageRating(0);
      setTotalReviews(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, [productSlug]);

  async function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const slots = MAX_PHOTOS - photoUrls.length;
    if (slots <= 0) {
      setUploadFeedback("Ya cargaste el máximo de 3 fotos.");
      return;
    }

    setUploadingPhotos(true);
    setUploadFeedback(null);

    const selected = Array.from(files).slice(0, slots);
    const uploaded: string[] = [];

    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/reviews/upload-image", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as { error?: string; url?: string };

        if (!response.ok || !payload.url) {
          throw new Error(payload.error || "No se pudo subir una imagen.");
        }

        uploaded.push(payload.url);
      } catch (error) {
        setUploadFeedback(error instanceof Error ? error.message : "Error subiendo fotos.");
      }
    }

    if (uploaded.length > 0) {
      setPhotoUrls((current) => [...current, ...uploaded].slice(0, MAX_PHOTOS));
      setUploadFeedback(
        uploaded.length === 1
          ? "1 foto cargada correctamente."
          : `${uploaded.length} fotos cargadas correctamente.`,
      );
    }

    setUploadingPhotos(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((current) => current.filter((item) => item !== url));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/catalogo/productos/${productSlug}/resenas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim() || undefined,
          rating,
          mensaje: mensaje.trim(),
          fotos: photoUrls,
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo enviar la reseña.");
      }

      trackEvent(analyticsEvents.productReviewSubmit, {
        product_slug: productSlug,
        rating,
      });

      setFeedback({
        tone: "success",
        message: payload.message || "Tu reseña se envío y quedó pendiente de aprobación.",
      });

      setNombre("");
      setRating(5);
      setMensaje("");
      setPhotoUrls([]);
      setUploadFeedback(null);
      await loadReviews();
    } catch (submitError) {
      setFeedback({
        tone: "error",
        message: submitError instanceof Error ? submitError.message : "Error enviando reseña.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 space-y-4 rounded-2xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl text-[var(--fg-strong)]">Reseñas de clientes</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          {totalReviews > 0
            ? `${averageRating.toFixed(1)} / 5 (${totalReviews} reseñas)`
            : "Aún no hay reseñas aprobadas."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-[var(--border)]/35 bg-[var(--surface)] p-4">
        <h3 className="text-base text-[var(--fg-strong)]">Cuéntanos tu experiencia</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Tu nombre (opcional)"
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm"
          />
          <select
            value={rating}
            onChange={(event) => setRating(Number.parseInt(event.target.value, 10) || 5)}
            className="rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} estrella{value === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={mensaje}
          onChange={(event) => setMensaje(event.target.value.slice(0, MAX_MESSAGE))}
          placeholder="Comparte aroma, duración y cómo te fue con el producto."
          className="min-h-28 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm"
          required
        />
        <p className="text-xs text-[var(--fg-soft)]">Caracteres disponibles: {remainingChars}</p>

        <div className="space-y-2 rounded-lg border border-[var(--input-border)]/65 bg-[var(--surface-3)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--fg-muted)]">Fotos opcionales ({photoUrls.length}/{MAX_PHOTOS})</p>
            <label className="inline-flex cursor-pointer rounded-lg border border-[var(--accent)]/45 px-3 py-1.5 text-xs text-[var(--fg-strong)] hover:bg-[var(--surface)]">
              {uploadingPhotos ? "Subiendo..." : "Seleccionar fotos"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleUploadFiles(event.target.files)}
                disabled={uploadingPhotos || photoUrls.length >= MAX_PHOTOS}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--fg-soft)]">Máximo 3 fotos. Límite por foto: 15 MB.</p>
          {uploadFeedback ? <p className="text-xs text-[var(--fg-soft)]">{uploadFeedback}</p> : null}
          {photoUrls.length ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {photoUrls.map((url) => (
                <div key={url} className="relative overflow-hidden rounded-lg border border-[var(--border)]/45">
                  <img src={url} alt="Foto seleccionada" className="h-24 w-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {feedback ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-rose-300 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || uploadingPhotos || !mensaje.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
        >
          {submitting ? "Enviando..." : "Enviar reseña"}
        </button>
      </form>

      {loading ? <p className="text-sm text-[var(--fg-muted)]">Cargando reseñas...</p> : null}

      {!loading && reviews.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">Todavía no hay reseñas visibles para este producto.</p>
      ) : null}

      <div className="space-y-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-xl border border-[var(--border)]/35 bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--fg-strong)]">{review.nombre || "Cliente FOGATTA"}</p>
              <p className="text-sm text-amber-600">{renderStars(review.rating)}</p>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--fg-muted)]">{review.mensaje}</p>
            {review.fotos.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {review.fotos.map((photoUrl) => (
                  <a
                    key={photoUrl}
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-[var(--border)]/45"
                  >
                    <img src={photoUrl} alt="Foto de reseña" className="h-28 w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-[var(--fg-soft)]">{formatDate(review.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

