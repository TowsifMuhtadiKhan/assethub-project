import React, { useState } from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";

export interface UiPageHeaderProps {
  title: string;
  subtitle?: string;
  countBadge?: string | number;
  helpTooltip?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  sticky?: boolean;
  bgClassName?: string;
  className?: string;
  tabs?: React.ReactNode;
  leftSlot?: React.ReactNode;
  flush?: boolean;
}

export function UiPageHeader({
  title,
  subtitle,
  countBadge,
  helpTooltip,
  onBack,
  actions,
  sticky = true,
  bgClassName = "bg-white",
  className = "",
  tabs,
  leftSlot,
  flush = true,
}: UiPageHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const flushClasses = flush
    ? "-mx-3.5 sm:-mx-5 lg:-mx-6 -mt-3.5 sm:-mt-5 lg:-mt-6 w-[calc(100%+1.75rem)] sm:w-[calc(100%+2.5rem)] lg:w-[calc(100%+3rem)] mb-4"
    : "w-full";

  return (
    <div
      className={`${flushClasses} transition-all ${
        sticky
          ? `sticky top-0 z-20 ${bgClassName} border-b border-slate-200/90 shadow-2xs`
          : `${bgClassName} border-b border-slate-200/80`
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5">
        {/* Left: Optional LeftSlot / Back + Title + Tooltip + Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {leftSlot}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap relative">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                {title}
              </h1>

              {helpTooltip && (
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip((prev) => !prev)}
                    className="cursor-help text-slate-400 hover:text-slate-600 transition p-0.5 rounded-full hover:bg-slate-100"
                    aria-label="More information"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {showTooltip && (
                    <div className="absolute left-6 top-0 z-50 w-72 p-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100 leading-relaxed font-normal">
                      {helpTooltip}
                    </div>
                  )}
                </div>
              )}

              {countBadge !== undefined && (
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {countBadge}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-xs text-slate-500 font-normal mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Optional Embedded Tabs */}
      {tabs && <div className="px-4 sm:px-6 border-t border-slate-100">{tabs}</div>}
    </div>
  );
}
