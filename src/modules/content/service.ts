import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  blogPostSchema,
  ContentPayload,
  contentPayloadSchema,
  legalPageSchema,
} from "@/modules/content/contracts";
import { fallbackContent } from "@/modules/content/seed-data";

function isMissingTableError(error: unknown) {
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
    return contentPayloadSchema.parse({
      ...rawPayload,
      hero: rawPayload?.hero ?? fallbackContent.hero,
    });
  } catch (error) {
    logError("cms_content_fetch_failed", { error });
    return null;
  }
}

async function fetchDbContent(): Promise<ContentPayload | null> {
  if (!prisma) {
    return null;
  }

  try {
    const [siteContent, faq, legalDocuments] = await Promise.all([
      prisma.siteContent.findUnique({
        where: { id: "main" },
      }),
      prisma.faqItem.findMany({
        where: { activo: true },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      }),
      prisma.legalDocument.findMany({
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return contentPayloadSchema.parse({
      hero: {
        titulo: siteContent?.heroTitulo ?? fallbackContent.hero.titulo,
        descripcion: siteContent?.heroDescripcion ?? fallbackContent.hero.descripcion,
      },
      nosotros: {
        titulo: siteContent?.nosotrosTitulo ?? fallbackContent.nosotros.titulo,
        historia: siteContent?.nosotrosHistoria ?? fallbackContent.nosotros.historia,
        promesa: siteContent?.nosotrosPromesa ?? fallbackContent.nosotros.promesa,
      },
      faq:
        faq.length > 0
          ? faq.map((item) => ({
              id: item.id,
              pregunta: item.pregunta,
              respuesta: item.respuesta,
              orden: item.orden,
            }))
          : fallbackContent.faq,
      blog: fallbackContent.blog,
      legales:
        legalDocuments.length > 0
          ? legalDocuments.map((item) =>
              legalPageSchema.parse({
                tipo: item.tipo,
                contenido: item.contenido,
                fechaVigencia: item.fechaVigencia.toISOString().slice(0, 10),
              }),
            )
          : fallbackContent.legales,
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      logError("db_content_fetch_failed", { error });
    }
    return null;
  }
}

export class ContentService {
  async getContent(): Promise<ContentPayload> {
    const cmsContent = await fetchCMSContent();
    if (cmsContent) {
      return cmsContent;
    }

    const dbContent = await fetchDbContent();
    return dbContent ?? fallbackContent;
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
        if (!isMissingTableError(error)) {
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
        if (!isMissingTableError(error)) {
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
