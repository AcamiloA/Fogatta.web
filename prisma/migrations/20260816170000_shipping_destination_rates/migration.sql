-- CreateTable
CREATE TABLE "public"."ShippingDestinationRate" (
    "id" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "destinoSlug" TEXT NOT NULL,
    "promedioEnvioUnitario" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingDestinationRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingDestinationRate_destinoSlug_key" ON "public"."ShippingDestinationRate"("destinoSlug");

-- CreateIndex
CREATE INDEX "ShippingDestinationRate_destino_idx" ON "public"."ShippingDestinationRate"("destino");

-- CreateIndex
CREATE INDEX "ShippingDestinationRate_departamento_idx" ON "public"."ShippingDestinationRate"("departamento");
