import { z } from "zod";

import { categorySchema, productDetailSchema } from "@/modules/catalog/contracts";

export const adminCatalogResponseSchema = z.object({
  categories: z.array(categorySchema),
  products: z.array(productDetailSchema),
});

export const createCategoryInputSchema = z.object({
  slug: z.string().min(2).max(80),
  nombre: z.string().min(2).max(120),
  descripcion: z.string().max(280).optional(),
});

export const createProductInputSchema = z.object({
  slug: z.string().min(2).max(120),
  nombre: z.string().min(2).max(160),
  descripcion: z.string().min(5).max(1000),
  imagenes: z.array(z.string().min(1)).min(1).max(8),
  activo: z.boolean().default(true),
  categoryId: z.string().min(2),
});

export const updateProductInputSchema = createProductInputSchema.partial().extend({
  id: z.string().min(2),
});

export const createVariantInputSchema = z.object({
  productId: z.string().min(2),
  nombreVariante: z.string().min(2).max(80),
  sku: z.string().min(2).max(80),
  stockVirtual: z.number().int().nonnegative(),
  precio: z.number().int().nonnegative(),
});

export const updateVariantInputSchema = z
  .object({
    id: z.string().min(2),
    nombreVariante: z.string().min(2).max(80).optional(),
    sku: z.string().min(2).max(80).optional(),
    stockVirtual: z.number().int().nonnegative().optional(),
    precio: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.nombreVariante !== undefined ||
          value.sku !== undefined ||
          value.stockVirtual !== undefined ||
          value.precio !== undefined,
      ),
    {
      message: "No hay campos para actualizar.",
    },
  );
