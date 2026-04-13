import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createInventoryBaseProductInputSchema } from "@/modules/inventory/admin-contracts";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import { InventoryAdminService, InventoryBaseProductNotFoundError } from "@/modules/inventory/admin-service";
import { listInventoryBaseProductsResponseSchema } from "@/modules/inventory/contracts";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (error instanceof InventoryBaseProductNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof Error && error.message.includes("receta")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const data = await service.listBaseProducts();
    return NextResponse.json(listInventoryBaseProductsResponseSchema.parse({ data }), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "inventory_base_products_list" });
    return NextResponse.json({ error: "No se pudo cargar productos base." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createInventoryBaseProductInputSchema.parse(body);
    const created = await service.createBaseProduct(input);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_base_product_create" });
    return NextResponse.json({ error: "No se pudo crear el producto base." }, { status: 500 });
  }
}
