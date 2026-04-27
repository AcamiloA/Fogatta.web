import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { ProductDetailDTO, productDetailSchema } from "@/modules/catalog/contracts";
import { sendLowStockVariantNotificationEmail } from "@/modules/catalog/stock-alert-email-notifier";
import { expirePendingReservations } from "@/modules/checkout-whatsapp/reservation-expiration";
import { deleteManagedAssetByUrl } from "@/modules/storage/managed-assets";

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

export class VariantNotFoundError extends Error {
  constructor() {
    super("Variante no encontrada.");
    this.name = "VariantNotFoundError";
  }
}

export class VariantHasPendingReservationsError extends Error {
  readonly pendingReservationsCount: number;

  constructor(pendingReservationsCount: number) {
    super(
      pendingReservationsCount === 1
        ? "No se puede eliminar la variante porque tiene 1 reserva pendiente."
        : `No se puede eliminar la variante porque tiene ${pendingReservationsCount} reservas pendientes.`,
    );
    this.name = "VariantHasPendingReservationsError";
    this.pendingReservationsCount = pendingReservationsCount;
  }
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }
  return prisma;
}

function normalizeImageUrls(urls: string[] | undefined) {
  if (!urls) {
    return [];
  }

  return urls.map((image) => image.trim()).filter(Boolean);
}

function getRemovedImages(previous: string[], next: string[]) {
  const nextSet = new Set(next);
  return previous.filter((url) => !nextSet.has(url));
}

function getEffectiveVariantPrice(variant: {
  precio: number;
  descuentoActivo: boolean;
  descuentoPorcentaje: number;
}) {
  if (!variant.descuentoActivo) {
    return variant.precio;
  }
  const safePercentage = Math.min(Math.max(variant.descuentoPorcentaje, 0), 100);
  return Math.max(Math.round((variant.precio * (100 - safePercentage)) / 100), 0);
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
    stockDisponible?: number;
    stockMinimoAlerta: number;
    precio: number;
    imagenes: string[];
    descuentoActivo: boolean;
    descuentoPorcentaje: number;
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
    await expirePendingReservations(db, { olderThanHours: 24 });

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

    const variantIds = products.flatMap((product) => product.variantes.map((variant) => variant.id));
    const pendingByVariant = new Map<string, number>();

    if (variantIds.length > 0) {
      const grouped = await db.stockReservation.groupBy({
        by: ["variantId"],
        where: {
          status: "pending",
          variantId: {
            in: variantIds,
          },
        },
        _sum: {
          cantidad: true,
        },
      });

      for (const row of grouped) {
        pendingByVariant.set(row.variantId, row._sum.cantidad ?? 0);
      }
    }

    return {
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        nombre: category.nombre,
        descripcion: category.descripcion,
      })),
      products: products.map((product) =>
        toDetailDTO({
          ...product,
          variantes: product.variantes.map((variant) => {
            const pendingReserved = pendingByVariant.get(variant.id) ?? 0;
            return {
              ...variant,
              stockDisponible: Math.max(variant.stockVirtual - pendingReserved, 0),
            };
          }),
        }),
      ),
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
    const previous =
      input.imagenes !== undefined
        ? await db.product.findUnique({
            where: { id },
            select: { imagenes: true },
          })
        : null;

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
      data.imagenes = normalizeImageUrls(input.imagenes);
    }
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;

    const updated = await db.product.update({
      where: { id },
      data,
    });

    if (input.imagenes !== undefined && previous) {
      const removed = getRemovedImages(normalizeImageUrls(previous.imagenes), normalizeImageUrls(data.imagenes));
      await this.cleanupUnusedImages(removed);
    }

    return updated;
  }

  private async syncProductReferencePrice(productId: string) {
    const db = ensurePrisma();
    const variants = await db.variant.findMany({
      where: { productId },
      select: {
        precio: true,
        descuentoActivo: true,
        descuentoPorcentaje: true,
      },
    });
    const minPrice =
      variants.length > 0 ? Math.min(...variants.map((variant) => getEffectiveVariantPrice(variant))) : 0;
    await db.product.update({
      where: { id: productId },
      data: { precioReferencia: minPrice },
    });
  }

  private isLowStock(stockVirtual: number, stockMinimoAlerta: number) {
    return stockMinimoAlerta > 0 && stockVirtual <= stockMinimoAlerta;
  }

  private async notifyLowStock(variantId: string) {
    const db = ensurePrisma();
    const variant = await db.variant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        productId: true,
        nombreVariante: true,
        sku: true,
        stockVirtual: true,
        stockMinimoAlerta: true,
        product: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!variant) {
      return;
    }

    if (!this.isLowStock(variant.stockVirtual, variant.stockMinimoAlerta)) {
      return;
    }

    try {
      await sendLowStockVariantNotificationEmail({
        productId: variant.productId,
        productNombre: variant.product.nombre,
        variantId: variant.id,
        nombreVariante: variant.nombreVariante,
        sku: variant.sku,
        stockVirtual: variant.stockVirtual,
        stockMinimoAlerta: variant.stockMinimoAlerta,
      });
    } catch (error) {
      logError("stock_low_notification_failed", {
        error,
        variantId,
      });
    }
  }

  async deleteProduct(id: string) {
    const db = ensurePrisma();
    const product = await db.product.findUnique({
      where: { id },
      select: {
        imagenes: true,
        variantes: {
          select: {
            imagenes: true,
          },
        },
      },
    });

    const deleted = await db.product.delete({
      where: { id },
    });

    if (product) {
      const removed = [
        ...normalizeImageUrls(product.imagenes),
        ...product.variantes.flatMap((variant) => normalizeImageUrls(variant.imagenes)),
      ];
      await this.cleanupUnusedImages(removed);
    }

    return deleted;
  }

  async createVariant(input: {
    productId: string;
    nombreVariante: string;
    sku: string;
    stockVirtual: number;
    stockMinimoAlerta: number;
    precio: number;
    imagenes: string[];
    descuentoActivo: boolean;
    descuentoPorcentaje: number;
  }) {
    const db = ensurePrisma();
    if (input.descuentoActivo && (input.descuentoPorcentaje < 1 || input.descuentoPorcentaje > 100)) {
      throw new Error("El porcentaje de descuento debe estar entre 1 y 100.");
    }
    const created = await db.variant.create({
      data: {
        productId: input.productId,
        nombreVariante: input.nombreVariante.trim(),
        sku: input.sku.trim(),
        stockVirtual: input.stockVirtual,
        stockMinimoAlerta: input.stockMinimoAlerta,
        precio: input.precio,
        imagenes: input.imagenes.map((image) => image.trim()).filter(Boolean).slice(0, 3),
        descuentoActivo: input.descuentoActivo,
        descuentoPorcentaje: input.descuentoActivo ? input.descuentoPorcentaje : 0,
      },
    });
    await this.syncProductReferencePrice(input.productId);
    if (this.isLowStock(created.stockVirtual, created.stockMinimoAlerta)) {
      await this.notifyLowStock(created.id);
    }
    return created;
  }

  async updateVariant(
    id: string,
    input: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      stockMinimoAlerta?: number;
      precio?: number;
      imagenes?: string[];
      descuentoActivo?: boolean;
      descuentoPorcentaje?: number;
    },
  ) {
    const db = ensurePrisma();

    const data: {
      nombreVariante?: string;
      sku?: string;
      stockVirtual?: number;
      stockMinimoAlerta?: number;
      precio?: number;
      imagenes?: string[];
      descuentoActivo?: boolean;
      descuentoPorcentaje?: number;
    } = {};

    if (input.nombreVariante !== undefined) data.nombreVariante = input.nombreVariante.trim();
    if (input.sku !== undefined) data.sku = input.sku.trim();
    if (input.stockVirtual !== undefined) data.stockVirtual = input.stockVirtual;
    if (input.stockMinimoAlerta !== undefined) data.stockMinimoAlerta = input.stockMinimoAlerta;
    if (input.precio !== undefined) data.precio = input.precio;
    if (input.imagenes !== undefined) {
      data.imagenes = input.imagenes.map((image) => image.trim()).filter(Boolean).slice(0, 3);
    }
    if (input.descuentoActivo !== undefined) data.descuentoActivo = input.descuentoActivo;
    if (input.descuentoPorcentaje !== undefined) data.descuentoPorcentaje = input.descuentoPorcentaje;

    const current = await db.variant.findUnique({
      where: { id },
      select: {
        productId: true,
        stockVirtual: true,
        stockMinimoAlerta: true,
        precio: true,
        descuentoActivo: true,
        descuentoPorcentaje: true,
        imagenes: true,
      },
    });

    if (!current) {
      throw new Error("Variante no encontrada.");
    }

    const nextDescuentoActivo = input.descuentoActivo ?? current.descuentoActivo;
    const nextDescuentoPorcentaje = input.descuentoPorcentaje ?? current.descuentoPorcentaje;
    const nextStockVirtual = input.stockVirtual ?? current.stockVirtual;
    const nextStockMinimoAlerta = input.stockMinimoAlerta ?? current.stockMinimoAlerta;

    if (
      nextDescuentoActivo &&
      (nextDescuentoPorcentaje < 1 || nextDescuentoPorcentaje > 100)
    ) {
      throw new Error("El porcentaje de descuento debe estar entre 1 y 100.");
    }

    if (nextDescuentoActivo === false) {
      data.descuentoPorcentaje = 0;
    }

    const stockLowBeforeUpdate = this.isLowStock(current.stockVirtual, current.stockMinimoAlerta);
    const stockLowAfterUpdate = this.isLowStock(nextStockVirtual, nextStockMinimoAlerta);

    const updated = await db.variant.update({
      where: { id },
      data,
    });
    await this.syncProductReferencePrice(updated.productId);
    if (input.imagenes !== undefined) {
      const removed = getRemovedImages(
        normalizeImageUrls(current.imagenes),
        normalizeImageUrls(data.imagenes),
      );
      await this.cleanupUnusedImages(removed);
    }
    if (stockLowAfterUpdate && !stockLowBeforeUpdate) {
      await this.notifyLowStock(updated.id);
    }
    return updated;
  }

  async deleteVariant(id: string) {
    const db = ensurePrisma();
    const deletion = await db.$transaction(async (tx) => {
      await expirePendingReservations(tx, { olderThanHours: 24 });

      const variant = await tx.variant.findUnique({
        where: { id },
        select: {
          id: true,
          productId: true,
        },
      });

      if (!variant) {
        throw new VariantNotFoundError();
      }

      const pendingReservationsCount = await tx.stockReservation.count({
        where: {
          variantId: id,
          status: "pending",
        },
      });

      if (pendingReservationsCount > 0) {
        throw new VariantHasPendingReservationsError(pendingReservationsCount);
      }

      await tx.stockReservation.deleteMany({
        where: {
          variantId: id,
        },
      });

      const deletedVariant = await tx.variant.delete({
        where: { id },
      });

      return {
        productId: deletedVariant.productId,
        deletedVariant,
      };
    });

    await this.syncProductReferencePrice(deletion.productId);
    await this.cleanupUnusedImages(normalizeImageUrls(deletion.deletedVariant.imagenes));
    return deletion.deletedVariant;
  }

  private async isImageReferencedElsewhere(url: string) {
    const db = ensurePrisma();
    const normalized = url.trim();
    if (!normalized) {
      return false;
    }

    const [productsCount, variantsCount, blogPostsCount, themesCount] = await Promise.all([
      db.product.count({
        where: {
          imagenes: {
            has: normalized,
          },
        },
      }),
      db.variant.count({
        where: {
          imagenes: {
            has: normalized,
          },
        },
      }),
      db.blogPost.count({
        where: {
          imagen: normalized,
        },
      }),
      db.siteTheme.count({
        where: {
          OR: [
            { backgroundImageUrl: normalized },
            { heroImageUrl: normalized },
            { iconImageUrl: normalized },
            {
              iconImageUrls: {
                has: normalized,
              },
            },
          ],
        },
      }),
    ]);

    return productsCount > 0 || variantsCount > 0 || blogPostsCount > 0 || themesCount > 0;
  }

  private async cleanupUnusedImages(candidateUrls: string[]) {
    const uniqueUrls = [...new Set(normalizeImageUrls(candidateUrls))];
    for (const imageUrl of uniqueUrls) {
      try {
        const isReferenced = await this.isImageReferencedElsewhere(imageUrl);
        if (isReferenced) {
          continue;
        }
        await deleteManagedAssetByUrl(imageUrl);
      } catch (error) {
        this.handleError(error, {
          operation: "cleanup_unused_image_failed",
          imageUrl,
        });
      }
    }
  }

  isConfigured() {
    return Boolean(prisma);
  }

  handleError(error: unknown, context: Record<string, unknown> = {}) {
    logError("admin_catalog_operation_failed", { error, ...context });
  }
}
