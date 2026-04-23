import { Prisma, ThemeAnimationType, ThemePalette } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

type SiteThemeEntity = {
  id: string;
  slug: string;
  nombre: string;
  palette: ThemePalette;
  backgroundImageUrl: string | null;
  heroImageUrl: string | null;
  iconImageUrl: string | null;
  animationType: ThemeAnimationType;
  animationIntensity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

function toDTO(theme: SiteThemeEntity) {
  return {
    id: theme.id,
    slug: theme.slug,
    nombre: theme.nombre,
    palette: theme.palette,
    backgroundImageUrl: theme.backgroundImageUrl,
    heroImageUrl: theme.heroImageUrl,
    iconImageUrl: theme.iconImageUrl,
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
  }) {
    const db = ensurePrisma();

    return db.siteTheme.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        palette: input.palette,
        animationType: input.animationType ?? getDefaultAnimationForPalette(input.palette),
        animationIntensity: Math.min(3, Math.max(1, input.animationIntensity ?? 1)),
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
      heroImageUrl?: string | null;
      iconImageUrl?: string | null;
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

    return db.siteTheme.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim(),
        palette: input.palette,
        backgroundImageUrl: input.backgroundImageUrl,
        heroImageUrl: input.heroImageUrl,
        iconImageUrl: input.iconImageUrl,
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

