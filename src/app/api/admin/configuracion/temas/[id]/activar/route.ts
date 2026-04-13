import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestWithRole } from "@/modules/admin/session";
import { AdminThemeService, ThemeNotFoundError } from "@/modules/theme/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  if (!isAdminRequestWithRole(request, ["admin"])) {
    return unauthorized();
  }

  const service = new AdminThemeService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.activateTheme(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ThemeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_theme_activate" });
    return NextResponse.json({ error: "No se pudo activar el tema." }, { status: 500 });
  }
}
