import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateVariantInputSchema } from "@/modules/catalog/admin-contracts";
import {
  AdminCatalogService,
  VariantHasPendingReservationsError,
  VariantNotFoundError,
} from "@/modules/catalog/admin-service";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ id: string }>;
};

function resolveBusinessError(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "El porcentaje de descuento debe estar entre 1 y 100.") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error.message === "Variante no encontrada.") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateVariantInputSchema.parse({ ...body, id });

    const { id: variantId, ...updateData } = parsed;
    await service.updateVariant(variantId, updateData);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "admin_variant_update" });
    return NextResponse.json({ error: "No se pudo actualizar la variante." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteVariant(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof VariantNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof VariantHasPendingReservationsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    service.handleError(error, { route: "admin_variant_delete" });
    return NextResponse.json({ error: "No se pudo eliminar la variante." }, { status: 500 });
  }
}
