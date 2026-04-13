import { cache } from "react";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { siteConfig } from "@/config/site";
import { ThemePreset, resolveThemePreset } from "@/config/theme";

type SeasonalThemePreset = "navidad" | "octubre";

export type ActiveThemeSettings = {
  slug: string;
  nombre: string;
  basePreset: "warm" | "night";
  seasonalPreset: SeasonalThemePreset | null;
  backgroundImageUrl: string | null;
  heroImageUrl: string | null;
};

function isMissingThemeTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2021";
}

function getDefaultBasePreset(): "warm" | "night" {
  return siteConfig.themePreset === "night" ? "night" : "warm";
}

function fromPreset(preset: ThemePreset): ActiveThemeSettings {
  const defaultBasePreset = getDefaultBasePreset();
  return {
    slug: preset,
    nombre:
      preset === "night"
        ? "Noche elegante"
        : preset === "navidad"
          ? "Navidad"
        : preset === "octubre"
            ? "Octubre"
            : "Clasico calido",
    basePreset: preset === "night" ? "night" : defaultBasePreset,
    seasonalPreset: preset === "navidad" || preset === "octubre" ? preset : null,
    backgroundImageUrl: null,
    heroImageUrl: null,
  };
}

export const getActiveThemeSettings = cache(async (): Promise<ActiveThemeSettings> => {
  if (!prisma) {
    return fromPreset(siteConfig.themePreset);
  }

  try {
    const activeTheme =
      (await prisma.siteTheme.findFirst({
        where: { isActive: true },
      })) ??
      (await prisma.siteTheme.findFirst({
        orderBy: [{ createdAt: "asc" }],
      }));

    if (!activeTheme) {
      return fromPreset(siteConfig.themePreset);
    }

    const preset = resolveThemePreset(activeTheme.palette, siteConfig.themePreset);
    const defaultBasePreset = getDefaultBasePreset();

    return {
      slug: activeTheme.slug,
      nombre: activeTheme.nombre,
      basePreset: preset === "night" ? "night" : defaultBasePreset,
      seasonalPreset: preset === "navidad" || preset === "octubre" ? preset : null,
      backgroundImageUrl: activeTheme.backgroundImageUrl,
      heroImageUrl: activeTheme.heroImageUrl,
    };
  } catch (error) {
    if (!isMissingThemeTableError(error)) {
      logError("theme_active_fetch_failed", { error });
    }
    return fromPreset(siteConfig.themePreset);
  }
});
