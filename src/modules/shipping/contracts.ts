import { z } from "zod";

export const shippingDestinationRateSchema = z.object({
  destino: z.string(),
  departamento: z.string(),
  destinoSlug: z.string(),
  costoMinimoEnvio: z.number().int().nonnegative(),
  costoEnvioUnitario: z.number().int().nonnegative(),
});

export const listShippingDestinationRatesResponseSchema = z.object({
  data: z.array(shippingDestinationRateSchema),
});

export type ShippingDestinationRateDTO = z.infer<typeof shippingDestinationRateSchema>;
