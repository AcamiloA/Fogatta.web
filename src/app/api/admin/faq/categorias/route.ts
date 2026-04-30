import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { createFaqCategoryInputSchema } from "@/modules/content/admin-contracts";
import { AdminContentService } from "@/modules/content/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const payload = await service.getContentAdminPayload();
    return NextResponse.json({ faqCategories: payload.faqCategories });
  } catch (error) {
    service.handleError(error, { route: "admin_faq_categories_get" });
    return NextResponse.json({ error: "No se pudo cargar categorias FAQ." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createFaqCategoryInputSchema.parse(body);
    const created = await service.createFaqCategory(input);
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    service.handleError(error, { route: "admin_faq_categories_post" });
    return NextResponse.json({ error: "No se pudo crear categoria FAQ." }, { status: 500 });
  }
}
