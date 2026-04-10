import { notFound } from "next/navigation";

import { ContentService } from "@/modules/content/service";

type Props = {
  params: Promise<{ tipo: string }>;
};

export default async function LegalPage({ params }: Props) {
  const { tipo } = await params;

  if (tipo !== "privacidad" && tipo !== "terminos") {
    notFound();
  }

  const page = await new ContentService().getLegalPage(tipo);
  if (!page) {
    notFound();
  }

  const title = tipo === "privacidad" ? "Política de privacidad" : "Términos y condiciones";

  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--fg-soft)]">Vigente desde: {page.fechaVigencia}</p>
      <div className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-6">
        <p className="leading-8 text-[var(--fg-muted)]">{page.contenido}</p>
      </div>
    </article>
  );
}
