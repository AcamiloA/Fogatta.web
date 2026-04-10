import { logError } from "@/lib/logger";
import { ContentPayload, contentPayloadSchema } from "@/modules/content/contracts";
import { fallbackContent } from "@/modules/content/seed-data";

async function fetchCMSContent(): Promise<ContentPayload | null> {
  const cmsBaseUrl = process.env.HEADLESS_CMS_BASE_URL;

  if (!cmsBaseUrl) {
    return null;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.HEADLESS_CMS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.HEADLESS_CMS_TOKEN}`;
  }

  try {
    const response = await fetch(`${cmsBaseUrl}/api/fogatta-content`, {
      method: "GET",
      headers,
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`CMS responded with ${response.status}`);
    }

    const rawPayload = await response.json();
    return contentPayloadSchema.parse(rawPayload);
  } catch (error) {
    logError("cms_content_fetch_failed", { error });
    return null;
  }
}

export class ContentService {
  async getContent(): Promise<ContentPayload> {
    const cmsContent = await fetchCMSContent();
    return cmsContent ?? fallbackContent;
  }

  async getBlogPosts() {
    const content = await this.getContent();
    return [...content.blog].sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion));
  }

  async getBlogPostBySlug(slug: string) {
    const posts = await this.getBlogPosts();
    return posts.find((post) => post.slug === slug) ?? null;
  }

  async getFAQ() {
    const content = await this.getContent();
    return [...content.faq].sort((a, b) => a.orden - b.orden);
  }

  async getLegalPage(tipo: "privacidad" | "terminos") {
    const content = await this.getContent();
    return content.legales.find((item) => item.tipo === tipo) ?? null;
  }
}
