ALTER TABLE "public"."SiteTheme"
ADD COLUMN "backgroundOpacity" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "heroOpacity" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "public"."SiteTheme"
ADD CONSTRAINT "SiteTheme_backgroundOpacity_range_check"
CHECK ("backgroundOpacity" >= 0 AND "backgroundOpacity" <= 100);

ALTER TABLE "public"."SiteTheme"
ADD CONSTRAINT "SiteTheme_heroOpacity_range_check"
CHECK ("heroOpacity" >= 0 AND "heroOpacity" <= 100);
