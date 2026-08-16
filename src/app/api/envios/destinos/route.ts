import { NextResponse } from "next/server";

import { logError } from "@/lib/logger";
import { listShippingDestinationRatesResponseSchema } from "@/modules/shipping/contracts";
import { ShippingService } from "@/modules/shipping/service";

export async function GET() {
  try {
    const destinationRates = await new ShippingService().listDestinationRates();
    const payload = listShippingDestinationRatesResponseSchema.parse({
      data: destinationRates,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    logError("api_list_shipping_destinations_failed", { error });
    return NextResponse.json(
      { error: "No se pudieron cargar los destinos de envio." },
      { status: 500 },
    );
  }
}
