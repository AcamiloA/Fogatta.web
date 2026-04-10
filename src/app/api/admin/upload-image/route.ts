import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  if (!isAdminRequestAuthenticated(request)) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibio imagen." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser imagen." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera el limite de 5 MB." },
        { status: 400 },
      );
    }

    const original = sanitizeFilename(file.name || "image");
    const extension = path.extname(original).toLowerCase() || ".png";
    if (!allowedExtensions.has(extension)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa PNG, JPG, WEBP o AVIF." },
        { status: 400 },
      );
    }

    const fileName = `product-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const relativeDir = path.join("images", "products");
    const publicDir = path.join(process.cwd(), "public", relativeDir);
    const absolutePath = path.join(publicDir, fileName);

    await mkdir(publicDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(absolutePath, Buffer.from(bytes));

    return NextResponse.json({ ok: true, url: `/${relativeDir.replace(/\\/g, "/")}/${fileName}` });
  } catch {
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
