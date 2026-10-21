import React from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";

export interface UiPageHeaderProps {
  title: string;
  subtitle?: string;
  countBadge?: string | number;
  helpTooltip?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function UiPageHeader({
  title,
  subtitle,
  countBadge,
  helpTooltip,
  onBack,
  actions,
  className = "",
}: UiPageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer mt-0.5"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">{title}</h1>
            {helpTooltip && (
              <span
                className="cursor-help text-slate-400 hover:text-slate-600 transition"
                title={helpTooltip}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            )}
            {countBadge !== undefined && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {countBadge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">{actions}</div>
      )}
    </div>
  );
}
