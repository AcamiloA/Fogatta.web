import { AdminContentManager } from "@/components/admin/admin-content-manager";
import { AdminBlogManager } from "@/components/admin/admin-blog-manager";
import { AdminBlogCommentsManager } from "@/components/admin/admin-blog-comments-manager";

export const metadata = {
  title: "Admin Contenido",
};

export default function AdminContentPage() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl text-[var(--fg-strong)]">Contenido</h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Gestiona portada, seccion nosotros, FAQ, legales y blog sin tocar codigo.
        </p>
      </div>
      <AdminContentManager />
      <AdminBlogCommentsManager />
      <AdminBlogManager />
    </section>
  );
}
