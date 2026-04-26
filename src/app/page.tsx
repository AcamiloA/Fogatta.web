import Link from "next/link";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { FeaturedCarousel } from "@/components/catalog/featured-carousel";
import { homeCatalogConfig, siteConfig } from "@/config/site";
import { buildHomeCatalogSections } from "@/modules/catalog/home-sections";
import { CatalogService } from "@/modules/catalog/service";
import { ContentService } from "@/modules/content/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalogService = new CatalogService();
  const contentService = new ContentService();

  const [products, content] = await Promise.all([
    catalogService.listProducts(),
    contentService.getContent(),
  ]);

  const { newProducts, featuredProducts } = buildHomeCatalogSections(products, homeCatalogConfig);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <section className="hero-gradient overflow-hidden rounded-3xl border border-[var(--accent)]/40 p-8 md:p-12">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-soft)]">Artesanal premium</p>
        <h1 className="mt-4 max-w-2xl text-4xl leading-tight text-[var(--fg-strong)] md:text-6xl">
          {content.hero.titulo}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-[var(--fg-muted)] md:text-lg">
          {content.hero.descripcion || siteConfig.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:bg-[var(--accent-hover)]"
          >
            Explorar catálogo
          </Link>
          <Link
            href="/nosotros"
            className="rounded-full border border-[var(--accent-outline)] px-6 py-3 text-sm font-medium text-[var(--fg-strong)] transition hover:bg-[var(--accent-outline)] hover:text-[var(--accent-outline-contrast)]"
          >
            Conocer la marca
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)]/65 bg-[var(--surface-2)]/65 text-[var(--fg-muted)] transition hover:border-[var(--accent)]/45 hover:text-[var(--fg-strong)]"
            aria-label="Ingreso interno"
            title="Ingreso interno"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-3xl text-[var(--fg-strong)]">Lo nuevo</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Productos creados o actualizados recientemente.
            </p>
          </div>
          <Link href="/catalogo" className="self-start text-sm text-[var(--fg-muted)] hover:text-[var(--fg-strong)] sm:self-auto">
            Ver todo
          </Link>
        </div>
        {newProducts.length ? (
          <FeaturedCarousel products={newProducts} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--fg-muted)]">
            No hay lanzamientos recientes por ahora.
          </p>
        )}
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-3xl text-[var(--fg-strong)]">
              Selección <BrandWordmark />
            </h2>
          </div>
          <Link href="/catalogo" className="self-start text-sm text-[var(--fg-muted)] hover:text-[var(--fg-strong)] sm:self-auto">
            Ver todo
          </Link>
        </div>
        {featuredProducts.length ? (
          <FeaturedCarousel products={featuredProducts} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--fg-muted)]">
            Catálogo en preparación. Los productos se cargarán en la siguiente fase.
          </p>
        )}
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-3">
        <article className="glass-card rounded-2xl p-5">
          <h3 className="text-xl text-[var(--fg-strong)]">Envío nacional</h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Despachos en todo Colombia con tiempos estimados por ciudad.
          </p>
        </article>
        <article className="glass-card rounded-2xl p-5">
          <h3 className="text-xl text-[var(--fg-strong)]">Atención rápida</h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Respuesta en menos de 1 hora durante horario extendido.
          </p>
        </article>
        <article className="glass-card rounded-2xl p-5">
          <h3 className="text-xl text-[var(--fg-strong)]">Pago flexible</h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Confirmación por WhatsApp y pago por transferencia, Nequi o Daviplata.
          </p>
        </article>
      </section>

      <section className="mt-14 rounded-3xl border border-[var(--border)]/30 bg-[var(--surface-2)] p-8">
        <h2 className="text-3xl text-[var(--fg-strong)]">{content.nosotros.titulo}</h2>
        <p className="mt-4 text-[var(--fg-muted)]">{content.nosotros.historia}</p>
        <p className="mt-2 text-[var(--fg-muted)]">{content.nosotros.promesa}</p>
      </section>
    </div>
  );
}
