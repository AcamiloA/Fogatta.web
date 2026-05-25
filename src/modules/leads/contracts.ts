import { z } from "zod";

export const createLeadInputSchema = z.object({
  nombre: z.string().min(2).max(80),
  correo: z.string().email(),
  telefono: z.string().min(7).max(20),
  ciudad: z.string().max(80).optional(),
  mensaje: z.string().min(10).max(400),
  source: z.string().max(120).optional(),
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
});

export const createLeadResponseSchema = z.object({
  ok: z.boolean(),
  id: z.string(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
