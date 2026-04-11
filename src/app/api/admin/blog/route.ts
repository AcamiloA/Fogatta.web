import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { adminBlogResponseSchema, createBlogPostInputSchema } from "@/modules/blog/admin-contracts";
import { AdminBlogService } from "@/modules/blog/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminBlogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const payload = await service.listPosts();
    return NextResponse.json(adminBlogResponseSchema.parse(payload), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "admin_blog_list" });
    return NextResponse.json({ error: "No se pudo cargar el blog." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminBlogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createBlogPostInputSchema.parse(body);
    const created = await service.createPost(input);
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ya existe un articulo con ese slug. Cambia el titulo e intenta de nuevo." },
        { status: 409 },
      );
    }
    service.handleError(error, { route: "admin_blog_create" });
    return NextResponse.json({ error: "No se pudo crear el articulo." }, { status: 500 });
  }
}
