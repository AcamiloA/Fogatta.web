"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CartSheet } from "@/components/cart/cart-sheet";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CartProvider } from "@/modules/checkout-whatsapp/cart-context";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showCartSheet = !pathname.startsWith("/admin");

  return (
    <ThemeProvider>
      <CartProvider>
        {children}
        {showCartSheet ? <CartSheet /> : null}
      </CartProvider>
    </ThemeProvider>
  );
}
