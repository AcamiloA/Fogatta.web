-- AlterTable
ALTER TABLE "public"."ShippingDestinationRate"
RENAME COLUMN "promedioEnvioUnitario" TO "costoEnvioUnitario";

ALTER TABLE "public"."ShippingDestinationRate"
ADD COLUMN "costoMinimoEnvio" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."ShippingDestinationRate"
ALTER COLUMN "costoMinimoEnvio" DROP DEFAULT;
