import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logError } from "@/lib/logger";
import {
  whatsappPreviewInputSchema,
  whatsappPreviewResponseSchema,
} from "@/modules/checkout-whatsapp/contracts";
import {
  CheckoutStockUnavailableError,
  CheckoutWhatsAppService,
} from "@/modules/checkout-whatsapp/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = whatsappPreviewInputSchema.parse(body);
    const result = await new CheckoutWhatsAppService().preview(input);
    return NextResponse.json(whatsappPreviewResponseSchema.parse(result), { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos para el pedido.", details: error.flatten() },
        { status: 400 },
      );
    }

    if (error instanceof CheckoutStockUnavailableError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: 409 },
      );
    }

    logError("api_checkout_whatsapp_failed", { error });
    return NextResponse.json({ error: "No se pudo preparar el pedido." }, { status: 500 });
  }
}
