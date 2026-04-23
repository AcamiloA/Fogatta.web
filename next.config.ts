import type { NextConfig } from "next";

type RemotePattern = {
  protocol?: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

function buildS3RemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [];

  const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (s3PublicBaseUrl) {
    try {
      const parsed = new URL(s3PublicBaseUrl);
      const cleanPath = parsed.pathname.replace(/\/$/, "");
      patterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: cleanPath ? `${cleanPath}/**` : "/**",
      });
    } catch {
      // Ignore invalid S3_PUBLIC_BASE_URL so build does not fail.
    }
  }

  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  if (bucket && region) {
    patterns.push({
      protocol: "https",
      hostname: `${bucket}.s3.${region}.amazonaws.com`,
      pathname: "/**",
    });
  }

  patterns.push({
    protocol: "https",
    hostname: "**.amazonaws.com",
    pathname: "/**",
  });

  const deduped = new Map<string, RemotePattern>();
  for (const pattern of patterns) {
    const key = `${pattern.protocol}|${pattern.hostname}|${pattern.port ?? ""}|${pattern.pathname ?? "/**"}`;
    deduped.set(key, pattern);
  }

  return [...deduped.values()];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildS3RemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
