"use client";

import { FormEvent, useMemo, useState } from "react";

import { BlogCommentDTO } from "@/modules/blog/comments-contracts";

const MAX_COMMENT_LENGTH = 350;
const QUICK_EMOJIS = [
  "\u{1F600}",
  "\u{1F60D}",
  "\u{1F525}",
  "\u{1F56F}\u{FE0F}",
  "\u{1F90D}",
  "\u{1F44F}",
  "\u2728",
  "\u{1F64C}",
];

type Props = {
  slug: string;
  initialComments: BlogCommentDTO[];
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

export function BlogComments({ slug, initialComments }: Props) {
  const [comments] = useState<BlogCommentDTO[]>(initialComments);
  const [mensaje, setMensaje] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const remaining = useMemo(() => MAX_COMMENT_LENGTH - mensaje.length, [mensaje.length]);

  function addEmoji(emoji: string) {
    setMensaje((current) => (current.length >= MAX_COMMENT_LENGTH ? current : `${current}${emoji}`));
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = mensaje.trim();
    if (!clean) {
      setFeedback({ type: "error", text: "Escribe un comentario antes de publicar." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/blog/${slug}/comentarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mensaje: clean }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo publicar tu comentario.");
      }

      setMensaje("");
      setShowEmojiPicker(false);
      setFeedback({
        type: "ok",
        text:
          payload?.message ||
          "Tu comentario fue recibido y esta en revision. Aparecera cuando sea aprobado.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo publicar tu comentario.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface-2)] p-5">
      <h2 className="text-2xl text-[var(--fg-strong)]">Comentarios</h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Comparte tu opinion sobre este articulo.
      </p>

      <form className="mt-4 space-y-2" onSubmit={submitComment}>
        <textarea
          value={mensaje}
          onChange={(event) => setMensaje(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Cuentanos tu experiencia"
          className="min-h-28 w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((current) => !current)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
            >
              Emojis
            </button>
            <span className="text-xs text-[var(--fg-soft)]">
              Caracteres disponibles: {remaining}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !mensaje.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
          >
            {isSubmitting ? "Enviando..." : "Publicar comentario"}
          </button>
        </div>

        {showEmojiPicker ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)]/35 bg-[var(--surface)] p-2">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="rounded-md border border-[var(--border)]/45 px-2 py-1 text-lg"
                aria-label={`Agregar emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      {feedback ? (
        <p
          className={`mt-2 text-sm ${
            feedback.type === "ok" ? "text-emerald-500" : "text-rose-400"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {comments.length ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-[var(--border)]/35 bg-[var(--surface)] p-3"
            >
              <p className="whitespace-pre-wrap text-sm text-[var(--fg)]">{comment.mensaje}</p>
              <p className="mt-2 text-xs text-[var(--fg-soft)]">{formatDate(comment.createdAt)}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            Todavia no hay comentarios aprobados. Se la primera persona en comentar.
          </p>
        )}
      </div>
    </section>
  );
}
