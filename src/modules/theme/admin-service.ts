import { Prisma, ThemePalette } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";

const baseThemes: Array<{ slug: string; nombre: string; palette: ThemePalette }> = [
  { slug: "warm", nombre: "Clasico calido", palette: ThemePalette.warm },
  { slug: "night", nombre: "Noche elegante", palette: ThemePalette.night },
  { slug: "navidad", nombre: "Navidad", palette: ThemePalette.navidad },
  { slug: "octubre", nombre: "Octubre", palette: ThemePalette.octubre },
];

type SiteThemeEntity = {
  id: string;
  slug: string;
  nombre: string;
  palette: ThemePalette;
  backgroundImageUrl: string | null;
  heroImageUrl: string | null;
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
    isActive: theme.isActive,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
}

export class AdminThemeService {
  private async ensureBaseThemes() {
    const db = ensurePrisma();

    for (const theme of baseThemes) {
      await db.siteTheme.upsert({
        where: { slug: theme.slug },
        update: {},
        create: {
          slug: theme.slug,
          nombre: theme.nombre,
          palette: theme.palette,
          isActive: theme.slug === "warm",
        },
      });
    }

    const activeTheme = await db.siteTheme.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!activeTheme) {
      const warm = await db.siteTheme.findUnique({ where: { slug: "warm" }, select: { id: true } });
      if (warm) {
        await db.siteTheme.update({
          where: { id: warm.id },
          data: { isActive: true },
        });
      }
    }
  }

  async listThemes() {
    const db = ensurePrisma();
    await this.ensureBaseThemes();

    const themes = await db.siteTheme.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    return {
      activeThemeId: themes.find((theme) => theme.isActive)?.id ?? null,
      themes: themes.map(toDTO),
    };
  }

  async createTheme(input: { slug: string; nombre: string; palette: ThemePalette }) {
    const db = ensurePrisma();
    await this.ensureBaseThemes();

    return db.siteTheme.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        palette: input.palette,
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
    },
  ) {
    const db = ensurePrisma();
    const found = await db.siteTheme.findUnique({ where: { id }, select: { id: true } });
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
      },
    });
  }

  async activateTheme(id: string) {
    const db = ensurePrisma();
    const found = await db.siteTheme.findUnique({ where: { id }, select: { id: true } });
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
      select: { id: true, isActive: true },
    });
    if (!found) {
      throw new ThemeNotFoundError();
    }

    const totalThemes = await db.siteTheme.count();
    if (totalThemes <= 1) {
      throw new ThemeDeleteNotAllowedError();
    }

    await db.$transaction(async (tx) => {
      await tx.siteTheme.delete({ where: { id } });

      if (found.isActive) {
        const replacement = await tx.siteTheme.findFirst({
          orderBy: [{ slug: "asc" }],
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
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }
}
