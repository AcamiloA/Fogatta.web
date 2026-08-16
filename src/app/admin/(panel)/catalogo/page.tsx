import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";
import { AdminProductReviewsManager } from "@/components/admin/admin-product-reviews-manager";

export const metadata = {
  title: "Admin Catálogo",
};

export default function AdminCatalogPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl text-[var(--fg-strong)]">Catálogo</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Gestiona productos, contenido comercial, SEO, categorías, variantes y reseñas.
        </p>
      </div>
      <AdminCatalogManager />
      <AdminProductReviewsManager />
    </section>
  );
}
