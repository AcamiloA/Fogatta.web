import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";

export const metadata = {
  title: "Admin Catalogo",
};

export default function AdminCatalogPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl text-[var(--fg-strong)]">Catalogo</h2>
        <p className="text-sm text-[var(--fg-muted)]">
          Gestiona categorias, productos y variantes.
        </p>
      </div>
      <AdminCatalogManager />
    </section>
  );
}
