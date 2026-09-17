import type { CSSProperties } from "react";

interface ProgressRingProps {
  ariaLabel: string;
  size?: number;
  thickness?: number;
  value: number;
}

/**
 * Recessed ceramic track with a single orange arc resting on top of it —
 * the compact counterpart to the radial charts used across the console.
 */
export function ProgressRing({
  ariaLabel,
  size = 44,
  thickness = 6,
  value,
}: ProgressRingProps) {
  const stroke = (thickness / size) * 100;
  const radius = 50 - stroke / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      aria-label={ariaLabel}
      className="progress-ring"
      role="img"
      style={{ "--ring-size": `${size}px`, "--ring-thickness": `${thickness}px` } as CSSProperties}
    >
      <span aria-hidden="true" className="progress-ring__track" />
      <svg aria-hidden="true" className="progress-ring__arc" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke="var(--weft-orange)"
          strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </svg>
    </div>
  );
}
