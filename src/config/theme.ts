export const themePresetValues = ["warm", "night"] as const;

export type ThemePreset = (typeof themePresetValues)[number];

export function isThemePreset(value: string): value is ThemePreset {
  return themePresetValues.includes(value as ThemePreset);
}

export function resolveThemePreset(value: string | undefined, fallback: ThemePreset = "warm") {
  if (value && isThemePreset(value)) {
    return value;
  }
  return fallback;
}
