import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  validateAdminLogin,
} from "@/modules/admin/auth";

const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = loginInputSchema.parse(body);

    if (!validateAdminLogin(input)) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const token = createAdminSessionToken(input.username.trim());
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 400 });
  }
}
