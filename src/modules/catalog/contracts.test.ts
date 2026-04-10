import { describe, expect, it } from "vitest";

import { listProductsResponseSchema, productDetailSchema } from "@/modules/catalog/contracts";
import { fallbackProducts } from "@/modules/catalog/seed-data";

describe("catalog contracts", () => {
  it("accepts fallback catalog payload", () => {
    const summaries = fallbackProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      descripcion: product.descripcion,
      precioReferencia: product.precioReferencia,
      imagenes: product.imagenes,
      activo: product.activo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categoryId: product.categoryId,
      categoria: product.categoria,
    }));
    const parsed = listProductsResponseSchema.parse({ data: summaries });
    expect(parsed.data.length).toBeGreaterThan(0);
  });

  it("validates detail model with variants", () => {
    const parsed = productDetailSchema.parse(fallbackProducts[0]);
    expect(parsed.variantes.length).toBeGreaterThan(0);
  });
});
