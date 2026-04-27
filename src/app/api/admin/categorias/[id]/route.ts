import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import {
  AdminCatalogService,
  CategoryInUseError,
  CategoryNotFoundError,
} from "@/modules/catalog/admin-service";
import { updateCategoryInputSchema } from "@/modules/catalog/admin-contracts";

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
    const parsed = updateCategoryInputSchema.parse({ ...body, id });

    const { id: categoryId, ...updateData } = parsed;
    await service.updateCategory(categoryId, updateData);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos inválidos.", details: error.flatten() }, { status: 400 });
    }

    if (error instanceof CategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    service.handleError(error, { route: "admin_category_update" });
    return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 500 });
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
    await service.deleteCategory(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CategoryInUseError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    service.handleError(error, { route: "admin_category_delete" });
    return NextResponse.json({ error: "No se pudo eliminar la categoría." }, { status: 500 });
  }
}
