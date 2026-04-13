"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-overlay)] backdrop-blur-sm">
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="FOGATTA inicio">
          <Image
            src="/brand/flame.png"
            alt="FOGATTA"
            width={512}
            height={512}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            priority
          />
          <BrandWordmark className="max-w-[130px] truncate text-xs tracking-[0.08em] text-[var(--fg-strong)] min-[360px]:text-sm sm:max-w-none sm:text-base sm:tracking-[0.14em]" />
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
          {!isAdminArea ? (
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-[var(--border)]/60 bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--fg-muted)] md:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-site-nav"
              aria-label={mobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? "Cerrar" : "Menu"}
            </button>
          ) : null}
          <ThemeToggle />
          {!isAdminArea ? (
            <div className="hidden rounded-full border border-[var(--border)]/45 bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--fg-muted)] sm:block">
              Carrito: {totalItems}
            </div>
          ) : null}
        </div>
      </div>
      {!isAdminArea ? (
        <div
          id="mobile-site-nav"
          className={`border-t border-[var(--border)]/25 bg-[var(--surface-2)] px-5 py-3 md:hidden ${
            mobileMenuOpen ? "block" : "hidden"
          }`}
        >
          <nav className="flex flex-col gap-2">
            {navLinks.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent)]/20 text-[var(--fg-strong)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--fg-strong)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 rounded-lg border border-[var(--border)]/45 bg-[var(--surface-3)] px-3 py-2 text-xs text-[var(--fg-muted)]">
            Carrito: {totalItems}
          </div>
        </div>
      ) : null}
    </header>
  );
}
