import type { Metadata } from "next";

import { CatalogListing } from "@/components/catalog/catalog-listing";
import { StructuredData } from "@/components/seo/structured-data";
import { siteConfig } from "@/config/site";
import { CatalogService } from "@/modules/catalog/service";

export const metadata: Metadata = {
  title: "Catalogo de velas aromaticas artesanales",
  description:
    "Explora el catalogo de velas artesanales FOGATTA: aromas premium para hogar, relajacion, meditacion y regalos especiales en Colombia.",
  alternates: {
    canonical: "/catalogo",
  },
};

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const service = new CatalogService();
  const products = await service.listProducts();
  const breadcrumbsStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${siteConfig.siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catalogo",
        item: `${siteConfig.siteUrl}/catalogo`,
      },
    ],
  } as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <StructuredData id="catalog-breadcrumb-jsonld" data={breadcrumbsStructuredData} />
      <h1 className="text-4xl text-[var(--fg-strong)]">Catálogo</h1>
      <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
        Colección de velas artesanales para hogares que buscan calma, calidez y presencia.
      </p>

      {products.length ? (
        <CatalogListing products={products} />
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-stone-600">
          Aun no hay productos publicados por ahora.
        </p>
      )}
    </div>
  );
}
