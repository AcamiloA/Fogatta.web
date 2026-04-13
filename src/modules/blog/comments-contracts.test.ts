import { describe, expect, it } from "vitest";

import {
  createBlogCommentResponseSchema,
  createBlogCommentInputSchema,
  listBlogCommentsResponseSchema,
} from "@/modules/blog/comments-contracts";

describe("blog comments contracts", () => {
  it("accepts valid comment payload", () => {
    const parsed = createBlogCommentInputSchema.parse({
      mensaje: "Me encanto este aroma, lo volveria a comprar.",
    });
    expect(parsed.mensaje.length).toBeGreaterThan(1);
  });

  it("rejects comments longer than 350 chars", () => {
    const longText = "a".repeat(351);
    const result = createBlogCommentInputSchema.safeParse({ mensaje: longText });
    expect(result.success).toBe(false);
  });

  it("validates comments listing response", () => {
    const payload = listBlogCommentsResponseSchema.parse({
      comments: [
        {
          id: "c1",
          mensaje: "Excelente articulo.",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(payload.comments).toHaveLength(1);
  });

  it("validates create response status", () => {
    const payload = createBlogCommentResponseSchema.parse({
      ok: true,
      status: "pending",
      message: "Tu comentario fue recibido y esta en revision.",
    });
    expect(payload.status).toBe("pending");
  });
});
