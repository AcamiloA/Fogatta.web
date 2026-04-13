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
};

type ClientData = {
  clienteNombre: string;
  clienteCiudad: string;
  telefono: string;
  notas?: string;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (slug: string, variantName?: string) => void;
  setQuantity: (slug: string, variantName: string | undefined, quantity: number) => void;
  clearCart: () => void;
  checkoutByWhatsApp: (client: ClientData) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "fogatta_cart_v1";

function getItemKey(item: CartItem) {
  return `${item.slug}:${item.nombreVariante ?? "base"}`;
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
      if (!current) {
        trackEvent(analyticsEvents.addToCart, {
          item_name: incoming.nombreProducto,
          item_variant: incoming.nombreVariante ?? "base",
          value: incoming.precioUnitario,
        });
        return [...prev, incoming];
      }
      return prev.map((item) =>
        getItemKey(item) === key
          ? { ...item, cantidad: item.cantidad + incoming.cantidad }
          : item,
      );
    });
  }

  function removeItem(slug: string, variantName?: string) {
    const key = `${slug}:${variantName ?? "base"}`;
    setItems((prev) => prev.filter((item) => getItemKey(item) !== key));
  }

  function setQuantity(slug: string, variantName: string | undefined, quantity: number) {
    const key = `${slug}:${variantName ?? "base"}`;
    setItems((prev) =>
      prev
        .map((item) =>
          getItemKey(item) === key ? { ...item, cantidad: Math.max(quantity, 1) } : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  function clearCart() {
    setItems([]);
  }

  async function checkoutByWhatsApp(client: ClientData) {
    if (!items.length) {
      return { ok: false as const, error: "Tu carrito está vacío." };
    }

    try {
      trackEvent(analyticsEvents.startWhatsappCheckout, { items_count: items.length });

      const response = await fetch("/api/checkout/whatsapp-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...client,
          items,
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
        value: payload.subtotalReferencia,
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
    setQuantity,
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
