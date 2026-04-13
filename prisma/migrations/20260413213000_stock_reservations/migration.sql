-- CreateEnum
CREATE TYPE "public"."StockReservationStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "public"."StockReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "variantId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "status" "public"."StockReservationStatus" NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockReservation_variantId_status_idx" ON "public"."StockReservation"("variantId", "status");

-- CreateIndex
CREATE INDEX "StockReservation_orderId_status_idx" ON "public"."StockReservation"("orderId", "status");

-- AddForeignKey
ALTER TABLE "public"."StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."WhatsappOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockReservation" ADD CONSTRAINT "StockReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."WhatsappOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockReservation" ADD CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
