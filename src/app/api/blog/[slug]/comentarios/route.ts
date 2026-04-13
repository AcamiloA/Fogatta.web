import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { createBlogCommentInputSchema, listBlogCommentsResponseSchema } from "@/modules/blog/comments-contracts";
import {
  BlogCommentsService,
  BlogPostNotFoundForCommentError,
} from "@/modules/blog/comments-service";

type Params = {
  params: Promise<{ slug: string }>;
};

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(_: NextRequest, { params }: Params) {
  const { slug } = await params;
  const service = new BlogCommentsService();
  const comments = await service.listByPostSlug(slug);
  return NextResponse.json(listBlogCommentsResponseSchema.parse({ comments }));
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`blog-comment:${ip}`, {
    windowMs: 60_000,
    limit: 6,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: `Demasiados comentarios. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const service = new BlogCommentsService();

  try {
    const body = await request.json();
    const input = createBlogCommentInputSchema.parse(body);
    await service.createByPostSlug(slug, input);
    return NextResponse.json(
      {
        ok: true,
        status: "pending",
        message: "Tu comentario fue recibido y esta en revision.",
      },
      {
      status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Comentario invalido.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof BlogPostNotFoundForCommentError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo publicar el comentario." }, { status: 500 });
  }
}
