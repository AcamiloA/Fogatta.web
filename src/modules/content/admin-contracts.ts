import { z } from "zod";

import { faqSchema, legalPageSchema } from "@/modules/content/contracts";

export const adminSiteContentSchema = z.object({
  heroTitulo: z.string(),
  heroDescripcion: z.string(),
  nosotrosTitulo: z.string(),
  nosotrosHistoria: z.string(),
  nosotrosPromesa: z.string(),
});

export const adminContentResponseSchema = z.object({
  site: adminSiteContentSchema,
  faq: z.array(faqSchema),
  legales: z.array(legalPageSchema),
});

export const updateSiteContentInputSchema = z.object({
  heroTitulo: z.string().min(4).max(180),
  heroDescripcion: z.string().min(10).max(280),
  nosotrosTitulo: z.string().min(4).max(180),
  nosotrosHistoria: z.string().min(20).max(1600),
  nosotrosPromesa: z.string().min(20).max(900),
});

export const createFaqInputSchema = z.object({
  pregunta: z.string().min(6).max(220),
  respuesta: z.string().min(8).max(1400),
  orden: z.number().int().min(1).max(999),
});

export const updateFaqInputSchema = z
  .object({
    id: z.string().min(2),
    pregunta: z.string().min(6).max(220).optional(),
    respuesta: z.string().min(8).max(1400).optional(),
    orden: z.number().int().min(1).max(999).optional(),
  })
  .refine(
    (value) =>
      value.pregunta !== undefined || value.respuesta !== undefined || value.orden !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const updateLegalInputSchema = z.object({
  tipo: z.enum(["privacidad", "terminos"]),
  contenido: z.string().min(20).max(6000),
  fechaVigencia: z.string().min(10).max(10),
});
