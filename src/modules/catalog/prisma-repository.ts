import { prisma } from "@/lib/db";
import {
  ProductDetailDTO,
  ProductSummaryDTO,
  productDetailSchema,
  productSummarySchema,
} from "@/modules/catalog/contracts";
import { CatalogRepository } from "@/modules/catalog/repository";
import { expirePendingReservations } from "@/modules/checkout-whatsapp/reservation-expiration";

function ensurePrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured");
  }

  return prisma;
}

function toSummaryDTO(product: {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  descripcion: string;
  historiaAroma: string | null;
  notasOlfativas: string | null;
  duracionAprox: string | null;
  tamanoPeso: string | null;
  idealPara: string | null;
  instruccionesUso: string | null;
  estadoComercial: "standard" | "new" | "limited" | "low_stock";
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  sortOrder: number;
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
    resumen: string | null;
    descripcion: string | null;
  };
  ratingPromedio?: number | null;
  ratingCantidad?: number;
}): ProductSummaryDTO {
  return productSummarySchema.parse({
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    resumen: product.resumen,
    descripcion: product.descripcion,
    historiaAroma: product.historiaAroma,
    notasOlfativas: product.notasOlfativas,
    duracionAprox: product.duracionAprox,
    tamanoPeso: product.tamanoPeso,
    idealPara: product.idealPara,
    instruccionesUso: product.instruccionesUso,
    estadoComercial: product.estadoComercial,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    precioReferencia: product.precioReferencia,
    imagenes: product.imagenes,
    activo: product.activo,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    categoryId: product.categoryId,
    categoria: product.category,
    ratingPromedio: product.ratingPromedio ?? null,
    ratingCantidad: product.ratingCantidad ?? 0,
  });
}

function toDetailDTO(product: {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  descripcion: string;
  historiaAroma: string | null;
  notasOlfativas: string | null;
  duracionAprox: string | null;
  tamanoPeso: string | null;
  idealPara: string | null;
  instruccionesUso: string | null;
  estadoComercial: "standard" | "new" | "limited" | "low_stock";
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  sortOrder: number;
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
    resumen: string | null;
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
  ratingPromedio?: number | null;
  ratingCantidad?: number;
}): ProductDetailDTO {
  return productDetailSchema.parse({
    ...toSummaryDTO(product),
    variantes: product.variantes,
  });
}

export class PrismaCatalogRepository implements CatalogRepository {
  async listProducts(): Promise<ProductSummaryDTO[]> {
    const db = ensurePrisma();
    await expirePendingReservations(db, { olderThanHours: 24 });

    const products = await db.product.findMany({
      where: { activo: true },
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const productIds = products.map((product) => product.id);
    const ratingsByProduct = new Map<string, { promedio: number | null; cantidad: number }>();

    if (productIds.length > 0) {
      const grouped = await db.productReview.groupBy({
        by: ["productId"],
        where: {
          status: "approved",
          productId: {
            in: productIds,
          },
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      for (const row of grouped) {
        ratingsByProduct.set(row.productId, {
          promedio: row._avg.rating ?? null,
          cantidad: row._count.rating ?? 0,
        });
      }
    }

    return products.map((product) => {
      const rating = ratingsByProduct.get(product.id);
      return toSummaryDTO({
        ...product,
        ratingPromedio: rating?.promedio ?? null,
        ratingCantidad: rating?.cantidad ?? 0,
      });
    });
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
    const db = ensurePrisma();
    await expirePendingReservations(db, { olderThanHours: 24 });

    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variantes: true,
      },
    });

    if (!product || !product.activo) {
      return null;
    }

    const variantIds = product.variantes.map((variant) => variant.id);
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

    const ratingAggregate = await db.productReview.aggregate({
      where: {
        productId: product.id,
        status: "approved",
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return toDetailDTO({
      ...product,
      ratingPromedio: ratingAggregate._avg.rating ?? null,
      ratingCantidad: ratingAggregate._count.rating ?? 0,
      variantes: product.variantes.map((variant) => {
        const pendingReserved = pendingByVariant.get(variant.id) ?? 0;
        return {
          ...variant,
          stockDisponible: Math.max(variant.stockVirtual - pendingReserved, 0),
        };
      }),
    });
  }
}
