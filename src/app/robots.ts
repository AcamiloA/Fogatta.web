import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const base = siteConfig.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
