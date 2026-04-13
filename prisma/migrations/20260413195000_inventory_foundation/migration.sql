-- CreateTable
CREATE TABLE "public"."InventorySupply" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "precioTotal" INTEGER NOT NULL,
    "cantidadTotal" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryBaseProduct" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precioBrutoReferencia" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBaseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryRecipeItem" (
    "id" TEXT NOT NULL,
    "baseProductId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "cantidadUsada" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryLot" (
    "id" TEXT NOT NULL,
    "baseProductId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "fechaFabricacion" TIMESTAMP(3) NOT NULL,
    "fechaDisponible" TIMESTAMP(3) NOT NULL,
    "cantidadFabricada" INTEGER NOT NULL,
    "stockActual" INTEGER NOT NULL,
    "precioBrutoUnitario" INTEGER NOT NULL,
    "porcentajeUtilidad" INTEGER NOT NULL,
    "precioVentaUnitario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryShelfAssignment" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "nombreEstanteria" TEXT NOT NULL,
    "cantidadAsignada" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryShelfAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryRecipeItem_baseProductId_supplyId_key" ON "public"."InventoryRecipeItem"("baseProductId", "supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_serial_key" ON "public"."InventoryLot"("serial");

-- AddForeignKey
ALTER TABLE "public"."InventoryRecipeItem" ADD CONSTRAINT "InventoryRecipeItem_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "public"."InventoryBaseProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRecipeItem" ADD CONSTRAINT "InventoryRecipeItem_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "public"."InventorySupply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryLot" ADD CONSTRAINT "InventoryLot_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "public"."InventoryBaseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryShelfAssignment" ADD CONSTRAINT "InventoryShelfAssignment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."InventoryLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
