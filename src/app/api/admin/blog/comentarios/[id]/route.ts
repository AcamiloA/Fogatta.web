import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { updateAdminBlogCommentStatusInputSchema } from "@/modules/blog/comments-admin-contracts";
import { BlogCommentNotFoundError, BlogCommentsService } from "@/modules/blog/comments-service";

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

  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateAdminBlogCommentStatusInputSchema.parse({
      id,
      status: body?.status,
    });

    const service = new BlogCommentsService();
    await service.updateModerationStatus(input.id, input.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof BlogCommentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo actualizar comentario." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const { id } = await params;
    const service = new BlogCommentsService();
    await service.deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BlogCommentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo eliminar comentario." }, { status: 500 });
  }
}
