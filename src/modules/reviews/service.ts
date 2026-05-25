import { CommentStatus } from "@prisma/client";

import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import {
  CreateProductReviewInput,
  ProductReviewDTO,
  ReviewStatusDTO,
  productReviewSchema,
} from "@/modules/reviews/contracts";
import { adminProductReviewSchema } from "@/modules/reviews/admin-contracts";

export class ProductNotFoundForReviewError extends Error {
  constructor() {
    super("Producto no encontrado para reseña.");
    this.name = "ProductNotFoundForReviewError";
  }
}

export class ProductReviewNotFoundError extends Error {
  constructor() {
    super("Reseña no encontrada.");
    this.name = "ProductReviewNotFoundError";
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

export class ProductReviewsService {
  async listLatestApproved(limit = 6): Promise<ProductReviewDTO[]> {
    if (!prisma) {
      return [];
    }

    const rows = await prisma.productReview.findMany({
      where: { status: CommentStatus.approved },
      include: {
        product: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.max(1, Math.min(limit, 20)),
    });

    return rows.map((row) =>
      productReviewSchema.parse({
        id: row.id,
        productId: row.productId,
        productNombre: row.product.nombre,
        productSlug: row.product.slug,
        nombre: row.nombre,
        rating: row.rating,
        mensaje: row.mensaje,
        fotos: row.fotos,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  }

  async listByProductSlug(slug: string): Promise<ProductReviewDTO[]> {
    if (!prisma) {
      return [];
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        reviews: {
          where: { status: CommentStatus.approved },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!product) {
      return [];
    }

    return product.reviews.map((review) =>
      productReviewSchema.parse({
        id: review.id,
        productId: product.id,
        productNombre: product.nombre,
        productSlug: product.slug,
        nombre: review.nombre,
        rating: review.rating,
        mensaje: review.mensaje,
        fotos: review.fotos,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
      }),
    );
  }

  async createByProductSlug(slug: string, input: CreateProductReviewInput, ip: string): Promise<void> {
    const db = ensurePrisma();

    const rateLimit = await checkRateLimit(`product-review:${slug}:${ip}`, {
      windowMs: 60_000,
      limit: 4,
    });

    if (!rateLimit.ok) {
      throw new Error(
        `Demasiadas reseñas seguidas. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      );
    }

    const product = await db.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      throw new ProductNotFoundForReviewError();
    }

    await db.productReview.create({
      data: {
        productId: product.id,
        nombre: input.nombre?.trim() || null,
        rating: input.rating,
        mensaje: input.mensaje.trim(),
        fotos: (input.fotos ?? []).map((url) => url.trim()).filter(Boolean).slice(0, 3),
        status: CommentStatus.pending,
      },
    });
  }

  async listForModeration(status?: ReviewStatusDTO) {
    const db = ensurePrisma();
    const where = status ? { status } : {};

    const rows = await db.productReview.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            nombre: true,
            slug: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 400,
    });

    return rows.map((row) =>
      adminProductReviewSchema.parse({
        id: row.id,
        productId: row.productId,
        productNombre: row.product.nombre,
        productSlug: row.product.slug,
        nombre: row.nombre,
        rating: row.rating,
        mensaje: row.mensaje,
        fotos: row.fotos,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        moderatedAt: row.moderatedAt ? row.moderatedAt.toISOString() : null,
      }),
    );
  }

  async updateModerationStatus(id: string, status: ReviewStatusDTO) {
    const db = ensurePrisma();
    const existing = await db.productReview.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new ProductReviewNotFoundError();
    }

    await db.productReview.update({
      where: { id },
      data: {
        status,
        moderatedAt: new Date(),
      },
    });
  }

  async deleteReview(id: string) {
    const db = ensurePrisma();
    const existing = await db.productReview.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new ProductReviewNotFoundError();
    }

    await db.productReview.delete({ where: { id } });
  }
}

