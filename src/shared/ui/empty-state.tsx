import type { ComponentType, ReactNode, SVGProps } from "react";
import { Surface } from "./surface";

export function EmptyState({
  action,
  description,
  icon: Icon,
  size = "page",
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: "page" | "panel";
  title: string;
}) {
  const Heading = size === "page" ? "h2" : "h3";
  return (
    <div className={`empty-state empty-state--${size}`}>
      <Surface className="empty-state__icon" depth="inset"><Icon height="22" width="22" /></Surface>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
