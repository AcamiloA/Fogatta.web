import { z } from "zod";

export const faqSchema = z.object({
  id: z.string(),
  pregunta: z.string(),
  respuesta: z.string(),
  orden: z.number().int(),
});

export const blogPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  autor: z.string(),
  extracto: z.string(),
  contenido: z.string(),
  imagen: z.string(),
  fechaPublicacion: z.string(),
});

export const legalPageSchema = z.object({
  tipo: z.enum(["privacidad", "terminos"]),
  contenido: z.string(),
  fechaVigencia: z.string(),
});

export const contentPayloadSchema = z.object({
  hero: z.object({
    titulo: z.string(),
    descripcion: z.string(),
  }),
  nosotros: z.object({
    titulo: z.string(),
    historia: z.string(),
    promesa: z.string(),
  }),
  faq: z.array(faqSchema),
  blog: z.array(blogPostSchema),
  legales: z.array(legalPageSchema),
});

export type ContentPayload = z.infer<typeof contentPayloadSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
