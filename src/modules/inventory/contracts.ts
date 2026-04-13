import { z } from "zod";

export const inventorySupplySchema = z.object({
  id: z.string(),
  nombre: z.string(),
  unidad: z.string(),
  precioTotal: z.number().int().nonnegative(),
  cantidadTotal: z.number().positive(),
  activo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const inventoryRecipeItemSchema = z.object({
  id: z.string(),
  baseProductId: z.string(),
  supplyId: z.string(),
  cantidadUsada: z.number().positive(),
  supply: inventorySupplySchema.pick({
    id: true,
    nombre: true,
    unidad: true,
    precioTotal: true,
    cantidadTotal: true,
    activo: true,
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const inventoryBaseProductSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  categoria: z.string(),
  precioBrutoReferencia: z.number().int().nonnegative(),
  recipeItems: z.array(inventoryRecipeItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const inventoryLotSchema = z.object({
  id: z.string(),
  baseProductId: z.string(),
  serial: z.string(),
  fechaFabricacion: z.string().datetime(),
  fechaDisponible: z.string().datetime(),
  cantidadFabricada: z.number().int().positive(),
  stockActual: z.number().int().nonnegative(),
  stockAsignado: z.number().int().nonnegative(),
  stockDisponibleAsignar: z.number().int().nonnegative(),
  precioBrutoUnitario: z.number().int().nonnegative(),
  porcentajeUtilidad: z.number().int().min(0).max(1000),
  precioVentaUnitario: z.number().int().nonnegative(),
  baseProduct: z.object({
    id: z.string(),
    nombre: z.string(),
    categoria: z.string(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const inventoryShelfAssignmentSchema = z.object({
  id: z.string(),
  lotId: z.string(),
  nombreEstanteria: z.string(),
  cantidadAsignada: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lot: z.object({
    id: z.string(),
    serial: z.string(),
    stockActual: z.number().int().nonnegative(),
    baseProduct: z.object({
      id: z.string(),
      nombre: z.string(),
      categoria: z.string(),
    }),
  }),
});

export const listInventorySuppliesResponseSchema = z.object({
  data: z.array(inventorySupplySchema),
});

export const listInventoryBaseProductsResponseSchema = z.object({
  data: z.array(inventoryBaseProductSchema),
});

export const listInventoryLotsResponseSchema = z.object({
  data: z.array(inventoryLotSchema),
});

export const listInventoryShelfAssignmentsResponseSchema = z.object({
  data: z.array(inventoryShelfAssignmentSchema),
});

export type InventorySupplyDTO = z.infer<typeof inventorySupplySchema>;
export type InventoryRecipeItemDTO = z.infer<typeof inventoryRecipeItemSchema>;
export type InventoryBaseProductDTO = z.infer<typeof inventoryBaseProductSchema>;
export type InventoryLotDTO = z.infer<typeof inventoryLotSchema>;
export type InventoryShelfAssignmentDTO = z.infer<typeof inventoryShelfAssignmentSchema>;
