import Image from "next/image";
import { notFound } from "next/navigation";

import { ProductViewTracker } from "@/components/analytics/product-view-tracker";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { formatCOP } from "@/lib/currency";
import { CatalogService } from "@/modules/catalog/service";

type Props = {
  params: Promise<{ slug: string }>;
};

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
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-[var(--accent)]/30 bg-[var(--card)]">
          <Image src={product.imagenes[0]} alt={product.nombre} fill className="object-cover" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--fg-soft)]">{product.categoria.nombre}</p>
          <h1 className="mt-2 text-4xl text-[var(--fg-strong)]">{product.nombre}</h1>
          <p className="mt-4 text-[var(--fg-muted)]">{product.descripcion}</p>
          <p className="mt-4 text-lg font-semibold text-[var(--fg-strong)]">
            Desde {formatCOP(product.precioReferencia)}
          </p>
          <p className="mt-2 text-sm text-[var(--fg-soft)]">
            Pedido por WhatsApp con respuesta en menos de 1 hora.
          </p>

          {product.variantes.length ? (
            <div className="mt-6">
              <AddToCartButton product={product} />
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-[var(--border)]/45 bg-[var(--surface-2)] p-4 text-sm text-[var(--fg-muted)]">
              Este producto todavía no tiene variantes configuradas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
