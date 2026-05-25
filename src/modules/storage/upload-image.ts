import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

type UploadOptions = {
  prefix: "products" | "reviews";
  maxSizeMb?: number;
};

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

async function uploadToS3(fileName: string, file: File, prefix: string) {
  const config = getS3Config();
  if (!config) {
    throw new Error(
      "S3 no configurado. Define S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY.",
    );
  }

  const key = `${prefix}/${fileName}`;
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

async function uploadToLocal(fileName: string, file: File, prefix: string) {
  const relativeDir = path.join("images", prefix);
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(publicDir, fileName);

  await mkdir(publicDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(bytes));

  return `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
}

export function validateUploadImage(file: File, maxSizeMb: number) {
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "El archivo debe ser imagen." };
  }

  if (file.size > maxSizeBytes) {
    return { ok: false as const, error: `La imagen supera el limite de ${maxSizeMb} MB.` };
  }

  const original = sanitizeFilename(file.name || "image");
  const extension = path.extname(original).toLowerCase() || ".png";

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false as const, error: "Formato no permitido. Usa PNG, JPG, WEBP o AVIF." };
  }

  return { ok: true as const, extension };
}

export async function uploadManagedImage(file: File, options: UploadOptions) {
  const maxSizeMb = options.maxSizeMb ?? 15;
  const validation = validateUploadImage(file, maxSizeMb);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const fileName = `${options.prefix}-${Date.now()}-${randomUUID().slice(0, 8)}${validation.extension}`;

  return STORAGE_DRIVER === "s3"
    ? uploadToS3(fileName, file, options.prefix)
    : uploadToLocal(fileName, file, options.prefix);
}

