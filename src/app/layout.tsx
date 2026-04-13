import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { GAScript } from "@/components/analytics/ga-script";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { siteConfig } from "@/config/site";
import { getActiveThemeSettings } from "@/modules/theme/public-service";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FOGATTA | Velas artesanales",
    template: "%s | FOGATTA",
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: "/brand/favicon.ico", type: "image/x-icon" },
      { url: "/brand/flame.png", type: "image/png" },
    ],
    shortcut: "/brand/favicon.ico",
    apple: "/brand/flame.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeTheme = await getActiveThemeSettings();

  return (
    <html
      lang="es"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        className="min-h-full text-[var(--fg)]"
        data-theme={activeTheme.basePreset}
        data-season-theme={activeTheme.seasonalPreset ?? "none"}
        style={{
          "--theme-bg-image": activeTheme.backgroundImageUrl
            ? `url("${activeTheme.backgroundImageUrl}")`
            : "none",
          "--theme-hero-image": activeTheme.heroImageUrl
            ? `url("${activeTheme.heroImageUrl}")`
            : "none",
        } as React.CSSProperties}
      >
        <GAScript />
        <AppProviders>
          <SiteHeader />
          <main
            className="flex-1"
            style={{ minHeight: "calc(100vh - var(--header-height) + 1px)" }}
          >
            {children}
          </main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
