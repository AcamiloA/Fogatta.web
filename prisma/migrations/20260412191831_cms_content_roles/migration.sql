-- CreateEnum
CREATE TYPE "public"."LegalType" AS ENUM ('privacidad', 'terminos');

-- CreateTable
CREATE TABLE "public"."FaqItem" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalDocument" (
    "id" TEXT NOT NULL,
    "tipo" "public"."LegalType" NOT NULL,
    "contenido" TEXT NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteContent" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "nosotrosTitulo" TEXT NOT NULL,
    "nosotrosHistoria" TEXT NOT NULL,
    "nosotrosPromesa" TEXT NOT NULL,
    "heroTitulo" TEXT,
    "heroDescripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_tipo_key" ON "public"."LegalDocument"("tipo");
