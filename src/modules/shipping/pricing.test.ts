import { describe, expect, it } from "vitest";

import { calculateShippingCost, roundShippingPrice } from "@/modules/shipping/pricing";

describe("shipping pricing", () => {
  it("rounds prices up to the nearest 500 COP", () => {
    expect(roundShippingPrice(8316)).toBe(8500);
    expect(roundShippingPrice(8500)).toBe(8500);
  });

  it("uses the minimum shipping cost for one unit", () => {
    expect(
      calculateShippingCost(
        {
          costoMinimoEnvio: 8500,
          costoEnvioUnitario: 4500,
        },
        1,
      ),
    ).toBe(8500);
  });

  it("uses the rounded unit cost when quantity exceeds the minimum", () => {
    expect(
      calculateShippingCost(
        {
          costoMinimoEnvio: 8500,
          costoEnvioUnitario: 4500,
        },
        4,
      ),
    ).toBe(18000);
  });
});
