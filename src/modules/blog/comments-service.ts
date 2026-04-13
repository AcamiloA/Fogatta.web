import { CommentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  BlogCommentDTO,
  CreateBlogCommentInput,
  CommentStatus as CommentStatusDTO,
  blogCommentSchema,
} from "@/modules/blog/comments-contracts";
import { sendBlogCommentNotificationEmail } from "@/modules/blog/comment-email-notifier";
import { adminBlogCommentSchema } from "@/modules/blog/comments-admin-contracts";

export class BlogPostNotFoundForCommentError extends Error {
  constructor() {
    super("Articulo no encontrado para comentario.");
    this.name = "BlogPostNotFoundForCommentError";
  }
}

export class BlogCommentNotFoundError extends Error {
  constructor() {
    super("Comentario no encontrado.");
    this.name = "BlogCommentNotFoundError";
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

export class BlogCommentsService {
  async listByPostSlug(slug: string): Promise<BlogCommentDTO[]> {
    if (!prisma) {
      return [];
    }

    try {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        select: {
          comentarios: {
            where: {
              status: CommentStatus.approved,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
        },
      });

      if (!post) {
        return [];
      }

      return post.comentarios.map((item) =>
        blogCommentSchema.parse({
          id: item.id,
          mensaje: item.mensaje,
          createdAt: item.createdAt.toISOString(),
        }),
      );
    } catch (error) {
      logError("blog_comments_list_failed", { error, slug });
      return [];
    }
  }

  async createByPostSlug(slug: string, input: CreateBlogCommentInput): Promise<BlogCommentDTO> {
    const db = ensurePrisma();
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true, titulo: true, slug: true },
    });

    if (!post) {
      throw new BlogPostNotFoundForCommentError();
    }

    const created = await db.blogComment.create({
      data: {
        postId: post.id,
        mensaje: input.mensaje.trim(),
        status: CommentStatus.pending,
      },
    });

    const comment = blogCommentSchema.parse({
      id: created.id,
      mensaje: created.mensaje,
      createdAt: created.createdAt.toISOString(),
    });

    try {
      await sendBlogCommentNotificationEmail({
        postSlug: post.slug,
        postTitle: post.titulo,
        comment,
      });
    } catch (error) {
      logError("blog_comment_email_failed", { error, slug, commentId: comment.id });
    }

    return comment;
  }

  async listForModeration(status?: CommentStatusDTO) {
    const db = ensurePrisma();
    const where = status ? { status } : {};
    const rows = await db.blogComment.findMany({
      where,
      include: {
        post: {
          select: {
            id: true,
            slug: true,
            titulo: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    });

    return rows.map((row) =>
      adminBlogCommentSchema.parse({
        id: row.id,
        mensaje: row.mensaje,
        status: row.status,
        postId: row.post.id,
        postSlug: row.post.slug,
        postTitulo: row.post.titulo,
        createdAt: row.createdAt.toISOString(),
        moderatedAt: row.moderatedAt ? row.moderatedAt.toISOString() : null,
      }),
    );
  }

  async updateModerationStatus(id: string, status: CommentStatusDTO) {
    const db = ensurePrisma();
    const existing = await db.blogComment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BlogCommentNotFoundError();
    }

    return db.blogComment.update({
      where: { id },
      data: {
        status,
        moderatedAt: new Date(),
      },
    });
  }

  async deleteComment(id: string) {
    const db = ensurePrisma();
    const existing = await db.blogComment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BlogCommentNotFoundError();
    }

    return db.blogComment.delete({
      where: { id },
    });
  }
}
