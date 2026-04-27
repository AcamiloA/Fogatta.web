import Image from "next/image";
import Link from "next/link";

import { formatCOP } from "@/lib/currency";
import { ProductSummaryDTO } from "@/modules/catalog/contracts";

type Props = {
  product: ProductSummaryDTO;
};

function getShortPreviewText(product: ProductSummaryDTO) {
  const resumen = product.resumen?.trim();
  if (resumen) {
    return resumen;
  }

  const cleanDescription = product.descripcion.replace(/\s+/g, " ").trim();
  if (!cleanDescription) {
    return "Descubre esta vela artesanal de FOGATTA.";
  }

  const sentenceMatch = cleanDescription.match(/^(.{1,140}?[.!?])(\s|$)/);
  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  if (cleanDescription.length <= 110) {
    return cleanDescription;
  }

  return `${cleanDescription.slice(0, 107).trimEnd()}...`;
}

export function ProductCard({ product }: Props) {
  const shortDescription = getShortPreviewText(product);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100/70">
        <Image
          src={product.imagenes[0]}
          alt={product.nombre}
          fill
          className="object-contain p-2 transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex h-full flex-col space-y-2 p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{product.categoria.nombre}</p>
        <h3
          className="text-lg font-semibold text-[var(--ink)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.nombre}
        </h3>
        <p
          className="text-sm text-[var(--ink-muted)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {shortDescription}
        </p>
        <p className="text-base font-semibold text-[var(--ink)]">
          Desde {formatCOP(product.precioReferencia)}
        </p>
        <Link
          href={`/catalogo/${product.slug}`}
          className="mt-auto inline-flex w-fit rounded-lg border border-[var(--ink)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--fg)]"
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
