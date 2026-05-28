import { type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn(
        "ui-button",
        variant === "primary" && "ui-button--primary",
        variant === "secondary" && "ui-button--secondary",
        variant === "ghost" && "ui-button--ghost",
        variant === "danger" && "ui-button--danger",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "ui-card",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({
  tone = "muted",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "success" | "warning" | "danger" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "ui-badge",
        tone === "success" && "ui-badge--success",
        tone === "warning" && "ui-badge--warning",
        tone === "danger" && "ui-badge--danger",
        tone === "accent" && "ui-badge--accent",
        tone === "muted" && "ui-badge--muted",
        className
      )}
      {...props}
    />
  );
}
