import React, { useEffect } from "react";
import { X, RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, type LucideIcon } from "lucide-react";
import { THEME_CONFIG } from "../../theme/theme";

export type ConfirmationModalVariant = "primary" | "danger" | "warning" | "success";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationModalVariant;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  disableBackdropDismiss?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  icon: CustomIcon,
  isLoading = false,
  children,
  size = "md",
  disableBackdropDismiss = false,
}: ConfirmationModalProps) {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Variant design specs
  const variantMap = {
    primary: {
      icon: CustomIcon || HelpCircle,
      iconContainer: "bg-emerald-50 border-emerald-200 text-emerald-800",
      btnConfirm: THEME_CONFIG.classes.btnPrimary,
    },
    danger: {
      icon: CustomIcon || AlertCircle,
      iconContainer: "bg-rose-50 border-rose-200 text-rose-600",
      btnConfirm: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
    },
    warning: {
      icon: CustomIcon || AlertTriangle,
      iconContainer: "bg-amber-50 border-amber-200 text-amber-700",
      btnConfirm: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs",
    },
    success: {
      icon: CustomIcon || CheckCircle2,
      iconContainer: "bg-emerald-50 border-emerald-200 text-emerald-700",
      btnConfirm: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
    },
  };

  const currentVariant = variantMap[variant] || variantMap.primary;
  const IconComp = currentVariant.icon;

  const sizeClassMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading && !disableBackdropDismiss) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${sizeClassMap[size]} my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl text-slate-800 overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-2xl border flex items-center justify-center shrink-0 ${currentVariant.iconContainer}`}
            >
              {typeof IconComp === "function" ? (
                <IconComp className="w-5 h-5" />
              ) : (
                IconComp
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Optional Custom Content Body */}
        {children && (
          <div className="p-4 sm:p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 ${currentVariant.btnConfirm}`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
