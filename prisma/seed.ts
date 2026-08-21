import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { shippingDestinationRates } from "../src/modules/shipping/seed-data";

const prisma = new PrismaClient();

async function main() {
  for (const destinationRate of shippingDestinationRates) {
    await prisma.shippingDestinationRate.upsert({
      where: {
        destinoSlug: destinationRate.destinoSlug,
      },
      update: {
        destino: destinationRate.destino,
        departamento: destinationRate.departamento,
        costoMinimoEnvio: destinationRate.costoMinimoEnvio,
        costoEnvioUnitario: destinationRate.costoEnvioUnitario,
        activo: destinationRate.activo,
      },
      create: destinationRate,
    });
  }

  console.log("Seed ejecutado correctamente");
  console.log(`${shippingDestinationRates.length} tarifas de envio por destino listas.`);
}

main()
  .catch((error) => {
    console.error("Error running seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
