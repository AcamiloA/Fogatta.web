import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/logger";
import { createLeadInputSchema } from "@/modules/leads/contracts";
import { LeadsService } from "@/modules/leads/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createLeadInputSchema.parse(body);
    const result = await new LeadsService().createLead(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos en formulario.", details: error.flatten() },
        { status: 400 },
      );
    }

    logError("api_create_lead_failed", { error });
    return NextResponse.json({ error: "No se pudo registrar el lead." }, { status: 500 });
  }
}
