import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createProductReviewInputSchema,
  createProductReviewResponseSchema,
  listPublicProductReviewsResponseSchema,
} from "@/modules/reviews/contracts";
import { ProductNotFoundForReviewError, ProductReviewsService } from "@/modules/reviews/service";

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
  const service = new ProductReviewsService();
  const reviews = await service.listByProductSlug(slug);
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(2))
      : 0;

  return NextResponse.json(
    listPublicProductReviewsResponseSchema.parse({
      reviews,
      averageRating,
      totalReviews,
    }),
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const service = new ProductReviewsService();

  try {
    const body = await request.json();
    const input = createProductReviewInputSchema.parse(body);
    await service.createByProductSlug(slug, input, ip);

    return NextResponse.json(
      createProductReviewResponseSchema.parse({
        ok: true,
        status: "pending",
        message: "Tu reseña fue recibida y quedo en moderacion.",
      }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Reseña invalida.", details: error.flatten() }, { status: 400 });
    }

    if (error instanceof ProductNotFoundForReviewError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Demasiadas reseñas seguidas")) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json({ error: "No se pudo publicar la reseña." }, { status: 500 });
  }
}

