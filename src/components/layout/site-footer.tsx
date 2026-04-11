import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)]/45 bg-[var(--surface-2)]">
      <div className="mx-auto grid h-[360px] w-full max-w-6xl content-center gap-6 px-5 py-10 md:h-[230px] md:grid-cols-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--fg)]">Fogatta</h3>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{siteConfig.description}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--fg-soft)]">
            Operación
          </h4>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{siteConfig.supportHours}</p>
          <p className="text-sm text-[var(--fg-muted)]">Mercado: {siteConfig.market}</p>
        </div>
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
      </div>
    </footer>
  );
}
