import Image from "next/image";
import Link from "next/link";

import { formatCOP } from "@/lib/currency";
import { ProductSummaryDTO } from "@/modules/catalog/contracts";

type Props = {
  product: ProductSummaryDTO;
};

function getShortPreviewText(product: ProductSummaryDTO) {
  const baseText = product.descripcion.replace(/\s+/g, " ").trim();
  if (!baseText) {
    return "Descubre esta vela artesanal de FOGATTA.";
  }

  const maxCharacters = 90;
  if (baseText.length <= maxCharacters) {
    return baseText;
  }

  return `${baseText.slice(0, maxCharacters - 3).trimEnd()}...`;
}

export function ProductCard({ product }: Props) {
  const shortDescription = getShortPreviewText(product);

  return (
    <article className="group flex h-[29rem] flex-col overflow-hidden rounded-2xl border border-[var(--accent)]/35 bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:h-[30rem]">
      <div className="relative h-[56%] w-full overflow-hidden bg-stone-100">
        <Image
          src={product.imagenes[0]}
          alt={product.nombre}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{product.categoria.nombre}</p>
        <h3
          className="mt-1 min-h-[3.2rem] text-lg font-semibold text-[var(--ink)]"
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
          className="mt-1 min-h-[3rem] text-sm text-[var(--ink-muted)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {shortDescription}
        </p>
        <div className="mt-auto space-y-2 pt-2">
          <p className="text-base font-semibold text-[var(--ink)]">
            Desde {formatCOP(product.precioReferencia)}
          </p>
          <Link
            href={`/catalogo/${product.slug}`}
            className="inline-flex w-fit rounded-lg border border-[var(--ink)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--fg)]"
          >
            Ver producto
          </Link>
        </div>
      </div>
    </article>
  );
}
