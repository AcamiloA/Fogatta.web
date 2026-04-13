import { z } from "zod";

export const commentStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const blogCommentSchema = z.object({
  id: z.string(),
  mensaje: z.string(),
  createdAt: z.string(),
});

export const listBlogCommentsResponseSchema = z.object({
  comments: z.array(blogCommentSchema),
});

export const createBlogCommentInputSchema = z.object({
  mensaje: z.string().trim().min(1).max(350),
});

export const createBlogCommentResponseSchema = z.object({
  ok: z.boolean(),
  status: commentStatusSchema,
  message: z.string(),
});

export type BlogCommentDTO = z.infer<typeof blogCommentSchema>;
export type CreateBlogCommentInput = z.infer<typeof createBlogCommentInputSchema>;
export type CommentStatus = z.infer<typeof commentStatusSchema>;
