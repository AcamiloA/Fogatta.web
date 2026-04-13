import { z } from "zod";

export const themePaletteSchema = z.enum(["warm", "night", "navidad", "octubre"]);

export const adminThemeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  palette: themePaletteSchema,
  backgroundImageUrl: z.string().nullable(),
  heroImageUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const adminThemeListResponseSchema = z.object({
  activeThemeId: z.string().nullable(),
  themes: z.array(adminThemeSchema),
});

export const createThemeInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nombre: z.string().min(2).max(80),
  palette: themePaletteSchema,
});

export const updateThemeInputSchema = z
  .object({
    id: z.string().min(2),
    nombre: z.string().min(2).max(80).optional(),
    palette: themePaletteSchema.optional(),
    backgroundImageUrl: z.string().url().nullable().optional(),
    heroImageUrl: z.string().url().nullable().optional(),
  })
  .refine(
    (value) =>
      value.nombre !== undefined ||
      value.palette !== undefined ||
      value.backgroundImageUrl !== undefined ||
      value.heroImageUrl !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const activateThemeInputSchema = z.object({
  id: z.string().min(2),
});

export type ThemePaletteInput = z.infer<typeof themePaletteSchema>;
