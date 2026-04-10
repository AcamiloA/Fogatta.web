import { notFound } from "next/navigation";

import { ContentService } from "@/modules/content/service";

export const metadata = {
  title: "Política de privacidad",
};

export default async function PrivacidadPage() {
  const service = new ContentService();
  const page = await service.getLegalPage("privacidad");

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Política de privacidad</h1>
      <p className="mt-3 text-sm text-[var(--fg-soft)]">Vigente desde: {page.fechaVigencia}</p>
      <p className="mt-6 text-[var(--fg-muted)]">{page.contenido}</p>
    </div>
  );
}
