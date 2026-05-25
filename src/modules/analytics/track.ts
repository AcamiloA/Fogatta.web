import { AnalyticsEventName } from "@/modules/analytics/events";

type EventPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
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

  if (typeof window.fbq === "function") {
    if (event === "add_to_cart") {
      window.fbq("track", "AddToCart", payload);
    } else if (event === "begin_checkout") {
      window.fbq("track", "InitiateCheckout", payload);
    } else if (event === "purchase") {
      window.fbq("track", "Purchase", payload);
    } else if (event === "generate_lead" || event === "contact_submit") {
      window.fbq("track", "Lead", payload);
    } else if (event === "view_item") {
      window.fbq("track", "ViewContent", payload);
    }
  }
}
