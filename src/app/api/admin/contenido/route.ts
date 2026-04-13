import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import {
  adminContentResponseSchema,
  updateSiteContentInputSchema,
} from "@/modules/content/admin-contracts";
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
    return NextResponse.json(adminContentResponseSchema.parse(payload));
  } catch (error) {
    service.handleError(error, { route: "admin_content_get" });
    return NextResponse.json({ error: "No se pudo cargar contenido." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = updateSiteContentInputSchema.parse(body);
    await service.updateSiteContent(input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    service.handleError(error, { route: "admin_content_patch" });
    return NextResponse.json({ error: "No se pudo guardar contenido." }, { status: 500 });
  }
}
