"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navLinks } from "@/config/site";
import { useCart } from "@/modules/checkout-whatsapp/cart-context";

const ThemeToggle = dynamic(
  () => import("@/components/layout/theme-toggle").then((module) => module.ThemeToggle),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/60 bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--fg-muted)]"
        aria-label="Cambiar tema"
        title="Cambiar tema"
      >
        <span>Tema</span>
      </button>
    ),
  },
);

export function SiteHeader() {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/admin");
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-overlay)] backdrop-blur-sm">
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-6xl items-center justify-between px-5">
        <Link href="/" className="inline-flex items-center" aria-label="Fogatta inicio">
          <Image
            src="/brand/flame.png"
            alt="Fogatta"
            width={512}
            height={512}
            className="h-10 w-10 object-contain sm:h-12 sm:w-12"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {navLinks.map((item) => {
            if (isAdminArea) {
              return null;
            }
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  active
                    ? "text-[var(--accent-soft)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!isAdminArea ? (
            <div className="rounded-full border border-[var(--border)]/45 bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--fg-muted)]">
              Carrito: {totalItems}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
