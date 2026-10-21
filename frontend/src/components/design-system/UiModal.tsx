import React from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import { UiButton } from "./UiButton";

export interface UiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  type?: "default" | "warning" | "success" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  children?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function UiModal({
  isOpen,
  onClose,
  title,
  subtitle,
  type = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmLoading = false,
  children,
  maxWidth = "md",
}: UiModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  const iconByType = {
    default: null,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    danger: <AlertTriangle className="h-5 w-5 text-rose-500" />,
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidthClass} bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200`}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {iconByType && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shrink-0">
                {iconByType}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {children && <div className="p-5 text-xs text-slate-600 space-y-3">{children}</div>}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50/70 border-t border-slate-100">
          <UiButton variant="outline" size="sm" onClick={onClose} disabled={confirmLoading}>
            {cancelLabel}
          </UiButton>
          {onConfirm && (
            <UiButton
              variant={type === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              loading={confirmLoading}
            >
              {confirmLabel}
            </UiButton>
          )}
        </div>
      </div>
    </div>
  );
}
