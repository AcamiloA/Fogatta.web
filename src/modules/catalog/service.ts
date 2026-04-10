import { logWarn } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { ProductDetailDTO, ProductSummaryDTO } from "@/modules/catalog/contracts";
import { FallbackCatalogRepository } from "@/modules/catalog/fallback-repository";
import { PrismaCatalogRepository } from "@/modules/catalog/prisma-repository";
import { CatalogRepository } from "@/modules/catalog/repository";

let forceFallbackRepository = false;

export class CatalogService {
  private repository: CatalogRepository;

  constructor(repository?: CatalogRepository) {
    this.repository =
      repository ??
      (prisma && !forceFallbackRepository
        ? new PrismaCatalogRepository()
        : new FallbackCatalogRepository());
  }

  async listProducts(): Promise<ProductSummaryDTO[]> {
    try {
      return await this.repository.listProducts();
    } catch {
      forceFallbackRepository = true;
      logWarn("catalog_repository_unavailable_using_fallback", { reason: "list_products" });
      return new FallbackCatalogRepository().listProducts();
    }
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
    try {
      return await this.repository.getProductBySlug(slug);
    } catch {
      forceFallbackRepository = true;
      logWarn("catalog_repository_unavailable_using_fallback", {
        reason: "get_product",
        slug,
      });
      return new FallbackCatalogRepository().getProductBySlug(slug);
    }
  }
}
