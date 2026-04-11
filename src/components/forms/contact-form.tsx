"use client";

import { FormEvent, useState } from "react";

type ApiErrorPayload = {
  error?: string;
};

export function ContactForm() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/leads/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          correo,
          telefono,
          ciudad: ciudad.trim() || undefined,
          mensaje,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        throw new Error(payload?.error?.trim() || "No se pudo enviar el formulario.");
      }

      setFeedback({
        type: "ok",
        message:
          "Gracias. Recibimos tu mensaje correctamente y te responderemos lo antes posible.",
      });
      setNombre("");
      setCorreo("");
      setTelefono("");
      setCiudad("");
      setMensaje("");
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos enviar tu mensaje. Intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-[var(--accent)]/35 bg-[var(--surface-2)] p-5 shadow-sm"
    >
      <input
        required
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        placeholder="Nombre completo"
        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
      <input
        required
        type="email"
        value={correo}
        onChange={(event) => setCorreo(event.target.value)}
        placeholder="Correo"
        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
      <input
        required
        value={telefono}
        onChange={(event) => setTelefono(event.target.value)}
        placeholder="Teléfono"
        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
      <input
        value={ciudad}
        onChange={(event) => setCiudad(event.target.value)}
        placeholder="Ciudad (opcional)"
        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
      <textarea
        required
        minLength={10}
        value={mensaje}
        onChange={(event) => setMensaje(event.target.value)}
        placeholder="Cuéntanos qué aroma o tipo de vela estás buscando"
        className="min-h-28 w-full rounded-lg border border-[var(--input-border)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--fg)]"
      />
      {feedback ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-400/60 bg-emerald-100/80 text-emerald-800"
              : "border-rose-400/60 bg-rose-100/80 text-rose-800"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] disabled:bg-[var(--accent-disabled)]"
      >
        {loading ? "Enviando..." : "Enviar mensaje"}
      </button>
    </form>
  );
}
