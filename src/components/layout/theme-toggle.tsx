"use client";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, canToggle, toggleTheme } = useTheme();
  const isNight = theme === "night";

  if (!canToggle) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]/60 bg-[var(--surface-2)] text-[var(--fg-muted)] transition hover:text-[var(--fg-strong)]"
      aria-label={isNight ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isNight ? "Modo claro" : "Modo oscuro"}
    >
      <span aria-hidden>
        {isNight ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
          </svg>
        )}
      </span>
    </button>
  );
}
