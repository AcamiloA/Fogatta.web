import { z } from "zod";

export const adminBlogPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  autor: z.string(),
  extracto: z.string(),
  contenido: z.string(),
  imagen: z.string(),
  fechaPublicacion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminBlogResponseSchema = z.object({
  posts: z.array(adminBlogPostSchema),
});

export const createBlogPostInputSchema = z.object({
  slug: z.string().min(2).max(160),
  titulo: z.string().min(2).max(180),
  autor: z.string().min(2).max(120),
  extracto: z.string().min(8).max(280),
  contenido: z.string().min(20).max(12000),
  imagen: z.string().max(600).optional(),
});

export const updateBlogPostInputSchema = z
  .object({
    id: z.string().min(2),
    slug: z.string().min(2).max(160).optional(),
    titulo: z.string().min(2).max(180).optional(),
    autor: z.string().min(2).max(120).optional(),
    extracto: z.string().min(8).max(280).optional(),
    contenido: z.string().min(20).max(12000).optional(),
    imagen: z.string().max(600).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.slug !== undefined ||
          value.titulo !== undefined ||
          value.autor !== undefined ||
          value.extracto !== undefined ||
          value.contenido !== undefined ||
          value.imagen !== undefined,
      ),
    {
      message: "No hay campos para actualizar.",
    },
  );

export type AdminBlogPostDTO = z.infer<typeof adminBlogPostSchema>;
export type AdminBlogPayloadDTO = z.infer<typeof adminBlogResponseSchema>;
