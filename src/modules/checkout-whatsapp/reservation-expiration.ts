import { Prisma } from "@prisma/client";

type ReservationDb = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export async function expirePendingReservations(
  db: ReservationDb,
  options: {
    olderThanHours?: number;
    now?: Date;
  } = {},
) {
  const now = options.now ?? new Date();
  const olderThanHours = options.olderThanHours ?? 24;
  const cutoff = new Date(now.getTime() - olderThanHours * 60 * 60 * 1000);

  const candidateOrders = await db.whatsappOrder.findMany({
    where: {
      estado: "pending",
      updatedAt: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
    },
  });

  const orderIds = candidateOrders.map((order) => order.id);
  if (orderIds.length === 0) {
    return {
      ordersExpired: 0,
      reservationsExpired: 0,
    };
  }

  const [reservationUpdate, orderUpdate] = await Promise.all([
    db.stockReservation.updateMany({
      where: {
        orderId: {
          in: orderIds,
        },
        status: "pending",
      },
      data: {
        status: "expired",
        resolvedAt: now,
      },
    }),
    db.whatsappOrder.updateMany({
      where: {
        id: {
          in: orderIds,
        },
        estado: "pending",
      },
      data: {
        estado: "expired",
      },
    }),
  ]);

  return {
    ordersExpired: orderUpdate.count,
    reservationsExpired: reservationUpdate.count,
  };
}
