import { NextResponse } from "next/server";

import { CatalogService } from "@/modules/catalog/service";
import { listProductsResponseSchema } from "@/modules/catalog/contracts";
import { logError } from "@/lib/logger";

export async function GET() {
  try {
    const products = await new CatalogService().listProducts();
    const payload = listProductsResponseSchema.parse({ data: products });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    logError("api_list_products_failed", { error });
    return NextResponse.json({ error: "No se pudo cargar el catálogo." }, { status: 500 });
  }
}
