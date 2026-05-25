import { z } from "zod";

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const productReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productNombre: z.string().optional(),
  productSlug: z.string().optional(),
  nombre: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  mensaje: z.string(),
  fotos: z.array(z.string().url()).default([]),
  status: reviewStatusSchema.optional(),
  createdAt: z.string(),
  moderatedAt: z.string().nullable().optional(),
});

export const listPublicProductReviewsResponseSchema = z.object({
  reviews: z.array(productReviewSchema),
  averageRating: z.number().min(0).max(5),
  totalReviews: z.number().int().nonnegative(),
});

export const createProductReviewInputSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  rating: z.number().int().min(1).max(5),
  mensaje: z.string().min(6).max(800),
  fotos: z.array(z.string().url()).max(3).optional(),
});

export const createProductReviewResponseSchema = z.object({
  ok: z.literal(true),
  status: z.literal("pending"),
  message: z.string(),
});

export type ReviewStatusDTO = z.infer<typeof reviewStatusSchema>;
export type ProductReviewDTO = z.infer<typeof productReviewSchema>;
export type CreateProductReviewInput = z.infer<typeof createProductReviewInputSchema>;

