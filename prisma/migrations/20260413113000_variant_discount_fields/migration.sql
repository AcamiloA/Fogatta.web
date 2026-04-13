-- AlterTable
ALTER TABLE "public"."Variant"
ADD COLUMN "descuentoActivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "descuentoValor" INTEGER NOT NULL DEFAULT 0;
