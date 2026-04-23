import { cache } from "react";
import { ThemePalette } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { siteConfig } from "@/config/site";
import { ThemePreset } from "@/config/theme";

type SeasonalThemePreset = "navidad" | "octubre";

export type ActiveThemeSettings = {
  slug: string;
  nombre: string;
  basePreset: "warm" | "night";
  seasonalPreset: SeasonalThemePreset | null;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  heroImageUrl: string | null;
  heroOpacity: number;
  iconImageUrl: string | null;
  animationType: "none" | "snow" | "sparkles" | "float_icons";
  animationIntensity: 1 | 2 | 3;
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
  return {
    slug: preset,
    nombre: preset === "night" ? "Noche elegante" : "Clasico calido",
    basePreset: preset === "night" ? "night" : "warm",
    seasonalPreset: null,
    backgroundImageUrl: null,
    backgroundOpacity: 100,
    heroImageUrl: null,
    heroOpacity: 100,
    iconImageUrl: null,
    animationType: "none",
    animationIntensity: 1,
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
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      }));

    if (!activeTheme) {
      return fromPreset(siteConfig.themePreset);
    }

    const defaultBasePreset = getDefaultBasePreset();
    const seasonalPreset: SeasonalThemePreset | null =
      activeTheme.palette === ThemePalette.navidad
        ? "navidad"
        : activeTheme.palette === ThemePalette.octubre
          ? "octubre"
          : null;

    return {
      slug: activeTheme.slug,
      nombre: activeTheme.nombre,
      basePreset: defaultBasePreset,
      seasonalPreset,
      backgroundImageUrl: activeTheme.backgroundImageUrl,
      backgroundOpacity: Math.min(100, Math.max(0, activeTheme.backgroundOpacity)),
      heroImageUrl: activeTheme.heroImageUrl,
      heroOpacity: Math.min(100, Math.max(0, activeTheme.heroOpacity)),
      iconImageUrl: activeTheme.iconImageUrl,
      animationType: activeTheme.animationType,
      animationIntensity: Math.min(3, Math.max(1, activeTheme.animationIntensity)) as 1 | 2 | 3,
    };
  } catch (error) {
    if (!isMissingThemeTableError(error)) {
      logError("theme_active_fetch_failed", { error });
    }
    return fromPreset(siteConfig.themePreset);
  }
});
