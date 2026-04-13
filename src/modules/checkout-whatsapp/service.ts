import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  WhatsAppPreviewInput,
  WhatsAppPreviewResponse,
  whatsappPreviewResponseSchema,
} from "@/modules/checkout-whatsapp/contracts";
import { buildWhatsAppMessage } from "@/modules/checkout-whatsapp/message";
import { expirePendingReservations } from "@/modules/checkout-whatsapp/reservation-expiration";

export class CheckoutStockUnavailableError extends Error {
  readonly details: Array<{
    variantId: string;
    requested: number;
    available: number;
    nombreVariante: string;
    nombreProducto: string;
  }>;

  constructor(
    details: Array<{
      variantId: string;
      requested: number;
      available: number;
      nombreVariante: string;
      nombreProducto: string;
    }>,
  ) {
    super("No hay stock disponible suficiente para uno o mas productos del carrito.");
    this.name = "CheckoutStockUnavailableError";
    this.details = details;
  }
}

export class CheckoutWhatsAppService {
  async preview(input: WhatsAppPreviewInput): Promise<WhatsAppPreviewResponse> {
    const previewWithoutOrder = buildWhatsAppMessage(input);

    if (!prisma) {
      return whatsappPreviewResponseSchema.parse({
        ...previewWithoutOrder,
        orderId: undefined,
      });
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          await expirePendingReservations(tx, { olderThanHours: 24 });

          const requestedByVariant = new Map<string, number>();

          for (const item of input.items) {
            if (!item.variantId) {
              continue;
            }
            requestedByVariant.set(
              item.variantId,
              (requestedByVariant.get(item.variantId) ?? 0) + item.cantidad,
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
                include: {
                  product: {
                    select: {
                      nombre: true,
                    },
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

            const unavailable: CheckoutStockUnavailableError["details"] = [];

            for (const [variantId, requested] of requestedByVariant.entries()) {
              const variant = variantsById.get(variantId);

              if (!variant) {
                unavailable.push({
                  variantId,
                  requested,
                  available: 0,
                  nombreVariante: "Variante no encontrada",
                  nombreProducto: "Producto",
                });
                continue;
              }

              const pendingReserved = pendingByVariant.get(variantId) ?? 0;
              const available = Math.max(variant.stockVirtual - pendingReserved, 0);

              if (requested > available) {
                unavailable.push({
                  variantId,
                  requested,
                  available,
                  nombreVariante: variant.nombreVariante,
                  nombreProducto: variant.product.nombre,
                });
              }
            }

            if (unavailable.length > 0) {
              throw new CheckoutStockUnavailableError(unavailable);
            }
          }

          const created = await tx.whatsappOrder.create({
            data: {
              clienteNombre: input.clienteNombre,
              clienteCiudad: input.clienteCiudad,
              telefono: input.telefono,
              subtotalReferencia: previewWithoutOrder.subtotalReferencia,
              mensaje: previewWithoutOrder.mensaje,
              estado: "pending",
              items: {
                create: input.items.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  nombreProducto: item.nombreProducto,
                  nombreVariante: item.nombreVariante,
                  precioUnitario: item.precioUnitario,
                  cantidad: item.cantidad,
                  subtotal: item.precioUnitario * item.cantidad,
                })),
              },
            },
            include: {
              items: true,
            },
          });

          const reservations = created.items
            .filter((item) => item.variantId)
            .map((item) => ({
              orderId: created.id,
              orderItemId: item.id,
              variantId: item.variantId as string,
              cantidad: item.cantidad,
              status: "pending" as const,
            }));

          if (reservations.length > 0) {
            await tx.stockReservation.createMany({
              data: reservations,
            });
          }

          const previewWithOrder = buildWhatsAppMessage(input, { orderId: created.id });

          await tx.whatsappOrder.update({
            where: {
              id: created.id,
            },
            data: {
              mensaje: previewWithOrder.mensaje,
            },
          });

          return {
            orderId: created.id,
            subtotalReferencia: previewWithOrder.subtotalReferencia,
            mensaje: previewWithOrder.mensaje,
            mensajeUrlEncoded: previewWithOrder.mensajeUrlEncoded,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return whatsappPreviewResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof CheckoutStockUnavailableError) {
        throw error;
      }

      logError("checkout_whatsapp_order_persist_failed", { error });
      throw new Error("No se pudo registrar la reserva del pedido.");
    }
  }
}
