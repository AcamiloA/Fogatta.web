type ShippingPriceInput = {
  costoMinimoEnvio: number;
  costoEnvioUnitario: number;
};

const SHIPPING_PRICE_ROUNDING_UNIT = 500;

export function roundShippingPrice(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;

  return Math.ceil(safeValue / SHIPPING_PRICE_ROUNDING_UNIT) * SHIPPING_PRICE_ROUNDING_UNIT;
}

export function calculateShippingCost(rate: ShippingPriceInput, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  const safeQuantity = Math.floor(quantity);
  const rawCost = Math.max(rate.costoMinimoEnvio, rate.costoEnvioUnitario * safeQuantity);

  return roundShippingPrice(rawCost);
}
