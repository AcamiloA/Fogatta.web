import { ProductDetailDTO, ProductSummaryDTO } from "@/modules/catalog/contracts";

export interface CatalogRepository {
  listProducts(): Promise<ProductSummaryDTO[]>;
  getProductBySlug(slug: string): Promise<ProductDetailDTO | null>;
}
