import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLeadInputSchema } from "@/modules/leads/contracts";
import {
  LeadEmailConfigurationError,
  LeadEmailSendError,
} from "@/modules/leads/email-notifier";
import { LeadsService } from "@/modules/leads/service";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSeconds} segundos.` },
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
    const ipRate = await checkRateLimit(`leads-contacto:ip:${ip}`, {
      windowMs: 60_000,
      limit: 6,
    });

    if (!ipRate.ok) {
      return tooManyRequests(ipRate.retryAfterSeconds);
    }

    const body = await request.json();
    const input = createLeadInputSchema.parse(body);

    const emailRate = await checkRateLimit(
      `leads-contacto:email:${input.correo.trim().toLowerCase()}`,
      {
        windowMs: 10 * 60_000,
        limit: 3,
      },
    );
    if (!emailRate.ok) {
      return tooManyRequests(emailRate.retryAfterSeconds);
    }

    const result = await new LeadsService().createLead(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos en formulario.", details: error.flatten() },
        { status: 400 },
      );
    }
    if (error instanceof LeadEmailConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof LeadEmailSendError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    logError("api_create_lead_failed", { error });
    return NextResponse.json({ error: "No se pudo registrar el lead." }, { status: 500 });
  }
}
