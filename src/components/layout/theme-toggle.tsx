"use client";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isNight = theme === "night";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/60 bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)]"
      aria-label={isNight ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isNight ? "Modo claro" : "Modo oscuro"}
    >
      <span aria-hidden>{isNight ? "☀" : "☾"}</span>
      <span>{isNight ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
