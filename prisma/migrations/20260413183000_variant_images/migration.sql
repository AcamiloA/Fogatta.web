-- AlterTable
ALTER TABLE "public"."Variant"
ADD COLUMN "imagenes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
