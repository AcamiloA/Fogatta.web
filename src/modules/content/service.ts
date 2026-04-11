import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { blogPostSchema, ContentPayload, contentPayloadSchema } from "@/modules/content/contracts";
import { fallbackContent } from "@/modules/content/seed-data";

function isMissingBlogTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2021";
}

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
    if (prisma) {
      try {
        const dbPosts = await prisma.blogPost.findMany({
          orderBy: [{ fechaPublicacion: "desc" }, { createdAt: "desc" }],
        });
        if (dbPosts.length > 0) {
          return dbPosts.map((post) =>
            blogPostSchema.parse({
              id: post.id,
              slug: post.slug,
              titulo: post.titulo,
              autor: post.autor,
              extracto: post.extracto,
              contenido: post.contenido,
              imagen: post.imagen,
              fechaPublicacion: post.fechaPublicacion.toISOString().slice(0, 10),
            }),
          );
        }
      } catch (error) {
        if (!isMissingBlogTableError(error)) {
          logError("blog_posts_db_fetch_failed", { error });
        }
      }
    }

    const content = await this.getContent();
    return [...content.blog].sort((a, b) => b.fechaPublicacion.localeCompare(a.fechaPublicacion));
  }

  async getBlogPostBySlug(slug: string) {
    if (prisma) {
      try {
        const post = await prisma.blogPost.findUnique({
          where: { slug },
        });
        if (post) {
          return blogPostSchema.parse({
            id: post.id,
            slug: post.slug,
            titulo: post.titulo,
            autor: post.autor,
            extracto: post.extracto,
            contenido: post.contenido,
            imagen: post.imagen,
            fechaPublicacion: post.fechaPublicacion.toISOString().slice(0, 10),
          });
        }
      } catch (error) {
        if (!isMissingBlogTableError(error)) {
          logError("blog_post_db_fetch_by_slug_failed", { error, slug });
        }
      }
    }

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
