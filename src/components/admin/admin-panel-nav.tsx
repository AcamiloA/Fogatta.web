"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = {
  href: string;
  label: string;
  helper: string;
};

const navItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Inicio",
    helper: "Resumen del panel",
  },
  {
    href: "/admin/catalogo",
    label: "Catalogo",
    helper: "Categorias, productos y variantes",
  },
  {
    href: "/admin/contenido",
    label: "Contenido",
    helper: "Textos, FAQ y blog",
  },
  {
    href: "/admin/configuracion",
    label: "Configuracion",
    helper: "Tema, integraciones y reglas",
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminPanelNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegacion de administracion" className="mb-6">
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {navItems.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-xl border px-4 py-3 transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--fg-strong)]"
                    : "border-[var(--border)]/45 bg-[var(--surface-2)] text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
                }`}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs opacity-85">{item.helper}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
