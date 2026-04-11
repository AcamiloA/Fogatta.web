import { AdminBlogManager } from "@/components/admin/admin-blog-manager";

export const metadata = {
  title: "Admin Contenido",
};

export default function AdminContentPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl text-[var(--fg-strong)]">Contenido</h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">Gestion de blog para el sitio publico.</p>
      </div>
      <AdminBlogManager />
    </section>
  );
}
