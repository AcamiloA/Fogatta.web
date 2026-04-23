type SeasonAnimationType = "none" | "snow" | "sparkles" | "float_icons";
type SeasonalPreset = "navidad" | "octubre" | null;

type SeasonOverlayProps = {
  animationType: SeasonAnimationType;
  intensity: 1 | 2 | 3;
  seasonalPreset: SeasonalPreset;
  iconImageUrls: string[];
};

function getParticleCount(intensity: 1 | 2 | 3) {
  if (intensity === 3) return 32;
  if (intensity === 2) return 22;
  return 14;
}

function defaultIconForSeason(seasonalPreset: SeasonalPreset) {
  if (seasonalPreset === "octubre") {
    return "🎃";
  }
  if (seasonalPreset === "navidad") {
    return "❄";
  }
  return "✦";
}

function pickIconUrl(index: number, iconImageUrls: string[]) {
  if (iconImageUrls.length === 0) {
    return null;
  }
  const nextIndex = (index * 7 + 3) % iconImageUrls.length;
  return iconImageUrls[nextIndex] ?? null;
}

export function SeasonOverlay({
  animationType,
  intensity,
  seasonalPreset,
  iconImageUrls,
}: SeasonOverlayProps) {
  if (animationType === "none") {
    return null;
  }

  const count = getParticleCount(intensity);
  const iconFallback = defaultIconForSeason(seasonalPreset);

  return (
    <div className={`season-overlay season-overlay--${animationType}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => {
        const left = (index * 11.7) % 100;
        const duration = 9 + (index % 9) * 1.35;
        const delay = -((index % 10) * 1.15);
        const drift = ((index % 7) - 3) * 15;
        const size = animationType === "float_icons" ? 10 + (index % 6) * 5 : 8 + (index % 4) * 4;
        const iconUrl = animationType === "float_icons" ? pickIconUrl(index, iconImageUrls) : null;

        return (
          <span
            key={`season-particle-${index}`}
            className="season-overlay__particle"
            style={
              {
                left: `${left}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                "--season-drift": `${drift}px`,
                "--season-size": `${size}px`,
                "--season-icon-image": iconUrl ? `url("${iconUrl}")` : "none",
              } as React.CSSProperties
            }
          >
            {animationType === "float_icons" && !iconUrl ? iconFallback : null}
          </span>
        );
      })}
    </div>
  );
}
