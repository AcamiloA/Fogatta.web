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
  imagenes: z.array(z.string().min(1)).min(1).max(1),
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
  stockMinimoAlerta: z.number().int().nonnegative().default(0),
  precio: z.number().int().nonnegative(),
  imagenes: z.array(z.string().min(1)).max(3).default([]),
  descuentoActivo: z.boolean().default(false),
  descuentoPorcentaje: z.number().int().min(0).max(100).default(0),
}).superRefine((value, ctx) => {
  if (value.descuentoActivo && (value.descuentoPorcentaje < 1 || value.descuentoPorcentaje > 100)) {
    ctx.addIssue({
      code: "custom",
      path: ["descuentoPorcentaje"],
      message: "El porcentaje de descuento debe estar entre 1 y 100.",
    });
  }
});

export const updateVariantInputSchema = z
  .object({
    id: z.string().min(2),
    nombreVariante: z.string().min(2).max(80).optional(),
    sku: z.string().min(2).max(80).optional(),
    stockVirtual: z.number().int().nonnegative().optional(),
    stockMinimoAlerta: z.number().int().nonnegative().optional(),
    precio: z.number().int().nonnegative().optional(),
    imagenes: z.array(z.string().min(1)).max(3).optional(),
    descuentoActivo: z.boolean().optional(),
    descuentoPorcentaje: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (value) =>
      Boolean(
          value.nombreVariante !== undefined ||
          value.sku !== undefined ||
          value.stockVirtual !== undefined ||
          value.stockMinimoAlerta !== undefined ||
          value.precio !== undefined ||
          value.imagenes !== undefined ||
          value.descuentoActivo !== undefined ||
          value.descuentoPorcentaje !== undefined,
      ),
    {
      message: "No hay campos para actualizar.",
    },
  )
  .superRefine((value, ctx) => {
    if (value.descuentoActivo === true && value.descuentoPorcentaje !== undefined) {
      if (value.descuentoPorcentaje < 1 || value.descuentoPorcentaje > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["descuentoPorcentaje"],
          message: "El porcentaje de descuento debe estar entre 1 y 100.",
        });
      }
    }
  });
