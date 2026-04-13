import { ContentService } from "@/modules/content/service";

export const metadata = {
  title: "Preguntas frecuentes",
};

export default async function FAQPage() {
  const faq = await new ContentService().getFAQ();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Preguntas frecuentes</h1>
      <div className="mt-8 space-y-4">
        {faq.length ? (
          faq.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-5">
              <h2 className="text-xl text-[var(--fg-strong)]">{item.pregunta}</h2>
              <p className="mt-3 text-[var(--fg-muted)]">{item.respuesta}</p>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-[var(--fg-muted)]">
            Aun no hay publicaciones en esta seccion.
          </p>
        )}
      </div>
    </div>
  );
}
