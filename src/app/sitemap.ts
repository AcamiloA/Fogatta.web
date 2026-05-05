import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const base = siteConfig.siteUrl;

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
