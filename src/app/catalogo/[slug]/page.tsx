import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { ProductDetailInteractive } from "@/components/catalog/product-detail-interactive";
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

  const description = [
    product.descripcion?.trim(),
    `Vela artesanal ${product.nombre} de FOGATTA en Colombia.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: `${product.nombre} | Velas artesanales`,
    description,
    alternates: {
      canonical: `/catalogo/${slug}`,
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

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <ProductViewTracker nombre={product.nombre} slug={product.slug} categoria={product.categoria.nombre} />
      {product.variantes.length ? (
        <ProductDetailInteractive product={product} />
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--border)]/45 bg-[var(--surface-2)] p-4 text-sm text-[var(--fg-muted)]">
          Este producto todavia no tiene variantes configuradas.
        </p>
      )}
    </div>
  );
}
