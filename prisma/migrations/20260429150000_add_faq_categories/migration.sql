CREATE TABLE "public"."FaqCategory" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 1,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."FaqItem"
ADD COLUMN "faqCategoryId" TEXT;

ALTER TABLE "public"."FaqItem"
ADD CONSTRAINT "FaqItem_faqCategoryId_fkey"
FOREIGN KEY ("faqCategoryId") REFERENCES "public"."FaqCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FaqItem_faqCategoryId_idx" ON "public"."FaqItem"("faqCategoryId");
