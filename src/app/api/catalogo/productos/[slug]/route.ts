import { NextResponse } from "next/server";

import { getProductResponseSchema } from "@/modules/catalog/contracts";
import { CatalogService } from "@/modules/catalog/service";
import { logError } from "@/lib/logger";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, { params }: Props) {
  try {
    const { slug } = await params;
    const product = await new CatalogService().getProductBySlug(slug);
    const payload = getProductResponseSchema.parse({ data: product });
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    logError("api_get_product_failed", { error });
    return NextResponse.json({ error: "No se pudo cargar el producto." }, { status: 500 });
  }
}
