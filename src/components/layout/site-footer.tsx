"use client";

import Link from "next/link";

import { BrandWordmark } from "@/components/layout/brand-wordmark";
import { siteConfig } from "@/config/site";
import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";

export function SiteFooter() {
  const whatsappPhone = siteConfig.whatsappPhone.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappPhone}`;

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
                <Link
                  href="/legal/privacidad"
                  onClick={() =>
                    trackEvent(analyticsEvents.selectItem, {
                      item_list_name: "footer_legal",
                      item_name: "legal_privacidad",
                    })
                  }
                  className="text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
                >
                  Política de privacidad
                </Link>
                <Link
                  href="/legal/terminos"
                  onClick={() =>
                    trackEvent(analyticsEvents.selectItem, {
                      item_list_name: "footer_legal",
                      item_name: "legal_terminos",
                    })
                  }
                  className="text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
                >
                  Términos y condiciones
                </Link>
              </div>
            </div>
            <div className="ml-3 inline-flex items-center gap-2">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent(analyticsEvents.selectItem, {
                    item_list_name: "social_links",
                    item_name: "instagram",
                  })
                }
                aria-label="Instagram de FOGATTA"
                title="Instagram"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d67b3f]/45 bg-[#d67b3f]/10 text-[#d67b3f] transition hover:bg-[#d67b3f]/20 hover:text-[#e58d50]"
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
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent(analyticsEvents.selectItem, {
                    item_list_name: "social_links",
                    item_name: "whatsapp",
                  })
                }
                aria-label="WhatsApp de FOGATTA"
                title="WhatsApp"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d67b3f]/45 bg-[#d67b3f]/10 text-[#d67b3f] transition hover:bg-[#d67b3f]/20 hover:text-[#e58d50]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4.5 w-4.5 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-3.8A8 8 0 1 1 20 11.5Z" />
                  <path d="M9.4 9.3c.1-.3.3-.5.6-.5h.4c.2 0 .4.1.5.4l.5 1.2c.1.2.1.4 0 .5l-.3.4c-.1.2-.2.3-.1.5.4.6.9 1.1 1.5 1.4.2.1.3.1.5 0l.4-.3c.2-.1.3-.1.5 0l1.2.5c.2.1.3.3.3.5v.3c0 .3-.2.5-.4.6-.4.2-1 .3-1.5.2-.9-.1-1.7-.5-2.4-1a6.9 6.9 0 0 1-2-2c-.5-.7-.8-1.5-.9-2.2-.1-.5 0-1 .2-1.5Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
