import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import { updateAdminProductReviewStatusInputSchema } from "@/modules/reviews/admin-contracts";
import { ProductReviewNotFoundError, ProductReviewsService } from "@/modules/reviews/service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateAdminProductReviewStatusInputSchema.parse({
      id,
      status: body?.status,
    });

    const service = new ProductReviewsService();
    await service.updateModerationStatus(input.id, input.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    if (error instanceof ProductReviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo actualizar la reseña." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { id } = await params;
    const service = new ProductReviewsService();
    await service.deleteReview(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProductReviewNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar la reseña." }, { status: 500 });
  }
}

