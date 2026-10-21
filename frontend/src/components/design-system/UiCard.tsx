import React from "react";
import { HelpCircle } from "lucide-react";

export interface UiCardProps {
  title?: string;
  subtitle?: string;
  helpTooltip?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function UiCard({
  title,
  subtitle,
  helpTooltip,
  actions,
  children,
  className = "",
}: UiCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              {helpTooltip && (
                <span
                  className="cursor-help text-slate-400 hover:text-slate-600 transition"
                  title={helpTooltip}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export interface UiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
}

export function UiInput({
  label,
  required,
  helpText,
  error,
  className = "",
  id,
  ...props
}: UiInputProps) {
  const inputId = id || label.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-white transition outline-none ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
            : "border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] text-rose-600">{error}</p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
}

export interface UiSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  helpText?: string;
  error?: string;
}

export function UiSelect({
  label,
  required,
  options,
  helpText,
  error,
  className = "",
  id,
  ...props
}: UiSelectProps) {
  const selectId = id || label.toLowerCase().replace(/[^a-z0-9]/g, "-");

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <select
        id={selectId}
        className={`w-full rounded-lg border px-3 py-2 text-xs text-slate-900 bg-white transition outline-none cursor-pointer ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
            : "border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20"
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-[11px] text-rose-600">{error}</p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-400">{helpText}</p>
      ) : null}
    </div>
  );
}
