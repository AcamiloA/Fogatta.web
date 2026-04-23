type SeasonAnimationType = "none" | "snow" | "sparkles" | "float_icons";
type SeasonalPreset = "navidad" | "octubre" | null;

type SeasonOverlayProps = {
  animationType: SeasonAnimationType;
  intensity: 1 | 2 | 3;
  seasonalPreset: SeasonalPreset;
  hasCustomIcon: boolean;
};

function getParticleCount(intensity: 1 | 2 | 3) {
  if (intensity === 3) return 30;
  if (intensity === 2) return 20;
  return 12;
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

export function SeasonOverlay({
  animationType,
  intensity,
  seasonalPreset,
  hasCustomIcon,
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
        const duration = 12 + (index % 7) * 1.4;
        const delay = -((index % 9) * 1.1);
        const drift = ((index % 5) - 2) * 16;
        const size = 8 + (index % 4) * 4;

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
              } as React.CSSProperties
            }
          >
            {animationType === "float_icons" && !hasCustomIcon ? iconFallback : null}
          </span>
        );
      })}
    </div>
  );
}

