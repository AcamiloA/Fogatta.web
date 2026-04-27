import { ProductDetailDTO, ProductSummaryDTO } from "@/modules/catalog/contracts";
import { CatalogRepository } from "@/modules/catalog/repository";
import { fallbackProducts } from "@/modules/catalog/seed-data";

export class FallbackCatalogRepository implements CatalogRepository {
  async listProducts(): Promise<ProductSummaryDTO[]> {
    return fallbackProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      resumen: product.resumen,
      descripcion: product.descripcion,
      precioReferencia: product.precioReferencia,
      imagenes: product.imagenes,
      activo: product.activo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categoryId: product.categoryId,
      categoria: product.categoria,
    }));
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
    return fallbackProducts.find((product) => product.slug === slug) ?? null;
  }
}
