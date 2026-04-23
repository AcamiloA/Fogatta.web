import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { ProductDetailInteractive } from "@/components/catalog/product-detail-interactive";
import { CatalogService } from "@/modules/catalog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const service = new CatalogService();
  const product = await service.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <ProductViewTracker nombre={product.nombre} slug={product.slug} />
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
