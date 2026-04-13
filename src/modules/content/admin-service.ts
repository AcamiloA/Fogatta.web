import { LegalType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { fallbackContent } from "@/modules/content/seed-data";

export class FaqItemNotFoundError extends Error {
  constructor() {
    super("FAQ no encontrado.");
    this.name = "FaqItemNotFoundError";
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

function parseVigenciaDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export class AdminContentService {
  async getContentAdminPayload() {
    const db = ensurePrisma();

    const [site, faq, legales] = await Promise.all([
      db.siteContent.findUnique({ where: { id: "main" } }),
      db.faqItem.findMany({ where: { activo: true }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] }),
      db.legalDocument.findMany({ orderBy: { updatedAt: "desc" } }),
    ]);

    return {
      site: {
        heroTitulo: site?.heroTitulo ?? fallbackContent.hero.titulo,
        heroDescripcion: site?.heroDescripcion ?? fallbackContent.hero.descripcion,
        nosotrosTitulo: site?.nosotrosTitulo ?? fallbackContent.nosotros.titulo,
        nosotrosHistoria: site?.nosotrosHistoria ?? fallbackContent.nosotros.historia,
        nosotrosPromesa: site?.nosotrosPromesa ?? fallbackContent.nosotros.promesa,
      },
      faq: faq.map((item) => ({
        id: item.id,
        pregunta: item.pregunta,
        respuesta: item.respuesta,
        orden: item.orden,
      })),
      legales: ["privacidad", "terminos"].map((tipo) => {
        const found = legales.find((doc) => doc.tipo === tipo);
        return {
          tipo,
          contenido:
            found?.contenido ??
            fallbackContent.legales.find((item) => item.tipo === tipo)?.contenido ??
            "",
          fechaVigencia:
            found?.fechaVigencia.toISOString().slice(0, 10) ??
            fallbackContent.legales.find((item) => item.tipo === tipo)?.fechaVigencia ??
            new Date().toISOString().slice(0, 10),
        };
      }),
    };
  }

  async updateSiteContent(input: {
    heroTitulo: string;
    heroDescripcion: string;
    nosotrosTitulo: string;
    nosotrosHistoria: string;
    nosotrosPromesa: string;
  }) {
    const db = ensurePrisma();
    return db.siteContent.upsert({
      where: { id: "main" },
      update: {
        heroTitulo: input.heroTitulo.trim(),
        heroDescripcion: input.heroDescripcion.trim(),
        nosotrosTitulo: input.nosotrosTitulo.trim(),
        nosotrosHistoria: input.nosotrosHistoria.trim(),
        nosotrosPromesa: input.nosotrosPromesa.trim(),
      },
      create: {
        id: "main",
        heroTitulo: input.heroTitulo.trim(),
        heroDescripcion: input.heroDescripcion.trim(),
        nosotrosTitulo: input.nosotrosTitulo.trim(),
        nosotrosHistoria: input.nosotrosHistoria.trim(),
        nosotrosPromesa: input.nosotrosPromesa.trim(),
      },
    });
  }

  async createFaq(input: { pregunta: string; respuesta: string; orden: number }) {
    const db = ensurePrisma();
    return db.faqItem.create({
      data: {
        pregunta: input.pregunta.trim(),
        respuesta: input.respuesta.trim(),
        orden: input.orden,
        activo: true,
      },
    });
  }

  async updateFaq(id: string, input: { pregunta?: string; respuesta?: string; orden?: number }) {
    const db = ensurePrisma();
    const found = await db.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new FaqItemNotFoundError();
    }

    return db.faqItem.update({
      where: { id },
      data: {
        pregunta: input.pregunta?.trim(),
        respuesta: input.respuesta?.trim(),
        orden: input.orden,
      },
    });
  }

  async deleteFaq(id: string) {
    const db = ensurePrisma();
    const found = await db.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new FaqItemNotFoundError();
    }
    return db.faqItem.delete({ where: { id } });
  }

  async updateLegal(input: { tipo: "privacidad" | "terminos"; contenido: string; fechaVigencia: string }) {
    const db = ensurePrisma();
    const legalType = input.tipo === "privacidad" ? LegalType.privacidad : LegalType.terminos;
    const parsedDate = parseVigenciaDate(input.fechaVigencia);
    if (!parsedDate) {
      throw new Error("Fecha de vigencia invalida.");
    }

    return db.legalDocument.upsert({
      where: { tipo: legalType },
      update: {
        contenido: input.contenido.trim(),
        fechaVigencia: parsedDate,
      },
      create: {
        tipo: legalType,
        contenido: input.contenido.trim(),
        fechaVigencia: parsedDate,
      },
    });
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_content_operation_failed", { error, ...context });
  }
}
