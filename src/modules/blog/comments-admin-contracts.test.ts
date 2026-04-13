import { describe, expect, it } from "vitest";

import { listAdminBlogCommentsResponseSchema } from "@/modules/blog/comments-admin-contracts";

describe("admin blog comments contracts", () => {
  it("validates moderation payload", () => {
    const parsed = listAdminBlogCommentsResponseSchema.parse({
      comments: [
        {
          id: "comment_1",
          mensaje: "Excelente publicacion.",
          status: "pending",
          postId: "post_1",
          postSlug: "ritual-nocturno",
          postTitulo: "Ritual nocturno",
          createdAt: new Date().toISOString(),
          moderatedAt: null,
        },
      ],
    });

    expect(parsed.comments[0].status).toBe("pending");
  });
});
