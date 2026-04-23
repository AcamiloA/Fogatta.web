import { z } from "zod";

export const themePaletteSchema = z.enum(["warm", "night", "navidad", "octubre"]);
export const themeAnimationTypeSchema = z.enum(["none", "snow", "sparkles", "float_icons"]);

export const adminThemeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  palette: themePaletteSchema,
  backgroundImageUrl: z.string().nullable(),
  backgroundOpacity: z.number().int().min(0).max(100),
  heroImageUrl: z.string().nullable(),
  heroOpacity: z.number().int().min(0).max(100),
  iconImageUrl: z.string().nullable(),
  iconImageUrls: z.array(z.string().url()).max(4),
  animationType: themeAnimationTypeSchema,
  animationIntensity: z.number().int().min(1).max(3),
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
  animationType: themeAnimationTypeSchema.default("none"),
  animationIntensity: z.number().int().min(1).max(3).default(1),
  backgroundOpacity: z.number().int().min(0).max(100).default(100),
  heroOpacity: z.number().int().min(0).max(100).default(100),
  iconImageUrls: z.array(z.string().url()).max(4).default([]),
});

export const updateThemeInputSchema = z
  .object({
    id: z.string().min(2),
    nombre: z.string().min(2).max(80).optional(),
    palette: themePaletteSchema.optional(),
    backgroundImageUrl: z.string().url().nullable().optional(),
    backgroundOpacity: z.number().int().min(0).max(100).optional(),
    heroImageUrl: z.string().url().nullable().optional(),
    heroOpacity: z.number().int().min(0).max(100).optional(),
    iconImageUrl: z.string().url().nullable().optional(),
    iconImageUrls: z.array(z.string().url()).max(4).optional(),
    animationType: themeAnimationTypeSchema.optional(),
    animationIntensity: z.number().int().min(1).max(3).optional(),
  })
  .refine(
    (value) =>
      value.nombre !== undefined ||
      value.palette !== undefined ||
      value.backgroundImageUrl !== undefined ||
      value.backgroundOpacity !== undefined ||
      value.heroImageUrl !== undefined ||
      value.heroOpacity !== undefined ||
      value.iconImageUrl !== undefined ||
      value.iconImageUrls !== undefined ||
      value.animationType !== undefined ||
      value.animationIntensity !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const activateThemeInputSchema = z.object({
  id: z.string().min(2),
});

export type ThemePaletteInput = z.infer<typeof themePaletteSchema>;
export type ThemeAnimationTypeInput = z.infer<typeof themeAnimationTypeSchema>;
