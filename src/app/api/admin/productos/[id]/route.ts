import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateProductInputSchema } from "@/modules/catalog/admin-contracts";
import { AdminCatalogService } from "@/modules/catalog/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProductInputSchema.parse({ ...body, id });

    const { id: productId, ...updateData } = parsed;
    await service.updateProduct(productId, updateData);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos inválidos.", details: error.flatten() }, { status: 400 });
    }
    service.handleError(error, { route: "admin_product_update" });
    return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteProduct(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "admin_product_delete" });
    return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }
}
