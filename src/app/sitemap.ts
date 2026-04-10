import { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fogatta.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    "",
    "/catalogo",
    "/nosotros",
    "/faq",
    "/blog",
    "/contacto",
    "/legal/privacidad",
    "/legal/terminos",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }));
}
