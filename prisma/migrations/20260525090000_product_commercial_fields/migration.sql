-- CreateEnum
CREATE TYPE "ProductCommercialStatus" AS ENUM ('standard', 'new', 'limited', 'low_stock');

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "historiaAroma" TEXT,
ADD COLUMN "notasOlfativas" TEXT,
ADD COLUMN "duracionAprox" TEXT,
ADD COLUMN "tamanoPeso" TEXT,
ADD COLUMN "idealPara" TEXT,
ADD COLUMN "instruccionesUso" TEXT,
ADD COLUMN "estadoComercial" "ProductCommercialStatus" NOT NULL DEFAULT 'standard',
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
