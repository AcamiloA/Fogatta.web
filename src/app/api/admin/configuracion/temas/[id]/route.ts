import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestWithRole } from "@/modules/admin/session";
import { updateThemeInputSchema } from "@/modules/theme/contracts";
import {
  AdminThemeService,
  ThemeNotFoundError,
} from "@/modules/theme/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminRequestWithRole(request, ["admin"])) {
    return unauthorized();
  }

  const service = new AdminThemeService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateThemeInputSchema.parse({ ...body, id });
    const { id: themeId, ...updateData } = parsed;

    await service.updateTheme(themeId, updateData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof ThemeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_theme_update" });
    return NextResponse.json({ error: "No se pudo guardar el tema." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequestWithRole(request, ["admin"])) {
    return unauthorized();
  }

  const service = new AdminThemeService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteTheme(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ThemeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_theme_delete" });
    return NextResponse.json({ error: "No se pudo eliminar el tema." }, { status: 500 });
  }
}
