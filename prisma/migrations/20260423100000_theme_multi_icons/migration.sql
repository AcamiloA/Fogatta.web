ALTER TABLE "public"."SiteTheme"
ADD COLUMN "iconImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "public"."SiteTheme"
SET "iconImageUrls" = ARRAY["iconImageUrl"]
WHERE "iconImageUrl" IS NOT NULL AND btrim("iconImageUrl") <> '';
