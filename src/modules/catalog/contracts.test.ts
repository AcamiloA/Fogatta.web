import { describe, expect, it } from "vitest";

import { listProductsResponseSchema, productDetailSchema } from "@/modules/catalog/contracts";

const detailFixture = {
  id: "prod_demo",
  slug: "vela-demo",
  nombre: "Vela Demo",
  descripcion: "Descripcion demo",
  precioReferencia: 35000,
  imagenes: ["/images/products/demo.svg"],
  activo: true,
  createdAt: "2026-04-13T00:00:00.000Z",
  updatedAt: "2026-04-13T00:00:00.000Z",
  categoryId: "cat_demo",
  categoria: {
    id: "cat_demo",
    slug: "demo",
    nombre: "Demo",
    descripcion: null,
  },
  variantes: [
    {
      id: "var_demo",
      productId: "prod_demo",
      nombreVariante: "220g",
      sku: "FOG-DEMO-220",
      stockVirtual: 10,
      stockMinimoAlerta: 3,
      precio: 35000,
      imagenes: ["/images/products/demo.svg"],
      descuentoActivo: true,
      descuentoPorcentaje: 15,
    },
  ],
};

describe("catalog contracts", () => {
  it("accepts summary payload", () => {
    const parsed = listProductsResponseSchema.parse({
      data: [
        {
          id: detailFixture.id,
          slug: detailFixture.slug,
          nombre: detailFixture.nombre,
          descripcion: detailFixture.descripcion,
          precioReferencia: detailFixture.precioReferencia,
          imagenes: detailFixture.imagenes,
          activo: detailFixture.activo,
          createdAt: detailFixture.createdAt,
          updatedAt: detailFixture.updatedAt,
          categoryId: detailFixture.categoryId,
          categoria: detailFixture.categoria,
        },
      ],
    });

    expect(parsed.data).toHaveLength(1);
  });

  it("validates detail model with variants", () => {
    const parsed = productDetailSchema.parse(detailFixture);
    expect(parsed.variantes[0]?.descuentoPorcentaje).toBe(15);
  });
});
