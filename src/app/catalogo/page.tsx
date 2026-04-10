import { ProductCard } from "@/components/catalog/product-card";
import { CatalogService } from "@/modules/catalog/service";

export const metadata = {
  title: "Catálogo",
};

export default async function CatálogoPage() {
  const service = new CatalogService();
  const products = await service.listProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Catálogo</h1>
      <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
        Coleccion de velas artesanales para hogares que buscan calma, calidez y presencia.
      </p>

      {products.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-stone-600">
          Aún no hay productos publicados. Cuando nos pases el catálogo los cargamos sin tocar la arquitectura.
        </p>
      )}
    </div>
  );
}
