import { prisma } from "@/lib/db";
import { shippingDestinationRates } from "@/modules/shipping/seed-data";
import type { ShippingDestinationRateDTO } from "@/modules/shipping/contracts";

export class ShippingService {
  async listDestinationRates(): Promise<ShippingDestinationRateDTO[]> {
    if (!prisma) {
      return shippingDestinationRates;
    }

    const rates = await prisma.shippingDestinationRate.findMany({
      where: {
        activo: true,
      },
      orderBy: [{ destino: "asc" }, { departamento: "asc" }],
      select: {
        destino: true,
        departamento: true,
        destinoSlug: true,
        promedioEnvioUnitario: true,
      },
    });

    return rates;
  }

  async findDestinationRate(destinoSlug: string): Promise<ShippingDestinationRateDTO | null> {
    if (!prisma) {
      return shippingDestinationRates.find((rate) => rate.destinoSlug === destinoSlug) ?? null;
    }

    return prisma.shippingDestinationRate.findFirst({
      where: {
        destinoSlug,
        activo: true,
      },
      select: {
        destino: true,
        departamento: true,
        destinoSlug: true,
        promedioEnvioUnitario: true,
      },
    });
  }
}
