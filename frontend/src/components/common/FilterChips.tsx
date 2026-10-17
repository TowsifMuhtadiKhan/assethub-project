import React from "react";
import type { LucideIcon } from "lucide-react";
import { THEME_CONFIG } from "../../theme/theme";

export interface FilterChipOption<T extends string | number = string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  disabled?: boolean;
}

export interface FilterChipsProps<T extends string | number = string> {
  items: FilterChipOption<T>[];
  value: T;
  onChange: (id: T) => void;
  size?: "xs" | "sm" | "md";
  variant?: "theme" | "dark" | "outline";
  scrollable?: boolean;
  className?: string;
  itemClassName?: string;
}

export function FilterChips<T extends string | number = string>({
  items,
  value,
  onChange,
  size = "sm",
  variant = "theme",
  scrollable = true,
  className = "",
  itemClassName = "",
}: FilterChipsProps<T>) {
  const sizeMap = {
    xs: {
      btn: "px-2.5 py-0.5 text-[11px] gap-1",
      badge: "text-[9px] px-1.5 py-0.2",
      icon: "w-3 h-3",
    },
    sm: {
      btn: "px-3 py-1 text-xs gap-1.5",
      badge: "text-[10px] px-1.5 py-0.5",
      icon: "w-3.5 h-3.5",
    },
    md: {
      btn: "px-3.5 py-1.5 text-xs gap-2",
      badge: "text-xs px-2 py-0.5",
      icon: "w-4 h-4",
    },
  };

  const sz = sizeMap[size];

  const getVariantStyles = (isActive: boolean) => {
    if (variant === "theme") {
      return {
        btn: isActive
          ? THEME_CONFIG.classes.chipActive
          : THEME_CONFIG.classes.chipInactive,
        badge: isActive
          ? THEME_CONFIG.classes.chipCountActive
          : THEME_CONFIG.classes.chipCountInactive,
      };
    }
    if (variant === "dark") {
      return {
        btn: isActive
          ? "bg-slate-900 text-white shadow-xs font-bold"
          : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80",
        badge: isActive
          ? "bg-white/20 text-white"
          : "bg-slate-100 text-slate-600",
      };
    }
    // outline
    return {
      btn: isActive
        ? "border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] bg-emerald-50/50 font-bold"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      badge: isActive
        ? "bg-emerald-100 text-emerald-800"
        : "bg-slate-100 text-slate-600",
    };
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${
        scrollable ? "overflow-x-auto no-scrollbar py-0.5" : "flex-wrap"
      } ${className}`}
    >
      {items.map((chip) => {
        const isActive = chip.id === value;
        const Icon = chip.icon;
        const styles = getVariantStyles(isActive);

        return (
          <button
            key={String(chip.id)}
            type="button"
            disabled={chip.disabled}
            onClick={() => onChange(chip.id)}
            className={`inline-flex items-center rounded-full font-semibold transition-all whitespace-nowrap select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${sz.btn} ${styles.btn} ${itemClassName}`}
          >
            {Icon && (
              <span className="shrink-0">
                {React.isValidElement(Icon) ? (
                  Icon
                ) : (
                  (() => {
                    const Comp = Icon as React.ComponentType<{ className?: string }>;
                    return <Comp className={sz.icon} />;
                  })()
                )}
              </span>
            )}
            <span>{chip.label}</span>
            {typeof chip.count === "number" && (
              <span className={`rounded-full font-bold leading-none ${sz.badge} ${styles.badge}`}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FilterChips;
