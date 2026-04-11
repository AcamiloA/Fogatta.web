import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { GAScript } from "@/components/analytics/ga-script";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { siteConfig } from "@/config/site";

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
    default: "Fogatta | Velas artesanales",
    template: "%s | Fogatta",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        className="min-h-full text-[var(--fg)]"
        data-theme={siteConfig.themePreset}
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
