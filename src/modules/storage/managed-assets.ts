import { rm } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
const LOCAL_PRODUCTS_PREFIX = "/images/products/";

type S3Config = {
  region: string;
  bucket: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  publicBaseUrl: string;
};

function getS3Config(): S3Config | null {
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

function getLocalPathFromUrl(url: string) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(LOCAL_PRODUCTS_PREFIX)) {
    return path.join(process.cwd(), "public", trimmed.replace(/^\//, ""));
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith(LOCAL_PRODUCTS_PREFIX)) {
      return path.join(process.cwd(), "public", parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    return null;
  }

  return null;
}

function getS3KeyFromUrl(url: string, config: S3Config) {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const basePrefix = `${config.publicBaseUrl}/`;
  if (!trimmed.startsWith(basePrefix)) {
    return null;
  }

  const key = trimmed.slice(basePrefix.length);
  if (!key.startsWith("products/")) {
    return null;
  }

  return key;
}

async function deleteFromLocal(url: string) {
  const localPath = getLocalPathFromUrl(url);
  if (!localPath) {
    return false;
  }

  await rm(localPath, { force: true });
  return true;
}

async function deleteFromS3(url: string) {
  const config = getS3Config();
  if (!config) {
    return false;
  }

  const key = getS3KeyFromUrl(url, config);
  if (!key) {
    return false;
  }

  const client = new S3Client({
    region: config.region,
    credentials: config.credentials,
  });

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return true;
}

export async function deleteManagedAssetByUrl(url: string) {
  if (STORAGE_DRIVER === "s3") {
    return deleteFromS3(url);
  }

  return deleteFromLocal(url);
}

