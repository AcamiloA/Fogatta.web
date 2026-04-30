import { z } from "zod";

import { faqCategorySchema, faqSchema, legalPageSchema } from "@/modules/content/contracts";

export const adminSiteContentSchema = z.object({
  heroTitulo: z.string(),
  heroDescripcion: z.string(),
  nosotrosTitulo: z.string(),
  nosotrosHistoria: z.string(),
  nosotrosPromesa: z.string(),
});

export const adminContentResponseSchema = z.object({
  site: adminSiteContentSchema,
  faqCategories: z.array(faqCategorySchema),
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
  faqCategoryId: z.string().min(2),
  orden: z.number().int().min(1).max(999),
});

export const updateFaqInputSchema = z
  .object({
    id: z.string().min(2),
    pregunta: z.string().min(6).max(220).optional(),
    respuesta: z.string().min(8).max(1400).optional(),
    faqCategoryId: z.string().min(2).nullable().optional(),
    orden: z.number().int().min(1).max(999).optional(),
  })
  .refine(
    (value) =>
      value.pregunta !== undefined ||
      value.respuesta !== undefined ||
      value.faqCategoryId !== undefined ||
      value.orden !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const createFaqCategoryInputSchema = z.object({
  nombre: z.string().min(3).max(120),
  descripcion: z.string().max(500).optional(),
  orden: z.number().int().min(1).max(999),
});

export const updateFaqCategoryInputSchema = z
  .object({
    id: z.string().min(2),
    nombre: z.string().min(3).max(120).optional(),
    descripcion: z.string().max(500).nullable().optional(),
    orden: z.number().int().min(1).max(999).optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.nombre !== undefined ||
      value.descripcion !== undefined ||
      value.orden !== undefined ||
      value.activo !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const updateLegalInputSchema = z.object({
  tipo: z.enum(["privacidad", "terminos"]),
  contenido: z.string().min(20).max(6000),
  fechaVigencia: z.string().min(10).max(10),
});
