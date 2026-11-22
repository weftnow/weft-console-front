import type { ButtonHTMLAttributes } from "react";
import { LoadingSpinner } from "./loading";

type TactileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  pendingLabel?: string;
  variant?: "neutral" | "accent" | "ghost" | "primary" | "graphite";
};

export function TactileButton({
  className = "",
  children,
  disabled,
  iconOnly = false,
  pendingLabel,
  type = "button",
  variant = "neutral",
  "aria-label": ariaLabel,
  "aria-busy": ariaBusy,
  ...props
}: TactileButtonProps) {
  return (
    <button
      className={`tactile-button tactile-button--${variant} ${iconOnly ? "tactile-button--icon" : ""} ${className}`.trim()}
      type={type}
      {...props}
      aria-busy={pendingLabel ? true : ariaBusy}
      aria-label={pendingLabel ?? ariaLabel}
      data-pending={pendingLabel ? "true" : undefined}
      disabled={disabled || Boolean(pendingLabel)}
    >
      {pendingLabel ? (
        <>
          <span aria-hidden="true" className="tactile-button__pending-content">{children}</span>
          <span className="tactile-button__pending-indicator"><LoadingSpinner /></span>
        </>
      ) : children}
    </button>
  );
}
