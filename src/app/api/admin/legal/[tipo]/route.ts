import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateLegalInputSchema } from "@/modules/content/admin-contracts";
import { AdminContentService } from "@/modules/content/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ tipo: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const { tipo } = await params;
  if (tipo !== "privacidad" && tipo !== "terminos") {
    return NextResponse.json({ error: "Tipo de legal invalido." }, { status: 400 });
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const payload = await service.getContentAdminPayload();
    return NextResponse.json({ legal: payload.legales.find((item) => item.tipo === tipo) ?? null });
  } catch (error) {
    service.handleError(error, { route: "admin_legal_get", tipo });
    return NextResponse.json({ error: "No se pudo cargar legal." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const { tipo } = await params;
  if (tipo !== "privacidad" && tipo !== "terminos") {
    return NextResponse.json({ error: "Tipo de legal invalido." }, { status: 400 });
  }

  const service = new AdminContentService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updateLegalInputSchema.parse({ ...body, tipo });
    await service.updateLegal(parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    service.handleError(error, { route: "admin_legal_patch", tipo });
    return NextResponse.json({ error: "No se pudo guardar legal." }, { status: 500 });
  }
}
