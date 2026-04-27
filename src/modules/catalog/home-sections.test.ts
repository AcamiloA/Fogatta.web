import { describe, expect, it } from "vitest";

import { ProductSummaryDTO } from "@/modules/catalog/contracts";
import { buildHomeCatalogSections } from "@/modules/catalog/home-sections";

const baseDate = "2026-04-10T00:00:00.000Z";

function createProduct(
  id: string,
  dates: { createdAt: string; updatedAt: string },
): ProductSummaryDTO {
  return {
    id,
    slug: `slug-${id}`,
    nombre: `Producto ${id}`,
    descripcion: "Demo",
    precioReferencia: 10000,
    imagenes: ["/images/demo.png"],
    activo: true,
    createdAt: dates.createdAt,
    updatedAt: dates.updatedAt,
    categoryId: "cat",
    categoria: {
      id: "cat",
      slug: "cat",
      nombre: "Categoría",
      resumen: null,
      descripcion: null,
    },
  };
}

describe("buildHomeCatalogSections", () => {
  it("classifies products as new using createdAt/updatedAt", () => {
    const products = [
      createProduct("new", {
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      }),
      createProduct("old", {
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-05T00:00:00.000Z",
      }),
    ];

    const sections = buildHomeCatalogSections(
      products,
      {
        newWindowDays: 7,
        selectionSize: 5,
        selectionRotationHours: 24,
        selectionSeed: "fogatta",
      },
      new Date(baseDate),
    );

    expect(sections.newProducts.map((product) => product.id)).toEqual(["new"]);
    expect(sections.featuredProducts.map((product) => product.id)).toEqual(["old"]);
  });

  it("returns deterministic featured products inside the same rotation window", () => {
    const products = Array.from({ length: 10 }).map((_, index) =>
      createProduct(`p${index + 1}`, {
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
      }),
    );

    const config = {
      newWindowDays: 3,
      selectionSize: 5,
      selectionRotationHours: 12,
      selectionSeed: "fogatta",
    };

    const first = buildHomeCatalogSections(products, config, new Date("2026-04-10T01:00:00.000Z"));
    const second = buildHomeCatalogSections(products, config, new Date("2026-04-10T05:00:00.000Z"));
    const third = buildHomeCatalogSections(products, config, new Date("2026-04-10T13:00:00.000Z"));

    expect(first.featuredProducts.map((product) => product.id)).toEqual(
      second.featuredProducts.map((product) => product.id),
    );
    expect(first.featuredProducts.map((product) => product.id)).not.toEqual(
      third.featuredProducts.map((product) => product.id),
    );
    expect(first.featuredProducts).toHaveLength(5);
  });
});

