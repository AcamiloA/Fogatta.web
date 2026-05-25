import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { listAdminProductReviewsResponseSchema } from "@/modules/reviews/admin-contracts";
import { reviewStatusSchema } from "@/modules/reviews/contracts";
import { ProductReviewsService } from "@/modules/reviews/service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const statusRaw = request.nextUrl.searchParams.get("status");
  const parsedStatus = statusRaw ? reviewStatusSchema.safeParse(statusRaw) : null;
  if (statusRaw && !parsedStatus?.success) {
    return NextResponse.json({ error: "Estado invalido." }, { status: 400 });
  }

  try {
    const service = new ProductReviewsService();
    const reviews = await service.listForModeration(parsedStatus?.success ? parsedStatus.data : undefined);
    return NextResponse.json(listAdminProductReviewsResponseSchema.parse({ reviews }));
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar reseñas." }, { status: 500 });
  }
}

