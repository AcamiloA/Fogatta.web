import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  InventoryBaseProductDTO,
  InventoryLotDTO,
  InventoryShelfAssignmentDTO,
  InventorySupplyDTO,
  inventoryBaseProductSchema,
  inventoryLotSchema,
  inventoryShelfAssignmentSchema,
  inventorySupplySchema,
} from "@/modules/inventory/contracts";

export class InventorySupplyNotFoundError extends Error {
  constructor() {
    super("Insumo no encontrado.");
    this.name = "InventorySupplyNotFoundError";
  }
}

export class InventoryBaseProductNotFoundError extends Error {
  constructor() {
    super("Producto base no encontrado.");
    this.name = "InventoryBaseProductNotFoundError";
  }
}

export class InventoryLotNotFoundError extends Error {
  constructor() {
    super("Lote no encontrado.");
    this.name = "InventoryLotNotFoundError";
  }
}

export class InventoryLotAssignmentsConflictError extends Error {
  constructor() {
    super("El lote tiene asignaciones y no permite esta operacion.");
    this.name = "InventoryLotAssignmentsConflictError";
  }
}

export class InventoryStockInsufficientError extends Error {
  readonly available: number;

  constructor(available: number) {
    super(`Stock insuficiente para asignar. Disponible: ${available}.`);
    this.name = "InventoryStockInsufficientError";
    this.available = available;
  }
}

export class InventoryInvalidDateError extends Error {
  constructor(field: string) {
    super(`Fecha invalida en campo: ${field}.`);
    this.name = "InventoryInvalidDateError";
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }

  return prisma;
}

function parseDateInput(value: string, field: string) {
  const trimmed = value.trim();

  const ddMmYyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const day = Number.parseInt(ddMmYyyy[1] ?? "0", 10);
    const month = Number.parseInt(ddMmYyyy[2] ?? "0", 10);
    const year = Number.parseInt(ddMmYyyy[3] ?? "0", 10);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new InventoryInvalidDateError(field);
  }

  return parsed;
}

function calculateRecipeCost(recipeItems: Array<{ cantidadUsada: number; supply: { precioTotal: number; cantidadTotal: number } }>) {
  const total = recipeItems.reduce((acc, item) => {
    if (item.supply.cantidadTotal <= 0) {
      return acc;
    }

    const unitCost = item.supply.precioTotal / item.supply.cantidadTotal;
    return acc + unitCost * item.cantidadUsada;
  }, 0);

  return Math.max(Math.round(total), 0);
}

function toSupplyDTO(supply: {
  id: string;
  nombre: string;
  unidad: string;
  precioTotal: number;
  cantidadTotal: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): InventorySupplyDTO {
  return inventorySupplySchema.parse({
    id: supply.id,
    nombre: supply.nombre,
    unidad: supply.unidad,
    precioTotal: supply.precioTotal,
    cantidadTotal: supply.cantidadTotal,
    activo: supply.activo,
    createdAt: supply.createdAt.toISOString(),
    updatedAt: supply.updatedAt.toISOString(),
  });
}

function toBaseProductDTO(product: {
  id: string;
  nombre: string;
  categoria: string;
  precioBrutoReferencia: number;
  createdAt: Date;
  updatedAt: Date;
  recipeItems: Array<{
    id: string;
    baseProductId: string;
    supplyId: string;
    cantidadUsada: number;
    createdAt: Date;
    updatedAt: Date;
    supply: {
      id: string;
      nombre: string;
      unidad: string;
      precioTotal: number;
      cantidadTotal: number;
      activo: boolean;
    };
  }>;
}): InventoryBaseProductDTO {
  return inventoryBaseProductSchema.parse({
    id: product.id,
    nombre: product.nombre,
    categoria: product.categoria,
    precioBrutoReferencia: product.precioBrutoReferencia,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    recipeItems: product.recipeItems.map((item) => ({
      id: item.id,
      baseProductId: item.baseProductId,
      supplyId: item.supplyId,
      cantidadUsada: item.cantidadUsada,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      supply: {
        id: item.supply.id,
        nombre: item.supply.nombre,
        unidad: item.supply.unidad,
        precioTotal: item.supply.precioTotal,
        cantidadTotal: item.supply.cantidadTotal,
        activo: item.supply.activo,
      },
    })),
  });
}

function toLotDTO(lot: {
  id: string;
  baseProductId: string;
  serial: string;
  fechaFabricacion: Date;
  fechaDisponible: Date;
  cantidadFabricada: number;
  stockActual: number;
  precioBrutoUnitario: number;
  porcentajeUtilidad: number;
  precioVentaUnitario: number;
  createdAt: Date;
  updatedAt: Date;
  baseProduct: {
    id: string;
    nombre: string;
    categoria: string;
  };
  assignments: Array<{ cantidadAsignada: number }>;
}): InventoryLotDTO {
  const stockAsignado = lot.assignments.reduce((acc, item) => acc + item.cantidadAsignada, 0);

  return inventoryLotSchema.parse({
    id: lot.id,
    baseProductId: lot.baseProductId,
    serial: lot.serial,
    fechaFabricacion: lot.fechaFabricacion.toISOString(),
    fechaDisponible: lot.fechaDisponible.toISOString(),
    cantidadFabricada: lot.cantidadFabricada,
    stockActual: lot.stockActual,
    stockAsignado,
    stockDisponibleAsignar: Math.max(lot.stockActual - stockAsignado, 0),
    precioBrutoUnitario: lot.precioBrutoUnitario,
    porcentajeUtilidad: lot.porcentajeUtilidad,
    precioVentaUnitario: lot.precioVentaUnitario,
    createdAt: lot.createdAt.toISOString(),
    updatedAt: lot.updatedAt.toISOString(),
    baseProduct: {
      id: lot.baseProduct.id,
      nombre: lot.baseProduct.nombre,
      categoria: lot.baseProduct.categoria,
    },
  });
}

function toShelfAssignmentDTO(item: {
  id: string;
  lotId: string;
  nombreEstanteria: string;
  cantidadAsignada: number;
  createdAt: Date;
  updatedAt: Date;
  lot: {
    id: string;
    serial: string;
    stockActual: number;
    baseProduct: {
      id: string;
      nombre: string;
      categoria: string;
    };
  };
}): InventoryShelfAssignmentDTO {
  return inventoryShelfAssignmentSchema.parse({
    id: item.id,
    lotId: item.lotId,
    nombreEstanteria: item.nombreEstanteria,
    cantidadAsignada: item.cantidadAsignada,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lot: {
      id: item.lot.id,
      serial: item.lot.serial,
      stockActual: item.lot.stockActual,
      baseProduct: {
        id: item.lot.baseProduct.id,
        nombre: item.lot.baseProduct.nombre,
        categoria: item.lot.baseProduct.categoria,
      },
    },
  });
}

export class InventoryAdminService {
  async listSupplies() {
    const db = ensurePrisma();
    const rows = await db.inventorySupply.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });

    return rows.map(toSupplyDTO);
  }

  async createSupply(input: {
    nombre: string;
    unidad: string;
    precioTotal: number;
    cantidadTotal: number;
    activo: boolean;
  }) {
    const db = ensurePrisma();

    const created = await db.inventorySupply.create({
      data: {
        nombre: input.nombre.trim(),
        unidad: input.unidad.trim(),
        precioTotal: input.precioTotal,
        cantidadTotal: input.cantidadTotal,
        activo: input.activo,
      },
    });

    return toSupplyDTO(created);
  }

  async updateSupply(
    id: string,
    input: {
      nombre?: string;
      unidad?: string;
      precioTotal?: number;
      cantidadTotal?: number;
      activo?: boolean;
    },
  ) {
    const db = ensurePrisma();

    const found = await db.inventorySupply.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new InventorySupplyNotFoundError();
    }

    const updated = await db.inventorySupply.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim(),
        unidad: input.unidad?.trim(),
        precioTotal: input.precioTotal,
        cantidadTotal: input.cantidadTotal,
        activo: input.activo,
      },
    });

    return toSupplyDTO(updated);
  }

  async deleteSupply(id: string) {
    const db = ensurePrisma();

    const found = await db.inventorySupply.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            recipeItems: true,
          },
        },
      },
    });

    if (!found) {
      throw new InventorySupplyNotFoundError();
    }

    if (found._count.recipeItems > 0) {
      throw new Error("No se puede eliminar un insumo que esta en recetas.");
    }

    await db.inventorySupply.delete({ where: { id } });
  }

  async listBaseProducts() {
    const db = ensurePrisma();

    const rows = await db.inventoryBaseProduct.findMany({
      include: {
        recipeItems: {
          include: {
            supply: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map(toBaseProductDTO);
  }

  async createBaseProduct(input: {
    nombre: string;
    categoria: string;
    recipeItems: Array<{ supplyId: string; cantidadUsada: number }>;
  }) {
    const db = ensurePrisma();

    const created = await db.$transaction(async (tx) => {
      if (input.recipeItems.length > 0) {
        const supplyIds = input.recipeItems.map((item) => item.supplyId);
        const count = await tx.inventorySupply.count({
          where: {
            id: {
              in: supplyIds,
            },
          },
        });

        if (count !== supplyIds.length) {
          throw new Error("La receta contiene insumos inexistentes.");
        }
      }

      const baseProduct = await tx.inventoryBaseProduct.create({
        data: {
          nombre: input.nombre.trim(),
          categoria: input.categoria.trim(),
          recipeItems: {
            create: input.recipeItems.map((item) => ({
              supplyId: item.supplyId,
              cantidadUsada: item.cantidadUsada,
            })),
          },
        },
        include: {
          recipeItems: {
            include: {
              supply: true,
            },
          },
        },
      });

      const recipeCost = calculateRecipeCost(baseProduct.recipeItems);
      const updated = await tx.inventoryBaseProduct.update({
        where: { id: baseProduct.id },
        data: { precioBrutoReferencia: recipeCost },
        include: {
          recipeItems: {
            include: {
              supply: true,
            },
          },
        },
      });

      return updated;
    });

    return toBaseProductDTO(created);
  }

  async updateBaseProduct(
    id: string,
    input: {
      nombre?: string;
      categoria?: string;
      recipeItems?: Array<{ supplyId: string; cantidadUsada: number }>;
    },
  ) {
    const db = ensurePrisma();

    const updated = await db.$transaction(async (tx) => {
      const found = await tx.inventoryBaseProduct.findUnique({ where: { id }, select: { id: true } });
      if (!found) {
        throw new InventoryBaseProductNotFoundError();
      }

      if (input.recipeItems) {
        const supplyIds = input.recipeItems.map((item) => item.supplyId);
        if (supplyIds.length > 0) {
          const count = await tx.inventorySupply.count({
            where: {
              id: {
                in: supplyIds,
              },
            },
          });
          if (count !== supplyIds.length) {
            throw new Error("La receta contiene insumos inexistentes.");
          }
        }
      }

      await tx.inventoryBaseProduct.update({
        where: { id },
        data: {
          nombre: input.nombre?.trim(),
          categoria: input.categoria?.trim(),
        },
      });

      if (input.recipeItems) {
        await tx.inventoryRecipeItem.deleteMany({ where: { baseProductId: id } });

        if (input.recipeItems.length > 0) {
          await tx.inventoryRecipeItem.createMany({
            data: input.recipeItems.map((item) => ({
              baseProductId: id,
              supplyId: item.supplyId,
              cantidadUsada: item.cantidadUsada,
            })),
          });
        }
      }

      const loaded = await tx.inventoryBaseProduct.findUnique({
        where: { id },
        include: {
          recipeItems: {
            include: {
              supply: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!loaded) {
        throw new InventoryBaseProductNotFoundError();
      }

      const recipeCost = calculateRecipeCost(loaded.recipeItems);
      return tx.inventoryBaseProduct.update({
        where: { id },
        data: {
          precioBrutoReferencia: recipeCost,
        },
        include: {
          recipeItems: {
            include: {
              supply: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    });

    return toBaseProductDTO(updated);
  }

  async deleteBaseProduct(id: string) {
    const db = ensurePrisma();

    const found = await db.inventoryBaseProduct.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            lots: true,
          },
        },
      },
    });

    if (!found) {
      throw new InventoryBaseProductNotFoundError();
    }

    if (found._count.lots > 0) {
      throw new Error("No se puede eliminar un producto base con lotes registrados.");
    }

    await db.inventoryBaseProduct.delete({ where: { id } });
  }

  async listLots() {
    const db = ensurePrisma();
    const rows = await db.inventoryLot.findMany({
      include: {
        baseProduct: true,
        assignments: {
          select: {
            cantidadAsignada: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map(toLotDTO);
  }

  async createLot(input: {
    baseProductId: string;
    serial: string;
    fechaFabricacion: string;
    fechaDisponible: string;
    cantidadFabricada: number;
    stockActual: number;
    precioBrutoUnitario: number;
    porcentajeUtilidad: number;
    precioVentaUnitario: number;
  }) {
    const db = ensurePrisma();

    const foundBaseProduct = await db.inventoryBaseProduct.findUnique({
      where: { id: input.baseProductId },
      select: { id: true },
    });

    if (!foundBaseProduct) {
      throw new InventoryBaseProductNotFoundError();
    }

    const fechaFabricacion = parseDateInput(input.fechaFabricacion, "fechaFabricacion");
    const fechaDisponible = parseDateInput(input.fechaDisponible, "fechaDisponible");

    const created = await db.inventoryLot.create({
      data: {
        baseProductId: input.baseProductId,
        serial: input.serial.trim(),
        fechaFabricacion,
        fechaDisponible,
        cantidadFabricada: input.cantidadFabricada,
        stockActual: input.stockActual,
        precioBrutoUnitario: input.precioBrutoUnitario,
        porcentajeUtilidad: input.porcentajeUtilidad,
        precioVentaUnitario: input.precioVentaUnitario,
      },
      include: {
        baseProduct: true,
        assignments: {
          select: {
            cantidadAsignada: true,
          },
        },
      },
    });

    return toLotDTO(created);
  }

  async updateLot(
    id: string,
    input: {
      fechaFabricacion?: string;
      fechaDisponible?: string;
      cantidadFabricada?: number;
      stockActual?: number;
      precioBrutoUnitario?: number;
      porcentajeUtilidad?: number;
      precioVentaUnitario?: number;
    },
  ) {
    const db = ensurePrisma();

    const current = await db.inventoryLot.findUnique({
      where: { id },
      include: {
        assignments: {
          select: {
            cantidadAsignada: true,
          },
        },
        baseProduct: true,
      },
    });

    if (!current) {
      throw new InventoryLotNotFoundError();
    }

    const assignedTotal = current.assignments.reduce(
      (acc: number, item: { cantidadAsignada: number }) => acc + item.cantidadAsignada,
      0,
    );
    const nextStockActual = input.stockActual ?? current.stockActual;
    const nextCantidadFabricada = input.cantidadFabricada ?? current.cantidadFabricada;

    if (nextStockActual > nextCantidadFabricada) {
      throw new Error("El stock actual no puede ser mayor a la cantidad fabricada.");
    }

    if (nextStockActual < assignedTotal) {
      throw new InventoryLotAssignmentsConflictError();
    }

    const updated = await db.inventoryLot.update({
      where: { id },
      data: {
        fechaFabricacion:
          input.fechaFabricacion !== undefined
            ? parseDateInput(input.fechaFabricacion, "fechaFabricacion")
            : undefined,
        fechaDisponible:
          input.fechaDisponible !== undefined
            ? parseDateInput(input.fechaDisponible, "fechaDisponible")
            : undefined,
        cantidadFabricada: input.cantidadFabricada,
        stockActual: input.stockActual,
        precioBrutoUnitario: input.precioBrutoUnitario,
        porcentajeUtilidad: input.porcentajeUtilidad,
        precioVentaUnitario: input.precioVentaUnitario,
      },
      include: {
        baseProduct: true,
        assignments: {
          select: {
            cantidadAsignada: true,
          },
        },
      },
    });

    return toLotDTO(updated);
  }

  async deleteLot(id: string) {
    const db = ensurePrisma();

    const found = await db.inventoryLot.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!found) {
      throw new InventoryLotNotFoundError();
    }

    if (found._count.assignments > 0) {
      throw new InventoryLotAssignmentsConflictError();
    }

    await db.inventoryLot.delete({ where: { id } });
  }

  async listShelfAssignments() {
    const db = ensurePrisma();

    const rows = await db.inventoryShelfAssignment.findMany({
      include: {
        lot: {
          include: {
            baseProduct: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return rows.map(toShelfAssignmentDTO);
  }

  async createShelfAssignment(input: {
    lotId: string;
    nombreEstanteria: string;
    cantidadAsignada: number;
  }) {
    const db = ensurePrisma();

    const created = await db.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({
        where: { id: input.lotId },
        include: {
          baseProduct: true,
          assignments: {
            select: {
              cantidadAsignada: true,
            },
          },
        },
      });

      if (!lot) {
        throw new InventoryLotNotFoundError();
      }

      const assignedTotal = lot.assignments.reduce(
        (acc: number, item: { cantidadAsignada: number }) => acc + item.cantidadAsignada,
        0,
      );
      const available = lot.stockActual - assignedTotal;

      if (input.cantidadAsignada > available) {
        throw new InventoryStockInsufficientError(Math.max(available, 0));
      }

      return tx.inventoryShelfAssignment.create({
        data: {
          lotId: input.lotId,
          nombreEstanteria: input.nombreEstanteria.trim(),
          cantidadAsignada: input.cantidadAsignada,
        },
        include: {
          lot: {
            include: {
              baseProduct: true,
            },
          },
        },
      });
    });

    return toShelfAssignmentDTO(created);
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("inventory_admin_operation_failed", { error, ...context });
  }
}
