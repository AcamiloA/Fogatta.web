"use client";

import {
  listShippingDestinationRatesResponseSchema,
  type ShippingDestinationRateDTO,
} from "@/modules/shipping/contracts";

export const SHIPPING_DESTINATIONS_STORAGE_KEY = "fogatta_shipping_destinations_v1";
export const SHIPPING_DESTINATIONS_COOKIE_NAME = "fogatta_shipping_destinations_cache";
export const SHIPPING_DESTINATIONS_CACHE_VERSION = "2026-08-20-v3";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const COOKIE_MAX_AGE_SECONDS = CACHE_TTL_MS / 1000;

type ShippingDestinationsCachePayload = {
  version: string;
  cachedAt: number;
  data: ShippingDestinationRateDTO[];
};

function buildCookieMarker(cachedAt: number) {
  return `${SHIPPING_DESTINATIONS_CACHE_VERSION}:${cachedAt}`;
}

export function readCookieValue(cookieHeader: string, name: string) {
  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(prefix.length);

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCachedShippingDestinationRates(
  rawPayload: string | null,
  cookieValue: string | null,
  now = Date.now(),
) {
  if (!rawPayload || !cookieValue) {
    return null;
  }

  try {
    const payload = JSON.parse(rawPayload) as Partial<ShippingDestinationsCachePayload>;

    if (
      payload.version !== SHIPPING_DESTINATIONS_CACHE_VERSION ||
      typeof payload.cachedAt !== "number" ||
      !Number.isFinite(payload.cachedAt)
    ) {
      return null;
    }

    if (cookieValue !== buildCookieMarker(payload.cachedAt)) {
      return null;
    }

    if (now - payload.cachedAt > CACHE_TTL_MS) {
      return null;
    }

    const parsed = listShippingDestinationRatesResponseSchema.safeParse({
      data: payload.data,
    });

    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export function readCachedShippingDestinationRates() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const cookieValue = readCookieValue(document.cookie, SHIPPING_DESTINATIONS_COOKIE_NAME);
  let rawPayload: string | null;

  try {
    rawPayload = window.localStorage.getItem(SHIPPING_DESTINATIONS_STORAGE_KEY);
  } catch {
    clearCachedShippingDestinationRates();
    return null;
  }

  const cachedRates = parseCachedShippingDestinationRates(rawPayload, cookieValue);

  if (!cachedRates) {
    clearCachedShippingDestinationRates();
  }

  return cachedRates;
}

export function writeCachedShippingDestinationRates(data: ShippingDestinationRateDTO[]) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const parsed = listShippingDestinationRatesResponseSchema.safeParse({ data });
  if (!parsed.success) {
    return;
  }

  const cachedAt = Date.now();
  const payload: ShippingDestinationsCachePayload = {
    version: SHIPPING_DESTINATIONS_CACHE_VERSION,
    cachedAt,
    data: parsed.data.data,
  };

  try {
    window.localStorage.setItem(SHIPPING_DESTINATIONS_STORAGE_KEY, JSON.stringify(payload));
    document.cookie = [
      `${SHIPPING_DESTINATIONS_COOKIE_NAME}=${encodeURIComponent(buildCookieMarker(cachedAt))}`,
      `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
      "Path=/",
      "SameSite=Lax",
    ].join("; ");
  } catch {
    clearCachedShippingDestinationRates();
  }
}

export function clearCachedShippingDestinationRates() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SHIPPING_DESTINATIONS_STORAGE_KEY);
    } catch {
      // Ignore storage failures so cache cleanup never blocks the cart.
    }
  }

  if (typeof document !== "undefined") {
    document.cookie = `${SHIPPING_DESTINATIONS_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}
