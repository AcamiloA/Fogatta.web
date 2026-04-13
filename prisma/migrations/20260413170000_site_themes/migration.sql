-- CreateEnum
CREATE TYPE "public"."ThemePalette" AS ENUM ('warm', 'night', 'navidad', 'octubre');

-- CreateTable
CREATE TABLE "public"."SiteTheme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "palette" "public"."ThemePalette" NOT NULL DEFAULT 'warm',
    "backgroundImageUrl" TEXT,
    "heroImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteTheme_slug_key" ON "public"."SiteTheme"("slug");

-- One active theme max
CREATE UNIQUE INDEX "SiteTheme_single_active_key" ON "public"."SiteTheme"("isActive") WHERE "isActive" = true;

-- Seed base themes if missing
INSERT INTO "public"."SiteTheme" ("id", "slug", "nombre", "palette", "isActive", "createdAt", "updatedAt")
VALUES
  ('theme_warm_default', 'warm', 'Clasico calido', 'warm', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_night_default', 'night', 'Noche elegante', 'night', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_navidad_default', 'navidad', 'Navidad', 'navidad', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_octubre_default', 'octubre', 'Octubre', 'octubre', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
