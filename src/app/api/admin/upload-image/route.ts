import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";

const MAX_IMAGE_SIZE_MB = 15;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getS3Config() {
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    region,
    bucket,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    publicBaseUrl:
      process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      `https://${bucket}.s3.${region}.amazonaws.com`,
  };
}

async function uploadToS3(fileName: string, file: File) {
  const config = getS3Config();
  if (!config) {
    throw new Error(
      "S3 no configurado. Define S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY.",
    );
  }

  const key = `products/${fileName}`;
  const client = new S3Client({
    region: config.region,
    credentials: config.credentials,
  });

  const bytes = await file.arrayBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${config.publicBaseUrl}/${key}`;
}

async function uploadToLocal(fileName: string, file: File) {
  const relativeDir = path.join("images", "products");
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(publicDir, fileName);

  await mkdir(publicDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(bytes));

  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser imagen." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `La imagen supera el limite de ${MAX_IMAGE_SIZE_MB} MB.` },
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
    const url =
      STORAGE_DRIVER === "s3" ? await uploadToS3(fileName, file) : await uploadToLocal(fileName, file);

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
