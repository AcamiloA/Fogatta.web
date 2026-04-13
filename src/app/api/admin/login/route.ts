import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import {
  AdminTwoFactorConfigurationError,
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  ensureAdminTwoFactorConfigured,
  validateAdminLogin,
  validateAdminTwoFactor,
} from "@/modules/admin/auth";

const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  otp: z.string().regex(/^\s*\d{6}\s*$/).optional(),
});

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: `Demasiados intentos. Intenta de nuevo en ${retryAfterSeconds} segundos.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipRateLimit = await checkRateLimit(`admin-login:ip:${ip}`, {
      windowMs: 15 * 60_000,
      limit: 10,
    });
    if (!ipRateLimit.ok) {
      return tooManyAttempts(ipRateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const input = loginInputSchema.parse(body);

    const username = input.username.trim().toLowerCase();
    const userRateLimit = await checkRateLimit(`admin-login:user:${username}`, {
      windowMs: 15 * 60_000,
      limit: 12,
    });
    if (!userRateLimit.ok) {
      return tooManyAttempts(userRateLimit.retryAfterSeconds);
    }

    const account = validateAdminLogin(input);
    if (!account) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    ensureAdminTwoFactorConfigured(account);
    if (!input.otp) {
      return NextResponse.json({
        ok: false,
        requiresTwoFactor: true,
      });
    }

    const otpRateLimit = await checkRateLimit(`admin-login:otp:${username}:${ip}`, {
      windowMs: 10 * 60_000,
      limit: 5,
    });
    if (!otpRateLimit.ok) {
      return tooManyAttempts(otpRateLimit.retryAfterSeconds);
    }

    const twoFactorValid = await validateAdminTwoFactor(account, input.otp);
    if (!twoFactorValid) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    const token = createAdminSessionToken(account.username, account.role);
    const response = NextResponse.json({ ok: true, role: account.role });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 400 });
    }
    if (error instanceof AdminTwoFactorConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo iniciar sesion." }, { status: 400 });
  }
}
