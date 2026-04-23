-- CreateEnum
CREATE TYPE "public"."ThemeAnimationType" AS ENUM ('none', 'snow', 'sparkles', 'float_icons');

-- AlterTable
ALTER TABLE "public"."SiteTheme"
ADD COLUMN "iconImageUrl" TEXT,
ADD COLUMN "animationType" "public"."ThemeAnimationType" NOT NULL DEFAULT 'none',
ADD COLUMN "animationIntensity" INTEGER NOT NULL DEFAULT 1;

