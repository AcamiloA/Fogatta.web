import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { adminCatalogResponseSchema } from "@/modules/catalog/admin-contracts";
import { AdminCatalogService } from "@/modules/catalog/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminCatalogService();
  if (!service.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "La base de datos no está configurada. Define DATABASE_URL para administrar catálogo.",
      },
      { status: 503 },
    );
  }

  try {
    const payload = await service.listCatalog();
    return NextResponse.json(adminCatalogResponseSchema.parse(payload), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "admin_catalog_get" });
    return NextResponse.json({ error: "No se pudo cargar el catálogo." }, { status: 500 });
  }
}
