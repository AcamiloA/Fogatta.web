import { z } from "zod";

import { productReviewSchema, reviewStatusSchema } from "@/modules/reviews/contracts";

export const adminProductReviewSchema = productReviewSchema.extend({
  status: reviewStatusSchema,
  productNombre: z.string(),
  productSlug: z.string(),
  moderatedAt: z.string().nullable(),
});

export const listAdminProductReviewsResponseSchema = z.object({
  reviews: z.array(adminProductReviewSchema),
});

export const updateAdminProductReviewStatusInputSchema = z.object({
  id: z.string(),
  status: reviewStatusSchema,
});

