"use client";

const ANGLES = { top: 0, right: 90, bottom: 180, left: 270 } as const;

interface Props {
  direction?: keyof typeof ANGLES;
  layers?: number;
  intensity?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ProgressiveBlur({
  direction = "bottom",
  layers = 8,
  intensity = 0.25,
  className,
  style,
}: Props) {
  const angle = ANGLES[direction];
  const safeLayers = Math.max(layers, 2);
  const segmentSize = 1 / (safeLayers + 1);

  return (
    <div className={className} style={{ position: "absolute", inset: 0, ...style }}>
      {Array.from({ length: safeLayers }).map((_, i) => {
        const stops = [
          i * segmentSize,
          (i + 1) * segmentSize,
          (i + 2) * segmentSize,
          (i + 3) * segmentSize,
        ]
          .map(
            (pos, idx) =>
              `rgba(255,255,255,${idx === 1 || idx === 2 ? 1 : 0}) ${pos * 100}%`,
          )
          .join(", ");
        const gradient = `linear-gradient(${angle}deg, ${stops})`;
        return (
          <div
            key={i}
            className="pointer-events-none absolute inset-0"
            style={{
              maskImage: gradient,
              WebkitMaskImage: gradient,
              backdropFilter: `blur(${i * intensity}px)`,
              WebkitBackdropFilter: `blur(${i * intensity}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
