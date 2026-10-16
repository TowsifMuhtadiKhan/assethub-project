import React from "react";
import { X } from "lucide-react";

export type ChipColor = "slate" | "blue" | "rose" | "emerald" | "amber" | "purple" | "teal";
export type ChipSize = "sm" | "md" | "lg";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement | HTMLButtonElement> {
  label: React.ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  avatar?: string | { src?: string; initials?: string };
  onDelete?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  className?: string;
}

const colorStyles: Record<ChipColor, { bg: string; text: string; icon: string; deleteHover: string }> = {
  slate: {
    bg: "bg-slate-100/90",
    text: "text-slate-700",
    icon: "text-slate-500",
    deleteHover: "hover:bg-slate-200 text-slate-500 hover:text-slate-800",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: "text-blue-500",
    deleteHover: "hover:bg-blue-100 text-blue-500 hover:text-blue-700",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    icon: "text-rose-500",
    deleteHover: "hover:bg-rose-100 text-rose-500 hover:text-rose-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "text-emerald-600",
    deleteHover: "hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "text-amber-600",
    deleteHover: "hover:bg-amber-100 text-amber-600 hover:text-amber-800",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: "text-purple-600",
    deleteHover: "hover:bg-purple-100 text-purple-600 hover:text-purple-800",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    icon: "text-teal-600",
    deleteHover: "hover:bg-teal-100 text-teal-600 hover:text-teal-800",
  },
};

const sizeStyles: Record<ChipSize, { container: string; text: string; icon: string; avatar: string }> = {
  sm: {
    container: "px-2.5 py-0.5 gap-1.5",
    text: "text-[11px]",
    icon: "h-3.5 w-3.5",
    avatar: "h-4.5 w-4.5 text-[9px]",
  },
  md: {
    container: "px-3.5 py-1 gap-2",
    text: "text-xs",
    icon: "h-4 w-4",
    avatar: "h-5.5 w-5.5 text-[10px]",
  },
  lg: {
    container: "px-4 py-1.5 gap-2.5",
    text: "text-sm",
    icon: "h-4.5 w-4.5",
    avatar: "h-6.5 w-6.5 text-xs",
  },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  color = "slate",
  size = "md",
  icon: Icon,
  avatar,
  onDelete,
  onClick,
  active,
  className = "",
  ...rest
}) => {
  const cStyle = colorStyles[color] || colorStyles.slate;
  const sStyle = sizeStyles[size] || sizeStyles.md;

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-semibold transition-all select-none ${
        sStyle.container
      } ${cStyle.bg} ${cStyle.text} ${
        onClick
          ? "cursor-pointer hover:opacity-90 active:scale-95 focus:outline-none"
          : ""
      } ${
        active
          ? "ring-2 ring-emerald-600 shadow-xs font-bold"
          : ""
      } ${className}`}
      {...rest}
    >
      {/* 1. Avatar (if provided) */}
      {avatar && (
        <span className="shrink-0 -ml-1">
          {typeof avatar === "string" ? (
            <img
              src={avatar}
              alt=""
              className={`${sStyle.avatar} rounded-full object-cover ring-1 ring-white/80 shadow-2xs`}
            />
          ) : avatar.src ? (
            <img
              src={avatar.src}
              alt=""
              className={`${sStyle.avatar} rounded-full object-cover ring-1 ring-white/80 shadow-2xs`}
            />
          ) : (
            <span
              className={`${sStyle.avatar} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold ring-1 ring-white/80 shadow-2xs`}
            >
              {avatar.initials || "LN"}
            </span>
          )}
        </span>
      )}

      {/* 2. Left Icon (if provided and no avatar) */}
      {!avatar && Icon && (
        <span className={`shrink-0 ${cStyle.icon}`}>
          {typeof Icon === "function" ? <Icon className={sStyle.icon} /> : Icon}
        </span>
      )}

      {/* 3. Label Text */}
      <span className={`${sStyle.text} leading-tight truncate`}>{label}</span>

      {/* 4. Delete Dismiss Button (if onDelete provided) */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className={`-mr-1 ml-0.5 flex h-4 w-4 items-center justify-center rounded-full transition cursor-pointer ${cStyle.deleteHover}`}
          title="Remove"
          aria-label="Remove"
        >
          <X className="h-3 w-3 stroke-[2.25]" />
        </button>
      )}
    </Comp>
  );
};
