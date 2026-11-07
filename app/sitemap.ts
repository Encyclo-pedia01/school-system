import type { MetadataRoute } from "next";
import { headers } from "next/headers";

function getSiteOrigin(configuredUrl: string | undefined, hostHeader: string | null, protocolHeader: string | null) {
  if (configuredUrl) {
    try {
      const configured = new URL(configuredUrl);
      if (configured.protocol === "https:" || configured.hostname === "localhost") return configured.origin;
    } catch {
      return null;
    }
    return null;
  }

  const host = hostHeader?.split(",")[0].trim();
  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host)) return null;
  const protocol = protocolHeader?.split(",")[0].trim() === "http" ? "http" : "https";
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const origin = getSiteOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto"),
  );

  if (!origin) return [];

  return ["/login", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, origin).toString(),
    changeFrequency: "yearly",
    priority: path === "/login" ? 0.7 : 0.3,
  }));
}
