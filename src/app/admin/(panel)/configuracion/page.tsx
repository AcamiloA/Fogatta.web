import { AdminThemeSettingsManager } from "@/components/admin/admin-theme-settings-manager";
import { requireAdminRole } from "@/modules/admin/session";

export const metadata = {
  title: "Admin Configuracion",
};

export default async function AdminSettingsPage() {
  await requireAdminRole();

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-5">
        <h2 className="text-2xl text-[var(--fg-strong)]">Configuracion de temas</h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Activa temporadas como Navidad u Octubre y sube tus propios assets para personalizar el look del sitio.
        </p>
      </header>
      <AdminThemeSettingsManager />
    </section>
  );
}
