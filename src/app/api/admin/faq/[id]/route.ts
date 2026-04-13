import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateFaqInputSchema } from "@/modules/content/admin-contracts";
import { AdminContentService, FaqItemNotFoundError } from "@/modules/content/admin-service";

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
    const parsed = updateFaqInputSchema.parse({ ...body, id });
    await service.updateFaq(parsed.id, parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof FaqItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_faq_patch" });
    return NextResponse.json({ error: "No se pudo actualizar FAQ." }, { status: 500 });
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
    await service.deleteFaq(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FaqItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_faq_delete" });
    return NextResponse.json({ error: "No se pudo eliminar FAQ." }, { status: 500 });
  }
}
