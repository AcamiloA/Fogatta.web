export const analyticsEvents = {
  viewProduct: "view_product",
  addToCart: "add_to_cart",
  startWhatsappCheckout: "start_whatsapp_checkout",
  whatsappClickSent: "whatsapp_click_sent",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];
