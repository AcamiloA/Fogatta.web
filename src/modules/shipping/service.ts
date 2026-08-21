import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { shippingDestinationRates } from "@/modules/shipping/seed-data";
import type { ShippingDestinationRateDTO } from "@/modules/shipping/contracts";

const SHIPPING_DESTINATION_RATES_CACHE_TTL_MS = 1000 * 60 * 60;

let destinationRatesCache:
  | {
      expiresAt: number;
      data: ShippingDestinationRateDTO[];
    }
  | null = null;

function getFallbackDestinationRates(): ShippingDestinationRateDTO[] {
  return shippingDestinationRates.map((rate) => ({
    destino: rate.destino,
    departamento: rate.departamento,
    destinoSlug: rate.destinoSlug,
    promedioEnvioUnitario: rate.promedioEnvioUnitario,
  }));
}

function readDestinationRatesCache() {
  if (!destinationRatesCache || destinationRatesCache.expiresAt <= Date.now()) {
    return null;
  }

  return destinationRatesCache.data;
}

function cacheDestinationRates(data: ShippingDestinationRateDTO[]) {
  destinationRatesCache = {
    data,
    expiresAt: Date.now() + SHIPPING_DESTINATION_RATES_CACHE_TTL_MS,
  };

  return data;
}

export class ShippingService {
  async listDestinationRates(): Promise<ShippingDestinationRateDTO[]> {
    const cachedRates = readDestinationRatesCache();
    if (cachedRates) {
      return cachedRates;
    }

    if (!prisma) {
      return cacheDestinationRates(getFallbackDestinationRates());
    }

    try {
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

      return cacheDestinationRates(rates.length > 0 ? rates : getFallbackDestinationRates());
    } catch (error) {
      logError("shipping_destination_rates_list_failed", { error });
      return cacheDestinationRates(getFallbackDestinationRates());
    }
  }

  async findDestinationRate(destinoSlug: string): Promise<ShippingDestinationRateDTO | null> {
    if (!prisma) {
      return (
        getFallbackDestinationRates().find((rate) => rate.destinoSlug === destinoSlug) ?? null
      );
    }

    try {
      const rate = await prisma.shippingDestinationRate.findFirst({
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

      return (
        rate ??
        getFallbackDestinationRates().find(
          (fallbackRate) => fallbackRate.destinoSlug === destinoSlug,
        ) ??
        null
      );
    } catch (error) {
      logError("shipping_destination_rate_lookup_failed", { error, destinoSlug });
      return (
        getFallbackDestinationRates().find((rate) => rate.destinoSlug === destinoSlug) ?? null
      );
    }
  }
}
