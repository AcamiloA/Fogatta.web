import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { AdminBlogPostDTO, adminBlogPostSchema } from "@/modules/blog/admin-contracts";

const DEFAULT_BLOG_IMAGE = "/images/blog/aroma-espacio.svg";

export class BlogPostNotFoundError extends Error {
  constructor() {
    super("Articulo no encontrado.");
    this.name = "BlogPostNotFoundError";
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDTO(post: {
  id: string;
  slug: string;
  titulo: string;
  autor: string;
  extracto: string;
  contenido: string;
  imagen: string;
  fechaPublicacion: Date;
  createdAt: Date;
  updatedAt: Date;
}): AdminBlogPostDTO {
  return adminBlogPostSchema.parse({
    id: post.id,
    slug: post.slug,
    titulo: post.titulo,
    autor: post.autor,
    extracto: post.extracto,
    contenido: post.contenido,
    imagen: post.imagen,
    fechaPublicacion: toISODate(post.fechaPublicacion),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
}

export class AdminBlogService {
  async listPosts() {
    const db = ensurePrisma();
    const posts = await db.blogPost.findMany({
      orderBy: [{ fechaPublicacion: "desc" }, { createdAt: "desc" }],
    });
    return {
      posts: posts.map(toDTO),
    };
  }

  async createPost(input: {
    slug: string;
    titulo: string;
    autor: string;
    extracto: string;
    contenido: string;
    imagen?: string;
  }) {
    const db = ensurePrisma();
    return db.blogPost.create({
      data: {
        slug: input.slug.trim(),
        titulo: input.titulo.trim(),
        autor: input.autor.trim(),
        extracto: input.extracto.trim(),
        contenido: input.contenido.trim(),
        imagen: input.imagen?.trim() || DEFAULT_BLOG_IMAGE,
        fechaPublicacion: new Date(),
      },
    });
  }

  async updatePost(
    id: string,
    input: {
      slug?: string;
      titulo?: string;
      autor?: string;
      extracto?: string;
      contenido?: string;
      imagen?: string;
    },
  ) {
    const db = ensurePrisma();
    const existing = await db.blogPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BlogPostNotFoundError();
    }

    const data: {
      slug?: string;
      titulo?: string;
      autor?: string;
      extracto?: string;
      contenido?: string;
      imagen?: string;
    } = {};

    if (input.slug !== undefined) data.slug = input.slug.trim();
    if (input.titulo !== undefined) data.titulo = input.titulo.trim();
    if (input.autor !== undefined) data.autor = input.autor.trim();
    if (input.extracto !== undefined) data.extracto = input.extracto.trim();
    if (input.contenido !== undefined) data.contenido = input.contenido.trim();
    if (input.imagen !== undefined) data.imagen = input.imagen.trim() || DEFAULT_BLOG_IMAGE;

    return db.blogPost.update({
      where: { id },
      data,
    });
  }

  async deletePost(id: string) {
    const db = ensurePrisma();
    const existing = await db.blogPost.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new BlogPostNotFoundError();
    }

    return db.blogPost.delete({
      where: { id },
    });
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_blog_operation_failed", { error, ...context });
  }
}
