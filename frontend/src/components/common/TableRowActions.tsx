import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";

export type TableActionItem = {
  label: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger" | "emerald";
  disabled?: boolean;
};

export type TableRowActionsProps = {
  title?: string;
  subtitle?: string;
  actions: TableActionItem[];
  align?: "left" | "right";
  buttonClassName?: string;
};

export function TableRowActions({
  title,
  subtitle,
  actions,
  align = "right",
  buttonClassName = "",
}: TableRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeActions = actions.filter(Boolean);
  if (activeActions.length === 0) return null;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = activeActions.length * 40 + (title ? 48 : 16);

      // If near bottom of viewport, position above the trigger button
      const top =
        spaceBelow < estimatedHeight && rect.top > estimatedHeight
          ? rect.top - estimatedHeight - 4
          : rect.bottom + 4;

      if (align === "left") {
        setCoords({ top, left: Math.max(8, rect.left) });
      } else {
        setCoords({ top, right: Math.max(8, window.innerWidth - rect.right) });
      }
    }
    setIsOpen(true);
  };

  // Close dropdown on window scroll or resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setIsOpen(false);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {/* 3-Dot Action Button Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer select-none ${buttonClassName}`}
        title="More actions"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Floating Anchored Dropdown Menu (Rendered via Portal into body to prevent clipping) */}
      {isOpen &&
        createPortal(
          <>
            {/* Invisible backdrop overlay to capture outside clicks */}
            <div
              className="fixed inset-0 z-50 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            {/* Anchored floating dropdown menu */}
            <div
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                ...(coords.left !== undefined ? { left: `${coords.left}px` } : {}),
                ...(coords.right !== undefined ? { right: `${coords.right}px` } : {}),
              }}
              className="z-50 min-w-[190px] max-w-[260px] rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="px-3 py-1.5 pb-2">
                  <div className="text-xs font-bold text-slate-900 truncate">{title}</div>
                  {subtitle && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </div>
                  )}
                </div>
              )}

              <div className="py-1 space-y-0.5">
                {activeActions.map((action, idx) => {
                  const Icon = action.icon;
                  const isDanger = action.variant === "danger";
                  const isEmerald = action.variant === "emerald";

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={action.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        action.onClick();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDanger
                          ? "text-rose-600 hover:bg-rose-50"
                          : isEmerald
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{action.label}</div>
                        {action.description && (
                          <div className="text-[10px] font-normal text-slate-400 truncate leading-tight mt-0.5">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export default TableRowActions;
