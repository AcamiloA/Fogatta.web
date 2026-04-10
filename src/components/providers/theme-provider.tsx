"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { siteConfig } from "@/config/site";
import { ThemePreset } from "@/config/theme";

type ThemeContextValue = {
  theme: ThemePreset;
  toggleTheme: () => void;
};

const STORAGE_KEY = "fogatta_theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): ThemePreset {
  if (typeof window === "undefined") {
    return siteConfig.themePreset;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "warm" || stored === "night") {
    return stored;
  }

  const bodyTheme = document.body.getAttribute("data-theme");
  if (bodyTheme === "warm" || bodyTheme === "night") {
    return bodyTheme;
  }

  return siteConfig.themePreset;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreset>(() => getInitialTheme());

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((current) => (current === "warm" ? "night" : "warm"));
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
