import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createVariantInputSchema } from "@/modules/catalog/admin-contracts";
import { AdminCatalogService } from "@/modules/catalog/admin-service";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "El porcentaje de descuento debe estar entre 1 y 100.") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createVariantInputSchema.parse(body);
    const created = await service.createVariant(input);
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "admin_variant_create" });
    return NextResponse.json({ error: "No se pudo crear la variante." }, { status: 500 });
  }
}
