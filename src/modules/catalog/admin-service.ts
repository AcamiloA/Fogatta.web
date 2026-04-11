import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { ProductDetailDTO, productDetailSchema } from "@/modules/catalog/contracts";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Categoría no encontrada.");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryInUseError extends Error {
  readonly productsCount: number;

  constructor(productsCount: number) {
    super(
      productsCount === 1
        ? "No se puede eliminar la categoría porque tiene 1 producto asociado."
        : `No se puede eliminar la categoría porque tiene ${productsCount} productos asociados.`,
    );
    this.name = "CategoryInUseError";
    this.productsCount = productsCount;
  }
}

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
    precio: number;
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

  async deleteCategory(id: string) {
    const db = ensurePrisma();
    const category = await db.category.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            productos: true,
          },
        },
      },
    });

    if (!category) {
      throw new CategoryNotFoundError();
    }

    const productsCount = category._count.productos;
    if (productsCount > 0) {
      throw new CategoryInUseError(productsCount);
    }

    return db.category.delete({
      where: { id },
    });
  }

  async createProduct(input: {
    slug: string;
    nombre: string;
    descripcion: string;
    imagenes: string[];
    activo: boolean;
    categoryId: string;
  }) {
    const db = ensurePrisma();
    return db.product.create({
      data: {
        slug: input.slug.trim(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim(),
        precioReferencia: 0,
        imagenes: input.imagenes.map((image) => image.trim()).filter(Boolean),
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
      imagenes?: string[];
      activo?: boolean;
      categoryId?: string;
    },
  ) {
    const db = ensurePrisma();

    const data: {
      slug?: string;
      nombre?: string;
      descripcion?: string;
      imagenes?: string[];
      activo?: boolean;
      categoryId?: string;
    } = {};

    if (input.slug !== undefined) data.slug = input.slug.trim();
    if (input.nombre !== undefined) data.nombre = input.nombre.trim();
    if (input.descripcion !== undefined) data.descripcion = input.descripcion.trim();
    if (input.imagenes !== undefined) {
      data.imagenes = input.imagenes.map((image) => image.trim()).filter(Boolean);
    }
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;

    return db.product.update({
      where: { id },
      data,
    });
  }

  private async syncProductReferencePrice(productId: string) {
    const db = ensurePrisma();
    const variants = await db.variant.findMany({
      where: { productId },
      select: { precio: true },
      orderBy: { precio: "asc" },
      take: 1,
    });

    const minPrice = variants[0]?.precio ?? 0;
    await db.product.update({
      where: { id: productId },
      data: { precioReferencia: minPrice },
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
    precio: number;
  }) {
    const db = ensurePrisma();
    const created = await db.variant.create({
      data: {
        productId: input.productId,
        nombreVariante: input.nombreVariante.trim(),
        sku: input.sku.trim(),
        stockVirtual: input.stockVirtual,
        precio: input.precio,
      },
    });
    await this.syncProductReferencePrice(input.productId);
    return created;
  }

  async updateVariant(
    id: string,
    input: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      precio?: number;
    },
  ) {
    const db = ensurePrisma();

    const data: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      precio?: number;
    } = {};

    if (input.nombreVariante !== undefined) data.nombreVariante = input.nombreVariante.trim();
    if (input.sku !== undefined) data.sku = input.sku.trim();
    if (input.stockVirtual !== undefined) data.stockVirtual = input.stockVirtual;
    if (input.precio !== undefined) data.precio = input.precio;

    const updated = await db.variant.update({
      where: { id },
      data,
    });
    await this.syncProductReferencePrice(updated.productId);
    return updated;
  }

  async deleteVariant(id: string) {
    const db = ensurePrisma();
    const deleted = await db.variant.delete({
      where: { id },
    });
    await this.syncProductReferencePrice(deleted.productId);
    return deleted;
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_catalog_operation_failed", { error, ...context });
  }
}
