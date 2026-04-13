import { z } from "zod";

export const reservationStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);
export const orderDecisionActionSchema = z.enum(["approve", "reject"]);

export const reservationVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  nombreVariante: z.string(),
  stockVirtual: z.number().int().nonnegative(),
  stockDisponible: z.number().int().nonnegative(),
});

export const reservationItemSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  variantId: z.string().nullable(),
  nombreProducto: z.string(),
  nombreVariante: z.string().nullable(),
  precioUnitario: z.number().int().nonnegative(),
  cantidad: z.number().int().positive(),
  subtotal: z.number().int().nonnegative(),
  variant: reservationVariantSchema.nullable(),
});

export const stockReservationSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderItemId: z.string().nullable(),
  variantId: z.string(),
  cantidad: z.number().int().positive(),
  status: reservationStatusSchema,
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const reservationOrderSchema = z.object({
  id: z.string(),
  clienteNombre: z.string(),
  clienteCiudad: z.string(),
  telefono: z.string(),
  subtotalReferencia: z.number().int().nonnegative(),
  estado: z.string(),
  mensaje: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(reservationItemSchema),
  reservas: z.array(stockReservationSchema),
});

export const reservationOrderListResponseSchema = z.object({
  data: z.array(reservationOrderSchema),
});

export const orderDecisionInputSchema = z.object({
  action: orderDecisionActionSchema,
});

export const orderDecisionResponseSchema = z.object({
  ok: z.literal(true),
  data: reservationOrderSchema,
});

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export type ReservationOrderDTO = z.infer<typeof reservationOrderSchema>;
