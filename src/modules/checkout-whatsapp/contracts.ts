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
  destinoSlug: z.string().min(2).max(160),
  telefono: z.string().min(7).max(20),
  notas: z.string().max(280).optional(),
  utm: z
    .object({
      utm_source: z.string().max(120).optional(),
      utm_medium: z.string().max(120).optional(),
      utm_campaign: z.string().max(120).optional(),
      utm_term: z.string().max(120).optional(),
      utm_content: z.string().max(120).optional(),
      gclid: z.string().max(200).optional(),
      fbclid: z.string().max(200).optional(),
    })
    .optional(),
  items: z.array(checkoutItemSchema).min(1),
});

export const whatsappPreviewResponseSchema = z.object({
  orderId: z.string().optional(),
  subtotalReferencia: z.number().int().nonnegative(),
  subtotalProductos: z.number().int().nonnegative(),
  costoEnvio: z.number().int().nonnegative(),
  totalReferencia: z.number().int().nonnegative(),
  mensaje: z.string(),
  mensajeUrlEncoded: z.string(),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type WhatsAppPreviewInput = z.infer<typeof whatsappPreviewInputSchema>;
export type WhatsAppPreviewResponse = z.infer<typeof whatsappPreviewResponseSchema>;
