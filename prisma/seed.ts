import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed ejecutado correctamente");
  console.log("Sin datos precargados: carga catalogo, FAQ y blog desde el panel admin.");
}

main()
  .catch((error) => {
    console.error("Error running seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
