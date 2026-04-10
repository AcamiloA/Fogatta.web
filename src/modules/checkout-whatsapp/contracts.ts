import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  nombreProducto: z.string().min(2),
  nombreVariante: z.string().optional(),
  precioUnitario: z.number().int().nonnegative(),
  cantidad: z.number().int().positive(),
});

export const whatsappPreviewInputSchema = z.object({
  clienteNombre: z.string().min(2).max(80),
  clienteCiudad: z.string().min(2).max(80),
  telefono: z.string().min(7).max(20),
  notas: z.string().max(280).optional(),
  items: z.array(checkoutItemSchema).min(1),
});

export const whatsappPreviewResponseSchema = z.object({
  subtotalReferencia: z.number().int().nonnegative(),
  mensaje: z.string(),
  mensajeUrlEncoded: z.string(),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type WhatsAppPreviewInput = z.infer<typeof whatsappPreviewInputSchema>;
export type WhatsAppPreviewResponse = z.infer<typeof whatsappPreviewResponseSchema>;
