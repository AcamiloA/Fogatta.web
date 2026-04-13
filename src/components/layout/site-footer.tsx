import Link from "next/link";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)]/45 bg-[var(--surface-2)]">
      <div className="mx-auto grid h-[360px] w-full max-w-6xl content-center gap-6 px-5 py-10 md:h-[230px] md:grid-cols-3">
        <div className="min-w-0">
          <h3 className="text-lg text-[var(--fg)]">
            <BrandWordmark className="tracking-[0.12em]" />
          </h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{siteConfig.description}</p>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-soft)]">
            Operación
          </h4>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{siteConfig.supportHours}</p>
          <p className="text-sm text-[var(--fg-muted)]">Mercado: {siteConfig.market}</p>
        </div>
        <div className="min-w-0">
          <div className="flex items-start gap-3 sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-soft)]">
                Legal
              </h4>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <Link href="/legal/privacidad" className="text-[var(--fg-muted)] hover:text-[var(--fg-strong)]">
                  Política de privacidad
                </Link>
                <Link href="/legal/terminos" className="text-[var(--fg-muted)] hover:text-[var(--fg-strong)]">
                  Términos y condiciones
                </Link>
              </div>
            </div>
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de FOGATTA"
              title="Instagram"
              className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d67b3f]/45 bg-[#d67b3f]/10 text-[#d67b3f] transition hover:bg-[#d67b3f]/20 hover:text-[#e58d50]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4.5 w-4.5"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="3.8" />
                <circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
