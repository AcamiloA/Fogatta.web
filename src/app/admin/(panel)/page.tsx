import Link from "next/link";

export const metadata = {
  title: "Admin Inicio",
};

const sections = [
  {
    title: "Catálogo",
    description: "Crea categorías, productos, variantes y gestiona imágenes.",
    href: "/admin/catalogo",
    cta: "Ir a Catálogo",
  },
  {
    title: "Inventario",
    description: "Controla stock por producto y variante, con foco en disponibilidad real.",
    href: "/admin/inventario",
    cta: "Ir a Inventario",
  },
  {
    title: "Contenido",
    description: "Administra textos del sitio, FAQ y artículos del blog.",
    href: "/admin/contenido",
    cta: "Ir a Contenido",
  },
  {
    title: "Configuración",
    description: "Controla temas, parámetros de negocio e integraciones.",
    href: "/admin/configuracion",
    cta: "Ir a Configuración",
  },
];

export default function AdminHomePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl text-[var(--fg-strong)]">Inicio del panel</h2>
      <p className="text-sm text-[var(--fg-muted)]">
        Este es el punto principal de administración. Desde aquí puedes ir a cada configuración.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <article
            key={section.href}
            className="flex h-full flex-col rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4"
          >
            <h3 className="text-lg text-[var(--fg-strong)]">{section.title}</h3>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{section.description}</p>
            <Link
              href={section.href}
              className="mt-auto inline-flex rounded-lg border border-[var(--accent)] px-3 py-2 text-sm text-[var(--fg-strong)]"
            >
              {section.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
