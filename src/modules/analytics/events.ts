export const analyticsEvents = {
  viewItem: "view_item",
  viewProduct: "view_product",
  viewItemList: "view_item_list",
  selectItem: "select_item",
  search: "search",
  addToCart: "add_to_cart",
  removeFromCart: "remove_from_cart",
  viewCart: "view_cart",
  beginCheckout: "begin_checkout",
  startWhatsappCheckout: "start_whatsapp_checkout",
  whatsappClickSent: "whatsapp_click_sent",
  generateLead: "generate_lead",
  contactSubmit: "contact_submit",
  catalogFilterSelect: "catalog_filter_select",
  faqFilterSelect: "faq_filter_select",
  blogCommentSubmit: "blog_comment_submit",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];
