import { prisma } from "@/lib/db";
import {
  ProductDetailDTO,
  ProductSummaryDTO,
  productDetailSchema,
  productSummarySchema,
} from "@/modules/catalog/contracts";
import { CatalogRepository } from "@/modules/catalog/repository";

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
}): ProductSummaryDTO {
  return productSummarySchema.parse({
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
  });
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
    ...toSummaryDTO(product),
    variantes: product.variantes,
  });
}

export class PrismaCatalogRepository implements CatalogRepository {
  async listProducts(): Promise<ProductSummaryDTO[]> {
    const db = ensurePrisma();
    const products = await db.product.findMany({
      where: { activo: true },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products.map(toSummaryDTO);
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
    const db = ensurePrisma();
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

    return toDetailDTO(product);
  }
}
