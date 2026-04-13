import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminPanelNav } from "@/components/admin/admin-panel-nav";
import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { getAdminSession, requireAdminAuthentication } from "@/modules/admin/session";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminAuthentication();
  const session = await getAdminSession();
  const roleLabel = session?.role === "admin" ? "Administrador" : "Editor";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-[var(--fg-strong)]">Panel de Administracion</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Navega entre modulos y gestiona la operacion de <BrandWordmark />.
          </p>
          <p className="mt-1 text-xs text-[var(--fg-soft)]">
            Sesion activa: {session?.sub ?? "usuario"} ({roleLabel})
          </p>
        </div>
        <AdminLogoutButton />
      </div>
      <AdminPanelNav />
      <div>{children}</div>
    </div>
  );
}
