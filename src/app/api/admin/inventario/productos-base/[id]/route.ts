import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateInventoryBaseProductInputSchema } from "@/modules/inventory/admin-contracts";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import { InventoryAdminService, InventoryBaseProductNotFoundError } from "@/modules/inventory/admin-service";

type Params = {
  params: Promise<{ id: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (error instanceof InventoryBaseProductNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof Error) {
    if (error.message.includes("lotes")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error.message.includes("receta") || error.message.includes("insumos")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateInventoryBaseProductInputSchema.parse({ ...body, id });

    const { id: baseProductId, ...updateData } = parsed;
    const updated = await service.updateBaseProduct(baseProductId, updateData);

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_base_product_update" });
    return NextResponse.json({ error: "No se pudo actualizar el producto base." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteBaseProduct(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_base_product_delete" });
    return NextResponse.json({ error: "No se pudo eliminar el producto base." }, { status: 500 });
  }
}
