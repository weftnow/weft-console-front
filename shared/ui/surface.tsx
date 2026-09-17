import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfaceDepth = "flat" | "raised" | "floating" | "inset";

type SurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  children?: ReactNode;
  className?: string;
  depth?: SurfaceDepth;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const depthClasses: Record<SurfaceDepth, string> = {
  flat: "",
  raised: "surface-raised",
  floating: "surface-floating",
  inset: "surface-inset",
};

export function Surface<T extends ElementType = "div">({
  as,
  children,
  className = "",
  depth = "flat",
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={`${depthClasses[depth]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
