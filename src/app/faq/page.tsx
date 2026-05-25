import type { Metadata } from "next";

import { FAQListing } from "@/components/content/faq-listing";
import { StructuredData } from "@/components/seo/structured-data";
import { siteConfig } from "@/config/site";
import { ContentService } from "@/modules/content/service";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Resuelve dudas sobre velas aromaticas FOGATTA: uso, cuidados, duracion, envios y pedidos por WhatsApp en Colombia.",
  alternates: {
    canonical: "/faq",
  },
};

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const content = await new ContentService().getContent();
  const faq = [...content.faq].sort((a, b) => a.orden - b.orden);
  const faqStructuredData = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.pregunta,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.respuesta,
          },
        })),
        url: `${siteConfig.siteUrl}/faq`,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      {faqStructuredData ? <StructuredData id="faq-jsonld" data={faqStructuredData} /> : null}
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
