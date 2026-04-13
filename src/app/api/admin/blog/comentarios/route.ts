import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";
import { listAdminBlogCommentsResponseSchema } from "@/modules/blog/comments-admin-contracts";
import { commentStatusSchema } from "@/modules/blog/comments-contracts";
import { BlogCommentsService } from "@/modules/blog/comments-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  const statusRaw = request.nextUrl.searchParams.get("status");
  const parsedStatus = statusRaw ? commentStatusSchema.safeParse(statusRaw) : null;
  if (statusRaw && !parsedStatus?.success) {
    return NextResponse.json({ error: "Estado invalido." }, { status: 400 });
  }

  try {
    const service = new BlogCommentsService();
    const comments = await service.listForModeration(parsedStatus?.success ? parsedStatus.data : undefined);
    return NextResponse.json(listAdminBlogCommentsResponseSchema.parse({ comments }));
  } catch {
    return NextResponse.json({ error: "No se pudo cargar comentarios." }, { status: 500 });
  }
}
