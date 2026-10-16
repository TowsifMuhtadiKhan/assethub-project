import { useState } from "react";
import { MoreVertical, ChevronRight, type LucideIcon } from "lucide-react";
import { Drawer } from "./Drawer";

export type TableActionItem = {
  label: string;
  description?: string;
  icon: LucideIcon;
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
  title = "Actions",
  subtitle,
  actions,
  align = "right",
  buttonClassName = "",
}: TableRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeActions = actions.filter(Boolean);
  if (activeActions.length === 0) return null;

  return (
    <div
      className={`relative inline-block text-${align}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 3-Dot Action Button Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer select-none ${buttonClassName}`}
        title="Open Actions Menu"
        aria-label="Open Actions Menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Action Menu Drawer using centralized common Drawer component */}
      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        subtitle={subtitle}
        position="bottom"
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-xl border border-slate-200/90 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
        }
      >
        {/* Actions List */}
        <div className="space-y-1.5">
          {activeActions.map((action, idx) => {
            const Icon = action.icon;
            const isDanger = action.variant === "danger";
            const isEmerald = action.variant === "emerald";

            return (
              <button
                key={idx}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setIsOpen(false);
                  action.onClick();
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDanger
                    ? "border-rose-100 bg-rose-50/40 text-rose-700 hover:bg-rose-100/70"
                    : isEmerald
                    ? "border-emerald-100 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    isDanger
                      ? "border-rose-200 bg-white text-rose-600"
                      : isEmerald
                      ? "border-emerald-200 bg-white text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {action.label}
                  </div>
                  {action.description && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {action.description}
                    </div>
                  )}
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </Drawer>
    </div>
  );
}

export default TableRowActions;
