import type { ButtonHTMLAttributes } from "react";

type TactileButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconOnly?: boolean;
  variant?: "neutral" | "accent" | "ghost" | "primary" | "graphite";
};

export function TactileButton({
  className = "",
  iconOnly = false,
  type = "button",
  variant = "neutral",
  ...props
}: TactileButtonProps) {
  return (
    <button
      className={`tactile-button tactile-button--${variant} ${iconOnly ? "tactile-button--icon" : ""} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}
