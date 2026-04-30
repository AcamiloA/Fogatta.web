import { FAQListing } from "@/components/content/faq-listing";
import { ContentService } from "@/modules/content/service";

export const metadata = {
  title: "Preguntas frecuentes",
};

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const content = await new ContentService().getContent();
  const faq = [...content.faq].sort((a, b) => a.orden - b.orden);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Preguntas frecuentes</h1>
      {faq.length ? (
        <FAQListing categories={content.faqCategories} faq={faq} />
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-[var(--fg-muted)]">
          Aun no hay publicaciones en esta seccion.
        </p>
      )}
    </div>
  );
}
