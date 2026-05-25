export type UTMParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
};

const STORAGE_KEY = "fogatta_utm_v1";

const UTM_KEYS: Array<keyof UTMParams> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

function normalizeParams(params: URLSearchParams): UTMParams {
  const next: UTMParams = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) {
      next[key] = value.trim();
    }
  }

  return next;
}

export function captureUtmFromLocation() {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const next = normalizeParams(params);
  if (!Object.keys(next).length) {
    return;
  }
  const current = readStoredUtm();
  const merged = { ...current, ...next };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function readStoredUtm(): UTMParams {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as UTMParams;
  } catch {
    return {};
  }
}
