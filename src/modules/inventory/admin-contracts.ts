import { z } from "zod";

const recipeItemInputSchema = z.object({
  supplyId: z.string().min(2),
  cantidadUsada: z.number().positive(),
});

function hasUniqueSupplyIds(items: Array<{ supplyId: string }>) {
  return new Set(items.map((item) => item.supplyId)).size === items.length;
}

export const createInventorySupplyInputSchema = z.object({
  nombre: z.string().min(2).max(160),
  unidad: z.string().min(1).max(40),
  precioTotal: z.number().int().nonnegative(),
  cantidadTotal: z.number().positive(),
  activo: z.boolean().default(true),
});

export const updateInventorySupplyInputSchema = z
  .object({
    id: z.string().min(2),
    nombre: z.string().min(2).max(160).optional(),
    unidad: z.string().min(1).max(40).optional(),
    precioTotal: z.number().int().nonnegative().optional(),
    cantidadTotal: z.number().positive().optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.nombre !== undefined ||
      value.unidad !== undefined ||
      value.precioTotal !== undefined ||
      value.cantidadTotal !== undefined ||
      value.activo !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const createInventoryBaseProductInputSchema = z
  .object({
    nombre: z.string().min(2).max(160),
    categoria: z.string().min(2).max(120),
    recipeItems: z.array(recipeItemInputSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (!hasUniqueSupplyIds(value.recipeItems)) {
      ctx.addIssue({
        code: "custom",
        path: ["recipeItems"],
        message: "No se puede repetir el mismo insumo en una receta.",
      });
    }
  });

export const updateInventoryBaseProductInputSchema = z
  .object({
    id: z.string().min(2),
    nombre: z.string().min(2).max(160).optional(),
    categoria: z.string().min(2).max(120).optional(),
    recipeItems: z.array(recipeItemInputSchema).optional(),
  })
  .refine(
    (value) => value.nombre !== undefined || value.categoria !== undefined || value.recipeItems !== undefined,
    { message: "No hay campos para actualizar." },
  )
  .superRefine((value, ctx) => {
    if (value.recipeItems && !hasUniqueSupplyIds(value.recipeItems)) {
      ctx.addIssue({
        code: "custom",
        path: ["recipeItems"],
        message: "No se puede repetir el mismo insumo en una receta.",
      });
    }
  });

export const createInventoryLotInputSchema = z
  .object({
    baseProductId: z.string().min(2),
    serial: z.string().min(3).max(120),
    fechaFabricacion: z.string().min(10),
    fechaDisponible: z.string().min(10),
    cantidadFabricada: z.number().int().positive(),
    stockActual: z.number().int().nonnegative(),
    precioBrutoUnitario: z.number().int().nonnegative(),
    porcentajeUtilidad: z.number().int().min(0).max(1000),
    precioVentaUnitario: z.number().int().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (value.stockActual > value.cantidadFabricada) {
      ctx.addIssue({
        code: "custom",
        path: ["stockActual"],
        message: "El stock actual no puede ser mayor a la cantidad fabricada.",
      });
    }
  });

export const updateInventoryLotInputSchema = z
  .object({
    id: z.string().min(2),
    fechaFabricacion: z.string().min(10).optional(),
    fechaDisponible: z.string().min(10).optional(),
    cantidadFabricada: z.number().int().positive().optional(),
    stockActual: z.number().int().nonnegative().optional(),
    precioBrutoUnitario: z.number().int().nonnegative().optional(),
    porcentajeUtilidad: z.number().int().min(0).max(1000).optional(),
    precioVentaUnitario: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.fechaFabricacion !== undefined ||
      value.fechaDisponible !== undefined ||
      value.cantidadFabricada !== undefined ||
      value.stockActual !== undefined ||
      value.precioBrutoUnitario !== undefined ||
      value.porcentajeUtilidad !== undefined ||
      value.precioVentaUnitario !== undefined,
    { message: "No hay campos para actualizar." },
  );

export const createInventoryShelfAssignmentInputSchema = z.object({
  lotId: z.string().min(2),
  nombreEstanteria: z.string().min(1).max(120),
  cantidadAsignada: z.number().int().positive(),
});
