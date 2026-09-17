import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

export interface CityArt {
  horizon: string;
  /** Optional public image path replacing the generated skyline treatment. */
  image?: string;
  /** Optional clip-path overriding the default city skyline profile. */
  profile?: string;
  sky: string;
}

export function CityArtwork({
  art,
  children,
  className = "",
  eager = false,
}: {
  art: CityArt;
  children?: ReactNode;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`city-art ${art.image ? "city-art--has-image" : ""} ${className}`.trim()}
      style={
        {
          "--art-profile": art.profile,
          "--horizon": art.horizon,
          "--sky": art.sky,
        } as CSSProperties
      }
    >
      {art.image ? (
        <Image
          alt=""
          className="city-art__image"
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 900px) 100vw, 33vw"
          src={art.image}
        />
      ) : null}
      {children}
    </div>
  );
}
