import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestWithRole } from "@/modules/admin/session";
import {
  adminThemeListResponseSchema,
  createThemeInputSchema,
} from "@/modules/theme/contracts";
import { AdminThemeService } from "@/modules/theme/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestWithRole(request, ["admin"])) {
    return unauthorized();
  }

  const service = new AdminThemeService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const payload = await service.listThemes();
    return NextResponse.json(adminThemeListResponseSchema.parse(payload));
  } catch (error) {
    service.handleError(error, { route: "admin_theme_list" });
    return NextResponse.json({ error: "No se pudo cargar la configuracion de temas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequestWithRole(request, ["admin"])) {
    return unauthorized();
  }

  const service = new AdminThemeService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createThemeInputSchema.parse(body);
    const created = await service.createTheme({
      slug: input.slug,
      nombre: input.nombre,
      palette: input.palette,
      animationType: input.animationType,
      animationIntensity: input.animationIntensity,
      backgroundOpacity: input.backgroundOpacity,
      heroOpacity: input.heroOpacity,
      iconImageUrls: input.iconImageUrls,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (service.isUniqueViolation(error)) {
      return NextResponse.json({ error: "Ya existe un tema con ese slug." }, { status: 409 });
    }
    service.handleError(error, { route: "admin_theme_create" });
    return NextResponse.json({ error: "No se pudo crear el tema." }, { status: 500 });
  }
}
