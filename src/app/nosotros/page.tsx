import { ContentService } from "@/modules/content/service";
import { BrandWordmark } from "@/components/layout/brand-wordmark";

export const metadata = {
  title: "Nosotros",
};

export default async function NosotrosPage() {
  const content = await new ContentService().getContent();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <section className="hero-gradient overflow-hidden rounded-3xl border border-[var(--accent)]/35 p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-soft)]">Nuestra esencia</p>
        <h1 className="mt-3 text-4xl leading-tight text-[var(--fg-strong)] md:text-5xl">
          Nosotros <BrandWordmark />
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--fg-soft)]">{content.nosotros.titulo}</p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <article className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--surface-2)] p-7">
          <h2 className="text-2xl text-[var(--fg-strong)]">Como nace FOGATTA</h2>
          <p className="mt-4 leading-8 text-[var(--fg-muted)]">{content.nosotros.historia}</p>
          <p className="mt-4 leading-8 text-[var(--fg-muted)]">{content.nosotros.promesa}</p>
        </article>

        <aside className="grid gap-4">
          <article className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-soft)]">Proceso</p>
            <p className="mt-2 text-lg text-[var(--fg-strong)]">Lotes pequenos y controlados</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-soft)]">Materiales</p>
            <p className="mt-2 text-lg text-[var(--fg-strong)]">Fragancias curadas para hogar</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--fg-soft)]">Experiencia</p>
            <p className="mt-2 text-lg text-[var(--fg-strong)]">Acompanamiento cercano por WhatsApp</p>
          </article>
        </aside>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--border)]/45 bg-[var(--surface-2)] p-7">
        <h2 className="text-2xl text-[var(--fg-strong)]">Lo que defendemos en cada vela</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--fg-soft)]">01</p>
            <p className="mt-2 text-[var(--fg-strong)]">Calidad artesanal constante</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--fg-soft)]">02</p>
            <p className="mt-2 text-[var(--fg-strong)]">Aromas con identidad propia</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)]/45 bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--fg-soft)]">03</p>
            <p className="mt-2 text-[var(--fg-strong)]">Detalles que elevan el ritual diario</p>
          </div>
        </div>
      </section>
    </div>
  );
}
