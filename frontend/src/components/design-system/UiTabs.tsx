import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface UiTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pill";
  labelPrefix?: string;
  className?: string;
}

export function UiTabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  labelPrefix,
  className = "",
}: UiTabsProps) {
  if (variant === "pill") {
    return (
      <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        {labelPrefix && (
          <span className="text-xs font-semibold text-slate-500 mr-1">{labelPrefix}</span>
        )}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs gap-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-[#f97316] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Underline variant (as seen in Screenshot 3: Active Users | Invited Users)
  return (
    <div className={`border-b border-slate-200 flex items-center gap-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-2.5 text-xs font-semibold transition relative cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? "text-[#f97316] font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f97316] rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
