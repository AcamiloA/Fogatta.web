import { NextRequest, NextResponse } from "next/server";

import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import { uploadManagedImage } from "@/modules/storage/upload-image";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibio imagen." }, { status: 400 });
    }

    const url = await uploadManagedImage(file, { prefix: "products", maxSizeMb: 15 });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo subir la imagen.",
      },
      { status: 500 },
    );
  }
}

