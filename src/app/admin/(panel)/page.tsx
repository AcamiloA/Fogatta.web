import Link from "next/link";

export const metadata = {
  title: "Admin Inicio",
};

const sections = [
  {
    title: "Catalogo",
    description: "Crea categorias, productos, variantes y gestiona imagenes.",
    href: "/admin/catalogo",
    cta: "Ir a Catalogo",
  },
  {
    title: "Inventario",
    description: "Controla stock por producto y variante, con foco en disponibilidad real.",
    href: "/admin/inventario",
    cta: "Ir a Inventario",
  },
  {
    title: "Contenido",
    description: "Administra textos del sitio, FAQ y articulos del blog.",
    href: "/admin/contenido",
    cta: "Ir a Contenido",
  },
  {
    title: "Configuracion",
    description: "Controla temas, parametros de negocio e integraciones.",
    href: "/admin/configuracion",
    cta: "Ir a Configuracion",
  },
];

export default function AdminHomePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl text-[var(--fg-strong)]">Inicio del panel</h2>
      <p className="text-sm text-[var(--fg-muted)]">
        Este es el punto principal de administracion. Desde aqui puedes ir a cada configuracion.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <article
            key={section.href}
            className="rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-2)] p-4"
          >
            <h3 className="text-lg text-[var(--fg-strong)]">{section.title}</h3>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">{section.description}</p>
            <Link
              href={section.href}
              className="mt-4 inline-flex rounded-lg border border-[var(--accent)] px-3 py-2 text-sm text-[var(--fg-strong)]"
            >
              {section.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
