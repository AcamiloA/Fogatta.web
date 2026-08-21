import { describe, expect, it } from "vitest";

import {
  parseCachedShippingDestinationRates,
  readCookieValue,
  SHIPPING_DESTINATIONS_CACHE_VERSION,
} from "@/modules/shipping/client-destination-cache";
import type { ShippingDestinationRateDTO } from "@/modules/shipping/contracts";

const now = new Date("2026-08-20T12:00:00.000Z").getTime();

const destination: ShippingDestinationRateDTO = {
  destino: "Bogota D.C.",
  departamento: "Bogota D.C.",
  destinoSlug: "bogota-d-c-bogota-d-c",
  costoMinimoEnvio: 8500,
  costoEnvioUnitario: 4158,
};

function buildPayload(cachedAt: number, data: ShippingDestinationRateDTO[] = [destination]) {
  return JSON.stringify({
    version: SHIPPING_DESTINATIONS_CACHE_VERSION,
    cachedAt,
    data,
  });
}

describe("shipping destination client cache", () => {
  it("reads a named cookie value from the browser cookie header", () => {
    expect(
      readCookieValue(
        "theme=warm; fogatta_shipping_destinations_cache=v1%3A123",
        "fogatta_shipping_destinations_cache",
      ),
    ).toBe("v1:123");
  });

  it("returns cached destinations when the cookie marker and payload are valid", () => {
    const cachedAt = now - 1000;
    const cached = parseCachedShippingDestinationRates(
      buildPayload(cachedAt),
      `${SHIPPING_DESTINATIONS_CACHE_VERSION}:${cachedAt}`,
      now,
    );

    expect(cached).toEqual([destination]);
  });

  it("ignores cached destinations when the cookie marker does not match the payload", () => {
    const cachedAt = now - 1000;
    const cached = parseCachedShippingDestinationRates(
      buildPayload(cachedAt),
      `${SHIPPING_DESTINATIONS_CACHE_VERSION}:${cachedAt - 1}`,
      now,
    );

    expect(cached).toBeNull();
  });

  it("ignores expired cached destinations", () => {
    const eightDaysAgo = now - 1000 * 60 * 60 * 24 * 8;
    const cached = parseCachedShippingDestinationRates(
      buildPayload(eightDaysAgo),
      `${SHIPPING_DESTINATIONS_CACHE_VERSION}:${eightDaysAgo}`,
      now,
    );

    expect(cached).toBeNull();
  });
});
