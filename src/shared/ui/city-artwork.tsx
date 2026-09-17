import type { CSSProperties, ReactNode } from "react";

export interface CityArt {
  horizon: string;
  /** Optional clip-path overriding the default city skyline profile. */
  profile?: string;
  sky: string;
}

export function CityArtwork({
  art,
  children,
  className = "",
}: {
  art: CityArt;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`city-art ${className}`.trim()}
      style={
        {
          "--art-profile": art.profile,
          "--horizon": art.horizon,
          "--sky": art.sky,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
