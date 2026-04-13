import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { ReservationOrderDTO } from "@/modules/checkout-whatsapp/admin-contracts";
import { expirePendingReservations } from "@/modules/checkout-whatsapp/reservation-expiration";

type DecisionAction = "approve" | "reject";

export class ReservationOrderNotFoundError extends Error {
  constructor() {
    super("Reserva/pedido no encontrado.");
    this.name = "ReservationOrderNotFoundError";
  }
}

export class ReservationOrderInvalidStateError extends Error {
  constructor(currentState: string) {
    super(`El pedido ya fue gestionado (estado actual: ${currentState}).`);
    this.name = "ReservationOrderInvalidStateError";
  }
}

export class ReservationOrderStockConflictError extends Error {
  readonly details: Array<{
    variantId: string;
    sku: string;
    nombreVariante: string;
    requested: number;
    available: number;
  }>;

  constructor(
    details: Array<{
      variantId: string;
      sku: string;
      nombreVariante: string;
      requested: number;
      available: number;
    }>,
  ) {
    super("No hay stock suficiente para aprobar la venta.");
    this.name = "ReservationOrderStockConflictError";
    this.details = details;
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }

  return prisma;
}

type OrderWithRelations = Prisma.WhatsappOrderGetPayload<{
  include: {
    items: true;
    reservas: true;
  };
}>;

export class CheckoutReservationAdminService {
  async listOrders(status?: string): Promise<ReservationOrderDTO[]> {
    const db = ensurePrisma();
    await expirePendingReservations(db, { olderThanHours: 24 });

    const orders = await db.whatsappOrder.findMany({
      where: status ? { estado: status } : undefined,
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
        reservas: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return this.toOrderDTOs(orders);
  }

  async decideOrder(orderId: string, action: DecisionAction): Promise<ReservationOrderDTO> {
    const db = ensurePrisma();

    const result = await db.$transaction(
      async (tx) => {
        await expirePendingReservations(tx, { olderThanHours: 24 });

        const order = await tx.whatsappOrder.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            reservas: true,
          },
        });

        if (!order) {
          throw new ReservationOrderNotFoundError();
        }

        if (order.estado !== "pending") {
          throw new ReservationOrderInvalidStateError(order.estado);
        }

        const pendingReservations = order.reservas.filter((reserva) => reserva.status === "pending");

        if (action === "reject") {
          await tx.stockReservation.updateMany({
            where: {
              orderId: order.id,
              status: "pending",
            },
            data: {
              status: "rejected",
              resolvedAt: new Date(),
            },
          });

          await tx.whatsappOrder.update({
            where: { id: order.id },
            data: { estado: "rejected" },
          });
        } else {
          const requestedByVariant = new Map<string, number>();
          for (const reservation of pendingReservations) {
            requestedByVariant.set(
              reservation.variantId,
              (requestedByVariant.get(reservation.variantId) ?? 0) + reservation.cantidad,
            );
          }

          const variantIds = Array.from(requestedByVariant.keys());
          if (variantIds.length > 0) {
            const [variants, groupedPending] = await Promise.all([
              tx.variant.findMany({
                where: {
                  id: {
                    in: variantIds,
                  },
                },
              }),
              tx.stockReservation.groupBy({
                by: ["variantId"],
                where: {
                  status: "pending",
                  variantId: {
                    in: variantIds,
                  },
                },
                _sum: {
                  cantidad: true,
                },
              }),
            ]);

            const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
            const pendingByVariant = new Map(
              groupedPending.map((row) => [row.variantId, row._sum.cantidad ?? 0]),
            );

            const pendingByCurrentOrder = new Map<string, number>();
            for (const reservation of pendingReservations) {
              pendingByCurrentOrder.set(
                reservation.variantId,
                (pendingByCurrentOrder.get(reservation.variantId) ?? 0) + reservation.cantidad,
              );
            }

            const stockIssues: ReservationOrderStockConflictError["details"] = [];

            for (const [variantId, requested] of requestedByVariant.entries()) {
              const variant = variantsById.get(variantId);
              if (!variant) {
                stockIssues.push({
                  variantId,
                  sku: "N/A",
                  nombreVariante: "Variante no encontrada",
                  requested,
                  available: 0,
                });
                continue;
              }

              const pendingTotal = pendingByVariant.get(variantId) ?? 0;
              const pendingCurrentOrder = pendingByCurrentOrder.get(variantId) ?? 0;
              const availableToApprove = Math.max(
                variant.stockVirtual - Math.max(pendingTotal - pendingCurrentOrder, 0),
                0,
              );

              if (requested > availableToApprove) {
                stockIssues.push({
                  variantId,
                  sku: variant.sku,
                  nombreVariante: variant.nombreVariante,
                  requested,
                  available: availableToApprove,
                });
              }
            }

            if (stockIssues.length > 0) {
              throw new ReservationOrderStockConflictError(stockIssues);
            }

            for (const [variantId, requested] of requestedByVariant.entries()) {
              await tx.variant.update({
                where: { id: variantId },
                data: {
                  stockVirtual: {
                    decrement: requested,
                  },
                },
              });
            }
          }

          await tx.stockReservation.updateMany({
            where: {
              orderId: order.id,
              status: "pending",
            },
            data: {
              status: "approved",
              resolvedAt: new Date(),
            },
          });

          await tx.whatsappOrder.update({
            where: { id: order.id },
            data: { estado: "approved" },
          });
        }

        const updatedOrder = await tx.whatsappOrder.findUnique({
          where: { id: order.id },
          include: {
            items: {
              orderBy: {
                createdAt: "asc",
              },
            },
            reservas: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!updatedOrder) {
          throw new ReservationOrderNotFoundError();
        }

        return updatedOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const mapped = await this.toOrderDTOs([result]);
    return mapped[0]!;
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("checkout_reservation_admin_operation_failed", { error, ...context });
  }

  private async toOrderDTOs(orders: OrderWithRelations[]): Promise<ReservationOrderDTO[]> {
    if (orders.length === 0) {
      return [];
    }

    const db = ensurePrisma();
    const variantIds = Array.from(
      new Set(
        orders.flatMap((order) => order.items.map((item) => item.variantId).filter(Boolean) as string[]),
      ),
    );

    const pendingByVariant = new Map<string, number>();
    const variantsById = new Map<
      string,
      {
        id: string;
        sku: string;
        nombreVariante: string;
        stockVirtual: number;
      }
    >();
    if (variantIds.length > 0) {
      const [grouped, variants] = await Promise.all([
        db.stockReservation.groupBy({
          by: ["variantId"],
          where: {
            status: "pending",
            variantId: {
              in: variantIds,
            },
          },
          _sum: {
            cantidad: true,
          },
        }),
        db.variant.findMany({
          where: {
            id: {
              in: variantIds,
            },
          },
          select: {
            id: true,
            sku: true,
            nombreVariante: true,
            stockVirtual: true,
          },
        }),
      ]);
      for (const row of grouped) {
        pendingByVariant.set(row.variantId, row._sum.cantidad ?? 0);
      }
      for (const variant of variants) {
        variantsById.set(variant.id, variant);
      }
    }

    return orders.map((order) => ({
      id: order.id,
      clienteNombre: order.clienteNombre,
      clienteCiudad: order.clienteCiudad,
      telefono: order.telefono,
      subtotalReferencia: order.subtotalReferencia,
      estado: order.estado,
      mensaje: order.mensaje,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        nombreProducto: item.nombreProducto,
        nombreVariante: item.nombreVariante,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        variant: item.variantId && variantsById.has(item.variantId)
          ? {
              id: variantsById.get(item.variantId)!.id,
              sku: variantsById.get(item.variantId)!.sku,
              nombreVariante: variantsById.get(item.variantId)!.nombreVariante,
              stockVirtual: variantsById.get(item.variantId)!.stockVirtual,
              stockDisponible: Math.max(
                variantsById.get(item.variantId)!.stockVirtual -
                  (pendingByVariant.get(item.variantId) ?? 0),
                0,
              ),
            }
          : null,
      })),
      reservas: order.reservas.map((reserva) => ({
        id: reserva.id,
        orderId: reserva.orderId,
        orderItemId: reserva.orderItemId,
        variantId: reserva.variantId,
        cantidad: reserva.cantidad,
        status: reserva.status,
        resolvedAt: reserva.resolvedAt ? reserva.resolvedAt.toISOString() : null,
        createdAt: reserva.createdAt.toISOString(),
        updatedAt: reserva.updatedAt.toISOString(),
      })),
    }));
  }
}
