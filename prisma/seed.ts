import { PrismaClient } from "@prisma/client";
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  const categorias = [
    {
      slug: "rituales-nocturnos",
      nombre: "Rituales nocturnos",
      descripcion: "Aromas cálidos para cerrar el día.",
    },
    {
      slug: "dias-ligeros",
      nombre: "Dias ligeros",
      descripcion: "Fragancias limpias para espacios luminosos.",
    },
    {
      slug: "especiales",
      nombre: "Especiales",
      descripcion: "Ediciones para regalos y momentos clave.",
    },
  ];

  for (const categoria of categorias) {
    await prisma.category.upsert({
      where: { slug: categoria.slug },
      update: categoria,
      create: categoria,
    });
  }

  console.log('Seed ejecutado correctamente');
  // Intentionally no seeded products.
  // Product catalog will be loaded by the business team later.
}

main()
  .catch((error) => {
    console.error("Error running seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
