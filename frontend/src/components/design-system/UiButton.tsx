import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
}

export function UiButton({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: UiButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles: Record<ButtonSize, string> = {
    xs: "px-2 py-1 text-[11px] gap-1",
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-[#f97316] hover:bg-[#ea580c] text-white shadow-2xs focus:ring-2 focus:ring-[#f97316]/30",
    secondary:
      "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs focus:ring-2 focus:ring-slate-900/30",
    outline:
      "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs focus:ring-2 focus:ring-slate-200",
    ghost:
      "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    danger:
      "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 focus:ring-2 focus:ring-rose-200",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
    </button>
  );
}
