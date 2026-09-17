/** Horizon Family Office wordmark glyph — concentric diamonds cut from graphite. */
export function PartnerMark({ size = 52 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="partner-mark"
      fill="none"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <rect
        fill="#171816"
        height="34"
        rx="8"
        transform="rotate(45 24 24)"
        width="34"
        x="7"
        y="7"
      />
      <rect
        height="16"
        rx="4"
        stroke="#f4f2ee"
        strokeWidth="2.2"
        transform="rotate(45 24 24)"
        width="16"
        x="16"
        y="16"
      />
      <circle cx="24" cy="24" fill="#f4f2ee" r="2.6" />
    </svg>
  );
}
