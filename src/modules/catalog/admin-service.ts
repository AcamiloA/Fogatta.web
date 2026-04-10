import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { ProductDetailDTO, productDetailSchema } from "@/modules/catalog/contracts";

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

function toDetailDTO(product: {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  precioReferencia: number;
  imagenes: string[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
  category: {
    id: string;
    slug: string;
    nombre: string;
    descripcion: string | null;
  };
  variantes: {
    id: string;
    productId: string;
    nombreVariante: string;
    sku: string;
    stockVirtual: number;
    precioDelta: number;
  }[];
}): ProductDetailDTO {
  return productDetailSchema.parse({
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precioReferencia: product.precioReferencia,
    imagenes: product.imagenes,
    activo: product.activo,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    categoryId: product.categoryId,
    categoria: product.category,
    variantes: product.variantes,
  });
}

export class AdminCatalogService {
  async listCatalog() {
    const db = ensurePrisma();

    const [categories, products] = await Promise.all([
      db.category.findMany({
        orderBy: {
          nombre: "asc",
        },
      }),
      db.product.findMany({
        include: {
          category: true,
          variantes: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return {
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        nombre: category.nombre,
        descripcion: category.descripcion,
      })),
      products: products.map(toDetailDTO),
    };
  }

  async createCategory(input: { slug: string; nombre: string; descripcion?: string }) {
    const db = ensurePrisma();
    return db.category.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
      },
    });
  }

  async createProduct(input: {
    slug: string;
    nombre: string;
    descripcion: string;
    precioReferencia: number;
    imagenUrl: string;
    activo: boolean;
    categoryId: string;
  }) {
    const db = ensurePrisma();
    return db.product.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim(),
        precioReferencia: input.precioReferencia,
        imagenes: [input.imagenUrl.trim()],
        activo: input.activo,
        categoryId: input.categoryId,
      },
    });
  }

  async updateProduct(
    id: string,
    input: {
      slug?: string;
      nombre?: string;
      descripcion?: string;
      precioReferencia?: number;
      imagenUrl?: string;
      activo?: boolean;
      categoryId?: string;
    },
  ) {
    const db = ensurePrisma();

    const data: {
      slug?: string;
      nombre?: string;
      descripcion?: string;
      precioReferencia?: number;
      imagenes?: string[];
      activo?: boolean;
      categoryId?: string;
    } = {};

    if (input.slug !== undefined) data.slug = input.slug.trim();
    if (input.nombre !== undefined) data.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) data.descripcion = input.descripcion.trim();
    if (input.precioReferencia !== undefined) data.precioReferencia = input.precioReferencia;
    if (input.imagenUrl !== undefined) data.imagenes = [input.imagenUrl.trim()];
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;

    return db.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: string) {
    const db = ensurePrisma();
    return db.product.delete({
      where: { id },
    });
  }

  async createVariant(input: {
    productId: string;
    nombreVariante: string;
    sku: string;
    stockVirtual: number;
    precioDelta: number;
  }) {
    const db = ensurePrisma();
    return db.variant.create({
      data: {
        productId: input.productId,
        nombreVariante: input.nombreVariante.trim(),
        sku: input.sku.trim(),
        stockVirtual: input.stockVirtual,
        precioDelta: input.precioDelta,
      },
    });
  }

  async updateVariant(
    id: string,
    input: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      precioDelta?: number;
    },
  ) {
    const db = ensurePrisma();

    const data: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      precioDelta?: number;
    } = {};

    if (input.nombreVariante !== undefined) data.nombreVariante = input.nombreVariante.trim();
    if (input.sku !== undefined) data.sku = input.sku.trim();
    if (input.stockVirtual !== undefined) data.stockVirtual = input.stockVirtual;
    if (input.precioDelta !== undefined) data.precioDelta = input.precioDelta;

    return db.variant.update({
      where: { id },
      data,
    });
  }

  async deleteVariant(id: string) {
    const db = ensurePrisma();
    return db.variant.delete({
      where: { id },
    });
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_catalog_operation_failed", { error, ...context });
  }
}
