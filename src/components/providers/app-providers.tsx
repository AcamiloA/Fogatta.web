"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { CartSheet } from "@/components/cart/cart-sheet";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { captureUtmFromLocation } from "@/modules/analytics/utm";
import { CartProvider } from "@/modules/checkout-whatsapp/cart-context";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showCartSheet = !pathname.startsWith("/admin");

  useEffect(() => {
    captureUtmFromLocation();
  }, [pathname]);

  return (
    <ThemeProvider>
      <CartProvider>
        {children}
        {showCartSheet ? <CartSheet /> : null}
      </CartProvider>
    </ThemeProvider>
  );
}
