import { Prisma, ThemeAnimationType, ThemePalette } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

const seasonalBaseThemes: Array<{
  slug: string;
  nombre: string;
  palette: ThemePalette;
  animationType: ThemeAnimationType;
}> = [
  { slug: "navidad", nombre: "Navidad", palette: ThemePalette.navidad, animationType: ThemeAnimationType.snow },
  { slug: "octubre", nombre: "Octubre", palette: ThemePalette.octubre, animationType: ThemeAnimationType.float_icons },
];
const seasonalBaseThemeSlugs = new Set(seasonalBaseThemes.map((theme) => theme.slug));

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

export class ThemeDeleteNotAllowedError extends Error {
  constructor() {
    super("No se puede eliminar el ultimo tema disponible.");
    this.name = "ThemeDeleteNotAllowedError";
  }
}

export class ThemeBaseDeleteNotAllowedError extends Error {
  constructor() {
    super("No se puede eliminar un tema base del sistema.");
    this.name = "ThemeBaseDeleteNotAllowedError";
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
  private async ensureSeasonalBaseThemes() {
    const db = ensurePrisma();

    for (const theme of seasonalBaseThemes) {
      await db.siteTheme.upsert({
        where: { slug: theme.slug },
        update: {
          nombre: theme.nombre,
          palette: theme.palette,
          animationType: theme.animationType,
          animationIntensity: 1,
        },
        create: {
          slug: theme.slug,
          nombre: theme.nombre,
          palette: theme.palette,
          animationType: theme.animationType,
          animationIntensity: 1,
          isActive: false,
        },
      });
    }

    // Warm/Night are user display modes, not seasonal themes.
    await db.siteTheme.updateMany({
      where: {
        palette: { in: [ThemePalette.warm, ThemePalette.night] },
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  async listThemes() {
    const db = ensurePrisma();
    await this.ensureSeasonalBaseThemes();

    const themes = await db.siteTheme.findMany({
      where: {
        palette: { in: [ThemePalette.navidad, ThemePalette.octubre] },
      },
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
    await this.ensureSeasonalBaseThemes();

    const safePalette =
      input.palette === ThemePalette.navidad || input.palette === ThemePalette.octubre
        ? input.palette
        : ThemePalette.navidad;

    return db.siteTheme.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        palette: safePalette,
        animationType:
          input.animationType ??
          (safePalette === ThemePalette.octubre ? ThemeAnimationType.float_icons : ThemeAnimationType.snow),
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

    const nextPalette =
      input.palette === ThemePalette.navidad || input.palette === ThemePalette.octubre
        ? input.palette
        : found.palette;

    return db.siteTheme.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim(),
        palette: nextPalette,
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
      select: { id: true, palette: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }
    if (found.palette !== ThemePalette.navidad && found.palette !== ThemePalette.octubre) {
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
      select: { id: true, isActive: true, slug: true, palette: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }

    if (found.palette !== ThemePalette.navidad && found.palette !== ThemePalette.octubre) {
      throw new ThemeBaseDeleteNotAllowedError();
    }

    if (seasonalBaseThemeSlugs.has(found.slug)) {
      throw new ThemeBaseDeleteNotAllowedError();
    }

    const totalCustomThemes = await db.siteTheme.count({
      where: {
        palette: { in: [ThemePalette.navidad, ThemePalette.octubre] },
        slug: { notIn: Array.from(seasonalBaseThemeSlugs) },
      },
    });
    if (totalCustomThemes <= 1) {
      throw new ThemeDeleteNotAllowedError();
    }

    await db.$transaction(async (tx) => {
      await tx.siteTheme.delete({ where: { id } });

      if (found.isActive) {
        await tx.siteTheme.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });

        const replacement = await tx.siteTheme.findFirst({
          where: {
            palette: { in: [ThemePalette.navidad, ThemePalette.octubre] },
          },
          orderBy: [{ createdAt: "asc" }],
          select: { id: true },
        });
        if (replacement) {
          await tx.siteTheme.update({
            where: { id: replacement.id },
            data: { isActive: true },
          });
        }
      }
    });
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
