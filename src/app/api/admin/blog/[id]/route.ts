import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateBlogPostInputSchema } from "@/modules/blog/admin-contracts";
import { AdminBlogService, BlogPostNotFoundError } from "@/modules/blog/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminBlogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateBlogPostInputSchema.parse({ ...body, id });

    const { id: postId, ...updateData } = parsed;
    await service.updatePost(postId, updateData);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof BlogPostNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ya existe un articulo con ese slug. Cambia el titulo e intenta de nuevo." },
        { status: 409 },
      );
    }

    service.handleError(error, { route: "admin_blog_update" });
    return NextResponse.json({ error: "No se pudo actualizar el articulo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new AdminBlogService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deletePost(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof BlogPostNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    service.handleError(error, { route: "admin_blog_delete" });
    return NextResponse.json({ error: "No se pudo eliminar el articulo." }, { status: 500 });
  }
}
