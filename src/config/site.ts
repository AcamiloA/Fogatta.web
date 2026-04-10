import { ThemePreset } from "@/config/theme";

function readIntEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;

  return Math.min(max, Math.max(min, parsed));
}

export const siteConfig = {
  name: "Fogatta",
  description:
    "Velas artesanales para transformar espacios con aromas cálidos y una experiencia sensorial premium.",
  market: "Colombia",
  locale: "es-CO",
  whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "573001234567",
  supportHours: "Lunes a sábado 8:00 a.m. - 8:00 p.m.",
  themePreset: (process.env.NEXT_PUBLIC_THEME_PRESET ?? "warm") as ThemePreset,
  social: {
    instagram: "https://instagram.com/fogatta",
  },
};

export const homeCatalogConfig = {
  newWindowDays: readIntEnv("HOME_NEW_PRODUCT_WINDOW_DAYS", 14, 1, 365),
  selectionSize: readIntEnv("HOME_FOGATTA_SELECTION_SIZE", 5, 1, 20),
  selectionRotationHours: readIntEnv("HOME_FOGATTA_SELECTION_ROTATION_HOURS", 24, 1, 720),
  selectionSeed: process.env.HOME_FOGATTA_SELECTION_SEED ?? "fogatta",
};

export const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/contacto", label: "Contacto" },
];
