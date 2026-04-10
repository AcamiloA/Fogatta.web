import { ContentService } from "@/modules/content/service";

export const metadata = {
  title: "Nosotros",
};

export default async function NosotrosPage() {
  const content = await new ContentService().getContent();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Nosotros</h1>
      <p className="mt-6 text-lg text-[var(--fg-soft)]">{content.nosotros.titulo}</p>
      <p className="mt-4 text-[var(--fg-muted)]">{content.nosotros.historia}</p>
      <p className="mt-4 text-[var(--fg-muted)]">{content.nosotros.promesa}</p>
    </div>
  );
}
