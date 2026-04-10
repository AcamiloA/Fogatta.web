import { AdminCatalogManager } from "@/components/admin/admin-catalog-manager";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { requireAdminAuthentication } from "@/modules/admin/session";

export const metadata = {
  title: "Admin Catálogo",
};

export default async function AdminPage() {
  await requireAdminAuthentication();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-[var(--fg-strong)]">Panel de Catálogo</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Gestiona categorías, productos y variantes.
          </p>
        </div>
        <AdminLogoutButton />
      </div>
      <AdminCatalogManager />
    </div>
  );
}
