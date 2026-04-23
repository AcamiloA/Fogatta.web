import { CatalogListing } from "@/components/catalog/catalog-listing";
import { CatalogService } from "@/modules/catalog/service";

export const metadata = {
  title: "Catalogo",
};

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const service = new CatalogService();
  const products = await service.listProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <h1 className="text-4xl text-[var(--fg-strong)]">Catalogo</h1>
      <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
        Coleccion de velas artesanales para hogares que buscan calma, calidez y presencia.
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
