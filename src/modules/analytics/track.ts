import { AnalyticsEventName } from "@/modules/analytics/events";

type EventPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: AnalyticsEventName, payload: EventPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    ...payload,
  });
}
