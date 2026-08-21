import { NextResponse } from "next/server";

import { logError } from "@/lib/logger";
import { listShippingDestinationRatesResponseSchema } from "@/modules/shipping/contracts";
import { ShippingService } from "@/modules/shipping/service";

const BROWSER_CACHE_SECONDS = 60 * 60;
const SHARED_CACHE_SECONDS = 60 * 60 * 24;
const STALE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const CACHE_CONTROL = [
  `public, max-age=${BROWSER_CACHE_SECONDS}`,
  `s-maxage=${SHARED_CACHE_SECONDS}`,
  `stale-while-revalidate=${STALE_REVALIDATE_SECONDS}`,
].join(", ");

export async function GET() {
  try {
    const destinationRates = await new ShippingService().listDestinationRates();
    const payload = listShippingDestinationRatesResponseSchema.parse({
      data: destinationRates,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    logError("api_list_shipping_destinations_failed", { error });
    return NextResponse.json(
      { error: "No se pudieron cargar los destinos de envio." },
      { status: 500 },
    );
  }
}
