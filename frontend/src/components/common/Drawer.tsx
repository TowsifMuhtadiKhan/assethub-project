import React, { useEffect } from "react";
import { X } from "lucide-react";

export type DrawerPosition = "bottom" | "right" | "left";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  position?: DrawerPosition;
  size?: DrawerSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  hideCloseButton?: boolean;
  className?: string;
  disableBackdropDismiss?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  position = "bottom",
  size = "md",
  children,
  footer,
  headerExtra,
  hideCloseButton = false,
  className = "",
  disableBackdropDismiss = false,
}: DrawerProps) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Size styling map
  const sizeMap: Record<DrawerSize, { bottom: string; side: string }> = {
    sm: { bottom: "sm:max-w-sm", side: "sm:max-w-sm" },
    md: { bottom: "sm:max-w-md", side: "sm:max-w-md" },
    lg: { bottom: "sm:max-w-lg", side: "sm:max-w-lg" },
    xl: { bottom: "sm:max-w-2xl", side: "sm:max-w-xl" },
    full: { bottom: "sm:max-w-4xl", side: "sm:max-w-3xl" },
  };

  const sz = sizeMap[size] || sizeMap.md;

  // BOTTOM SHEET (Default for mobile and quick action menus)
  if (position === "bottom") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150 p-0 sm:p-4"
        onClick={() => {
          if (!disableBackdropDismiss) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`w-full ${sz.bottom} rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 bg-white shadow-2xl text-slate-900 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[88vh] flex flex-col overflow-hidden ${className}`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drawer Pull Drag Indicator */}
          <div className="pt-2.5 pb-1 sm:hidden flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
          </div>

          {/* Header */}
          {(title || !hideCloseButton || headerExtra) && (
            <div className="flex items-start justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 shrink-0">
              <div className="min-w-0 pr-2">
                {title && (
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {headerExtra}
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1">
            {children}
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SIDE DRAWER (Right / Left Slide-over)
  const isRight = position === "right";

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isRight ? "justify-end" : "justify-start"
      } bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150`}
      onClick={() => {
        if (!disableBackdropDismiss) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${sz.side} h-full bg-white shadow-2xl border-${
          isRight ? "l" : "r"
        } border-slate-200 text-slate-900 animate-in ${
          isRight ? "slide-in-from-right" : "slide-in-from-left"
        } duration-200 flex flex-col overflow-hidden ${className}`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0 pr-2">
            {title && (
              <h3 className="text-base font-bold text-slate-900 truncate tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Drawer;
