import { Prisma, ThemeAnimationType, ThemePalette } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

type SiteThemeEntity = {
  id: string;
  slug: string;
  nombre: string;
  palette: ThemePalette;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  heroImageUrl: string | null;
  heroOpacity: number;
  iconImageUrl: string | null;
  iconImageUrls: string[];
  animationType: ThemeAnimationType;
  animationIntensity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const MAX_THEME_ICONS = 4;

export class ThemeNotFoundError extends Error {
  constructor() {
    super("Tema no encontrado.");
    this.name = "ThemeNotFoundError";
  }
}

function isSlugUniqueConstraint(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = (error.meta?.target as string[] | string | undefined) ?? [];
  if (Array.isArray(target)) {
    return target.includes("slug") || target.includes("SiteTheme_slug_key");
  }
  return String(target).includes("slug") || String(target).includes("SiteTheme_slug_key");
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

function getDefaultAnimationForPalette(palette: ThemePalette): ThemeAnimationType {
  if (palette === ThemePalette.navidad) {
    return ThemeAnimationType.snow;
  }
  if (palette === ThemePalette.octubre) {
    return ThemeAnimationType.float_icons;
  }
  return ThemeAnimationType.none;
}

function normalizeIconUrls(iconImageUrls?: string[] | null, iconImageUrl?: string | null) {
  const cleanUrls = (iconImageUrls ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, MAX_THEME_ICONS);

  if (cleanUrls.length > 0) {
    return cleanUrls;
  }

  if (iconImageUrl && iconImageUrl.trim().length > 0) {
    return [iconImageUrl.trim()];
  }

  return [];
}

function toDTO(theme: SiteThemeEntity) {
  const iconImageUrls = normalizeIconUrls(theme.iconImageUrls, theme.iconImageUrl);
  return {
    id: theme.id,
    slug: theme.slug,
    nombre: theme.nombre,
    palette: theme.palette,
    backgroundImageUrl: theme.backgroundImageUrl,
    backgroundOpacity: Math.min(100, Math.max(0, theme.backgroundOpacity)),
    heroImageUrl: theme.heroImageUrl,
    heroOpacity: Math.min(100, Math.max(0, theme.heroOpacity)),
    iconImageUrl: iconImageUrls[0] ?? null,
    iconImageUrls,
    animationType: theme.animationType,
    animationIntensity: Math.min(3, Math.max(1, theme.animationIntensity)),
    isActive: theme.isActive,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
}

export class AdminThemeService {
  async listThemes() {
    const db = ensurePrisma();

    const themes = await db.siteTheme.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    return {
      activeThemeId: themes.find((theme) => theme.isActive)?.id ?? null,
      themes: themes.map(toDTO),
    };
  }

  async createTheme(input: {
    slug: string;
    nombre: string;
    palette: ThemePalette;
    animationType?: ThemeAnimationType;
    animationIntensity?: number;
    backgroundOpacity?: number;
    heroOpacity?: number;
    iconImageUrls?: string[];
  }) {
    const db = ensurePrisma();
    const iconImageUrls = normalizeIconUrls(input.iconImageUrls);

    return db.siteTheme.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        palette: input.palette,
        animationType: input.animationType ?? getDefaultAnimationForPalette(input.palette),
        animationIntensity: Math.min(3, Math.max(1, input.animationIntensity ?? 1)),
        backgroundOpacity: Math.min(100, Math.max(0, input.backgroundOpacity ?? 100)),
        heroOpacity: Math.min(100, Math.max(0, input.heroOpacity ?? 100)),
        iconImageUrl: iconImageUrls[0] ?? null,
        iconImageUrls,
        isActive: false,
      },
    });
  }

  async updateTheme(
    id: string,
    input: {
      nombre?: string;
      palette?: ThemePalette;
      backgroundImageUrl?: string | null;
      backgroundOpacity?: number;
      heroImageUrl?: string | null;
      heroOpacity?: number;
      iconImageUrl?: string | null;
      iconImageUrls?: string[];
      animationType?: ThemeAnimationType;
      animationIntensity?: number;
    },
  ) {
    const db = ensurePrisma();
    const found = await db.siteTheme.findUnique({
      where: { id },
      select: { id: true, palette: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }

    const normalizedIconUrls =
      input.iconImageUrls !== undefined
        ? normalizeIconUrls(input.iconImageUrls)
        : input.iconImageUrl !== undefined
          ? normalizeIconUrls(undefined, input.iconImageUrl)
          : undefined;

    return db.siteTheme.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim(),
        palette: input.palette,
        backgroundImageUrl: input.backgroundImageUrl,
        backgroundOpacity:
          input.backgroundOpacity !== undefined
            ? Math.min(100, Math.max(0, input.backgroundOpacity))
            : undefined,
        heroImageUrl: input.heroImageUrl,
        heroOpacity:
          input.heroOpacity !== undefined ? Math.min(100, Math.max(0, input.heroOpacity)) : undefined,
        iconImageUrl: normalizedIconUrls ? normalizedIconUrls[0] ?? null : undefined,
        iconImageUrls: normalizedIconUrls,
        animationType: input.animationType,
        animationIntensity:
          input.animationIntensity !== undefined
            ? Math.min(3, Math.max(1, input.animationIntensity))
            : undefined,
      },
    });
  }

  async activateTheme(id: string) {
    const db = ensurePrisma();
    const found = await db.siteTheme.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }

    await db.$transaction(async (tx) => {
      await tx.siteTheme.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      await tx.siteTheme.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async deleteTheme(id: string) {
    const db = ensurePrisma();
    const found = await db.siteTheme.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }

    await db.siteTheme.delete({ where: { id } });
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_theme_operation_failed", { error, ...context });
  }

  isUniqueViolation(error: unknown) {
    return isSlugUniqueConstraint(error);
  }
}
