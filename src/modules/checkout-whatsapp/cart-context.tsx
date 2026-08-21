"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";
import { readStoredUtm } from "@/modules/analytics/utm";
import { whatsappPreviewResponseSchema } from "@/modules/checkout-whatsapp/contracts";
import { siteConfig } from "@/config/site";

export type CartItem = {
  productId?: string;
  variantId?: string;
  slug: string;
  nombreProducto: string;
  nombreVariante?: string;
  precioUnitario: number;
  cantidad: number;
  stockDisponible?: number;
};

type ClientData = {
  clienteNombre: string;
  clienteCiudad: string;
  destinoSlug: string;
  telefono: string;
  notas?: string;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (slug: string, variantName?: string) => void;
  clearCart: () => void;
  checkoutByWhatsApp: (client: ClientData) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "fogatta_cart_v1";

function getItemKey(item: CartItem) {
  return `${item.slug}:${item.nombreVariante ?? "base"}`;
}

function getStockLimit(item: Pick<CartItem, "stockDisponible">) {
  if (
    item.stockDisponible === undefined ||
    !Number.isFinite(item.stockDisponible) ||
    item.stockDisponible < 0
  ) {
    return undefined;
  }

  return Math.floor(item.stockDisponible);
}

function normalizeCartQuantity(quantity: number, stockLimit?: number) {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(Math.floor(quantity), 1) : 1;

  if (stockLimit === undefined) {
    return safeQuantity;
  }

  return Math.min(safeQuantity, stockLimit);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function addItem(incoming: CartItem) {
    setItems((prev) => {
      const key = getItemKey(incoming);
      const current = prev.find((item) => getItemKey(item) === key);
      const incomingStockLimit = getStockLimit(incoming);
      const incomingQuantity = normalizeCartQuantity(incoming.cantidad, incomingStockLimit);

      if (incomingStockLimit !== undefined && incomingQuantity <= 0) {
        return prev;
      }

      if (!current) {
        return [...prev, { ...incoming, cantidad: incomingQuantity }];
      }
      return prev.map((item) =>
        getItemKey(item) === key ? mergeCartItemQuantity(item, incoming, incomingQuantity) : item,
      );
    });
  }

  function mergeCartItemQuantity(
    current: CartItem,
    incoming: CartItem,
    incomingQuantity: number,
  ) {
    const stockLimit = getStockLimit(incoming) ?? getStockLimit(current);
    const nextQuantity = normalizeCartQuantity(current.cantidad + incomingQuantity, stockLimit);

    return {
      ...current,
      precioUnitario: incoming.precioUnitario,
      stockDisponible: stockLimit ?? current.stockDisponible,
      cantidad: nextQuantity,
    };
  }

  function removeItem(slug: string, variantName?: string) {
    const key = `${slug}:${variantName ?? "base"}`;
    const removed = items.find((item) => getItemKey(item) === key);
    if (removed) {
      trackEvent(analyticsEvents.removeFromCart, {
        currency: "COP",
        value: removed.precioUnitario * removed.cantidad,
        items: [
          {
            item_id: removed.variantId ?? removed.productId ?? removed.slug,
            item_name: removed.nombreProducto,
            item_variant: removed.nombreVariante ?? "base",
            price: removed.precioUnitario,
            quantity: removed.cantidad,
          },
        ],
      });
    }

    setItems((prev) => prev.filter((item) => getItemKey(item) !== key));
  }

  function clearCart() {
    setItems([]);
  }

  async function checkoutByWhatsApp(client: ClientData) {
    if (!items.length) {
      return { ok: false as const, error: "Tu carrito está vacío." };
    }

    try {
      const itemsPayload = items.map((item) => ({
        item_id: item.variantId ?? item.productId ?? item.slug,
        item_name: item.nombreProducto,
        item_variant: item.nombreVariante ?? "base",
        price: item.precioUnitario,
        quantity: item.cantidad,
      }));
      const checkoutValue = items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
      const utm = readStoredUtm();

      trackEvent(analyticsEvents.beginCheckout, {
        currency: "COP",
        value: checkoutValue,
        ...utm,
        items: itemsPayload,
      });

      trackEvent(analyticsEvents.startWhatsappCheckout, {
        currency: "COP",
        value: checkoutValue,
        items_count: items.length,
        ...utm,
        items: itemsPayload,
      });

      const response = await fetch("/api/checkout/whatsapp-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...client,
          utm,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            nombreProducto: item.nombreProducto,
            nombreVariante: item.nombreVariante,
            precioUnitario: item.precioUnitario,
            cantidad: item.cantidad,
          })),
        }),
      });

      if (!response.ok) {
        try {
          const raw = (await response.json()) as { error?: string };
          return {
            ok: false as const,
            error: raw.error ?? "No fue posible preparar el pedido.",
          };
        } catch {
          return { ok: false as const, error: "No fue posible preparar el pedido." };
        }
      }

      const raw = await response.json();
      const payload = whatsappPreviewResponseSchema.parse(raw);
      const url = `https://wa.me/${siteConfig.whatsappPhone}?text=${payload.mensajeUrlEncoded}`;

      trackEvent(analyticsEvents.whatsappClickSent, {
        currency: "COP",
        value: payload.totalReferencia,
        items_count: items.length,
        ...utm,
      });
      trackEvent(analyticsEvents.clickWhatsapp, {
        source: "checkout_cart",
        value: payload.totalReferencia,
        ...utm,
      });
      trackEvent(analyticsEvents.purchase, {
        currency: "COP",
        value: payload.totalReferencia,
        transaction_id: payload.orderId ?? undefined,
        items: itemsPayload,
        ...utm,
      });

      window.open(url, "_blank", "noopener,noreferrer");
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Error inesperado al abrir WhatsApp." };
    }
  }

  const subtotal = items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const value: CartContextValue = {
    items,
    subtotal,
    totalItems,
    addItem,
    removeItem,
    clearCart,
    checkoutByWhatsApp,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
