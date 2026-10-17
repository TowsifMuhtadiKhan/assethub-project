import React from "react";
import type { LucideIcon } from "lucide-react";
import { THEME_CONFIG } from "../../theme/theme";

export interface TabItem<T extends string | number = string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string | number = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: "segmented" | "pills" | "underline";
  size?: "xs" | "sm" | "md";
  fullWidth?: boolean;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function Tabs<T extends string | number = string>({
  items,
  value,
  onChange,
  variant = "segmented",
  size = "sm",
  fullWidth = false,
  className = "",
  itemClassName = "",
  activeClassName = "",
  inactiveClassName = "",
}: TabsProps<T>) {
  // Size specific metrics
  const sizeMap = {
    xs: {
      wrapper: "text-[11px] p-0.5 gap-1",
      btn: "px-2.5 py-0.5 text-[11px]",
      badge: "text-[9px] px-1.5 py-0.2",
      icon: "w-3 h-3",
    },
    sm: {
      wrapper: "text-xs p-1 gap-1",
      btn: "px-3 py-1 text-xs",
      badge: "text-[10px] px-1.5 py-0.5",
      icon: "w-3.5 h-3.5",
    },
    md: {
      wrapper: "text-xs p-1.5 gap-1.5",
      btn: "px-4 py-1.5 text-xs",
      badge: "text-xs px-2 py-0.5",
      icon: "w-4 h-4",
    },
  };

  const sz = sizeMap[size];

  // 1. SEGMENTED PILLS VARIANT (Default: Grey capsule with white card active pill)
  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center rounded-full bg-slate-100 ${
          fullWidth ? "w-full flex" : ""
        } ${sz.wrapper} ${className}`}
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === value;
          const Icon = tab.icon;

          return (
            <button
              key={String(tab.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all whitespace-nowrap select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                fullWidth ? "flex-1" : ""
              } ${sz.btn} ${
                isActive
                  ? activeClassName || THEME_CONFIG.classes.tabSegmentedActive
                  : inactiveClassName || THEME_CONFIG.classes.tabSegmentedInactive
              } ${itemClassName}`}
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
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full font-bold leading-none ${sz.badge} ${
                    isActive
                      ? "bg-slate-100 text-slate-800"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 2. THEMED PILLS VARIANT (Active pill takes deep theme primary color)
  if (variant === "pills") {
    return (
      <div
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === value;
          const Icon = tab.icon;

          return (
            <button
              key={String(tab.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all whitespace-nowrap select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                fullWidth ? "flex-1" : ""
              } ${sz.btn} ${
                isActive
                  ? activeClassName || THEME_CONFIG.classes.chipActive
                  : inactiveClassName || THEME_CONFIG.classes.chipInactive
              } ${itemClassName}`}
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
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full font-bold leading-none ${sz.badge} ${
                    isActive
                      ? THEME_CONFIG.classes.chipCountActive
                      : THEME_CONFIG.classes.chipCountInactive
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 3. UNDERLINE VARIANT
  return (
    <div
      className={`flex items-center border-b border-slate-200 overflow-x-auto no-scrollbar ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      role="tablist"
    >
      {items.map((tab) => {
        const isActive = tab.id === value;
        const Icon = tab.icon;

        return (
          <button
            key={String(tab.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center gap-2 border-b-2 font-semibold transition-colors whitespace-nowrap select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              fullWidth ? "flex-1" : ""
            } ${sz.btn} ${
              isActive
                ? "border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            } ${itemClassName}`}
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
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`rounded-full font-bold leading-none ${sz.badge} ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
