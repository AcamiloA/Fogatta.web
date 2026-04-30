import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateFaqCategoryInputSchema } from "@/modules/content/admin-contracts";
import {
  AdminContentService,
  FaqCategoryInUseError,
  FaqCategoryNotFoundError,
} from "@/modules/content/admin-service";

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

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateFaqCategoryInputSchema.parse({ ...body, id });
    await service.updateFaqCategory(parsed.id, parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof FaqCategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_faq_categories_patch" });
    return NextResponse.json({ error: "No se pudo actualizar categoria FAQ." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteFaqCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FaqCategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof FaqCategoryInUseError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    service.handleError(error, { route: "admin_faq_categories_delete" });
    return NextResponse.json({ error: "No se pudo eliminar categoria FAQ." }, { status: 500 });
  }
}
