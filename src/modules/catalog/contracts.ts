import { z } from "zod";

export const productCommercialStatusSchema = z.enum([
  "standard",
  "new",
  "limited",
  "low_stock",
]);

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  resumen: z.string().nullable(),
  descripcion: z.string().nullable(),
});

export const variantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  nombreVariante: z.string(),
  sku: z.string(),
  stockVirtual: z.number().int(),
  stockDisponible: z.number().int().nonnegative().optional(),
  stockMinimoAlerta: z.number().int().nonnegative(),
  precio: z.number().int(),
  imagenes: z.array(z.string()).max(3),
  descuentoActivo: z.boolean(),
  descuentoPorcentaje: z.number().int().min(0).max(100),
});

export const productSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  resumen: z.string().nullable(),
  descripcion: z.string(),
  historiaAroma: z.string().nullable(),
  notasOlfativas: z.string().nullable(),
  duracionAprox: z.string().nullable(),
  tamanoPeso: z.string().nullable(),
  idealPara: z.string().nullable(),
  instruccionesUso: z.string().nullable(),
  estadoComercial: productCommercialStatusSchema,
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  precioReferencia: z.number().int(),
  imagenes: z.array(z.string()).min(1),
  activo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  categoryId: z.string(),
  categoria: categorySchema,
  ratingPromedio: z.number().min(0).max(5).nullable().default(null),
  ratingCantidad: z.number().int().nonnegative().default(0),
});

export const productDetailSchema = productSummarySchema.extend({
  variantes: z.array(variantSchema),
});

export const listProductsResponseSchema = z.object({
  data: z.array(productSummarySchema),
});

export const getProductResponseSchema = z.object({
  data: productDetailSchema.nullable(),
});

export type CategoryDTO = z.infer<typeof categorySchema>;
export type VariantDTO = z.infer<typeof variantSchema>;
export type ProductSummaryDTO = z.infer<typeof productSummarySchema>;
export type ProductDetailDTO = z.infer<typeof productDetailSchema>;
export type ProductCommercialStatusDTO = z.infer<typeof productCommercialStatusSchema>;
