import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { ProductDetailInteractive } from "@/components/catalog/product-detail-interactive";
import { ProductReviews } from "@/components/catalog/product-reviews";
import { StructuredData } from "@/components/seo/structured-data";
import { siteConfig } from "@/config/site";
import { CatalogService } from "@/modules/catalog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = new CatalogService();
  const product = await service.getProductBySlug(slug);

  if (!product) {
    return {
      title: "Producto",
      alternates: {
        canonical: `/catalogo/${slug}`,
      },
    };
  }

  const automaticDescription = [
    product.resumen?.trim() || product.descripcion?.trim(),
    "Compra velas artesanales FOGATTA en Colombia.",
  ]
    .filter(Boolean)
    .join(" ");
  const description = product.seoDescription?.trim() || automaticDescription;
  const ogImage = product.imagenes.find((image) => image.trim().length > 0) || "/brand/flame.png";
  const title = product.seoTitle?.trim() || `${product.nombre} | Velas artesanales FOGATTA`;

  return {
    title,
    description,
    alternates: {
      canonical: `/catalogo/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/catalogo/${slug}`,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const service = new CatalogService();
  const product = await service.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const offers = product.variantes.map((variant) => {
    const hasDiscount = variant.descuentoActivo && variant.descuentoPorcentaje > 0;
    const finalPrice = hasDiscount
      ? Math.max(0, Math.round(variant.precio * ((100 - variant.descuentoPorcentaje) / 100)))
      : variant.precio;

    return {
      "@type": "Offer",
      priceCurrency: "COP",
      price: finalPrice,
      availability:
        (variant.stockDisponible ?? variant.stockVirtual) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      sku: variant.sku,
      itemCondition: "https://schema.org/NewCondition",
      url: `${siteConfig.siteUrl}/catalogo/${product.slug}`,
    };
  });

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nombre,
    description: product.descripcion,
    category: product.categoria.nombre,
    image: product.imagenes,
    brand: {
      "@type": "Brand",
      name: "FOGATTA",
    },
    offers: offers.length
      ? offers
      : [
          {
            "@type": "Offer",
            priceCurrency: "COP",
            price: product.precioReferencia,
            availability: "https://schema.org/OutOfStock",
            url: `${siteConfig.siteUrl}/catalogo/${product.slug}`,
          },
        ],
  };
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
        name: "Catálogo",
        item: `${siteConfig.siteUrl}/catalogo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.categoria.nombre,
        item: `${siteConfig.siteUrl}/catalogo`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.nombre,
        item: `${siteConfig.siteUrl}/catalogo/${product.slug}`,
      },
    ],
  } as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 pb-24 md:pb-10">
      <StructuredData id="product-jsonld" data={productStructuredData} />
      <StructuredData id="product-breadcrumb-jsonld" data={breadcrumbsStructuredData} />
      <ProductViewTracker nombre={product.nombre} slug={product.slug} categoria={product.categoria.nombre} />
      {product.variantes.length ? (
        <ProductDetailInteractive product={product} />
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--border)]/45 bg-[var(--surface-2)] p-4 text-sm text-[var(--fg-muted)]">
          Este producto todavía no tiene variantes configuradas.
        </p>
      )}
      <ProductReviews productSlug={product.slug} />
    </div>
  );
}
