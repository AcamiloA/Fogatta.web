import Image from "next/image";
import Link from "next/link";

import { formatCOP } from "@/lib/currency";
import { ProductSummaryDTO } from "@/modules/catalog/contracts";

type Props = {
  product: ProductSummaryDTO;
};

export function ProductCard({ product }: Props) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <Image
          src={product.imagenes[0]}
          alt={product.nombre}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{product.categoria.nombre}</p>
        <h3 className="text-lg font-semibold text-[var(--ink)]">{product.nombre}</h3>
        <p className="text-sm text-[var(--ink-muted)]">{product.descripcion}</p>
        <p className="text-base font-semibold text-[var(--ink)]">
          Desde {formatCOP(product.precioReferencia)}
        </p>
        <Link
          href={`/catalogo/${product.slug}`}
          className="inline-flex rounded-lg border border-[var(--ink)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--fg)]"
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
