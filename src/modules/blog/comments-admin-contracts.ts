import { z } from "zod";

import { commentStatusSchema } from "@/modules/blog/comments-contracts";

export const adminBlogCommentSchema = z.object({
  id: z.string(),
  mensaje: z.string(),
  status: commentStatusSchema,
  postId: z.string(),
  postSlug: z.string(),
  postTitulo: z.string(),
  createdAt: z.string(),
  moderatedAt: z.string().nullable(),
});

export const listAdminBlogCommentsResponseSchema = z.object({
  comments: z.array(adminBlogCommentSchema),
});

export const updateAdminBlogCommentStatusInputSchema = z.object({
  id: z.string().min(2),
  status: commentStatusSchema,
});
