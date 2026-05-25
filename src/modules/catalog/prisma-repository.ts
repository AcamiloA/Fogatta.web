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

    return products.map(toSummaryDTO);
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

    return toDetailDTO({
      ...product,
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
