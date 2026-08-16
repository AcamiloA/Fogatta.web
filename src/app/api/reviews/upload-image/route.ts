import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { uploadManagedImage } from "@/modules/storage/upload-image";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`review-upload:${ip}`, {
    windowMs: 60_000,
    limit: 8,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: `Demasiadas subidas. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibio imagen." }, { status: 400 });
    }

    const url = await uploadManagedImage(file, { prefix: "reviews", maxSizeMb: 15 });
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen." },
      { status: 500 },
    );
  }
}


