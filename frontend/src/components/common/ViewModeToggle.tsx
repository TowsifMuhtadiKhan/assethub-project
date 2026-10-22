import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list" | "table";

export interface ViewModeToggleProps<T extends ViewMode = ViewMode> {
  viewMode: T;
  onChange: (mode: T) => void;
  gridLabel?: string;
  listLabel?: string;
  listValue?: T;
  className?: string;
}

export function ViewModeToggle<T extends ViewMode = "grid" | "list">({
  viewMode,
  onChange,
  gridLabel = "Grid",
  listLabel = "List",
  listValue,
  className = "",
}: ViewModeToggleProps<T>) {
  const targetListVal = (listValue || (listLabel.toLowerCase() === "table" ? "table" : "list")) as T;
  const isGrid = viewMode === "grid";
  const isList = viewMode === targetListVal || (!isGrid && (viewMode === "list" || viewMode === "table"));

  return (
    <div
      className={`flex items-center p-0.5 rounded-xl border border-slate-200/90 bg-slate-100/90 shrink-0 shadow-2xs ${className}`}
      role="group"
      aria-label="View mode toggle"
    >
      <button
        type="button"
        onClick={() => onChange("grid" as T)}
        aria-pressed={isGrid}
        className={`flex items-center justify-center rounded-lg p-1.5 transition cursor-pointer select-none ${
          isGrid
            ? "bg-white text-[#064e3b] shadow-2xs font-bold ring-1 ring-emerald-500/15"
            : "text-slate-400 hover:text-slate-700"
        }`}
        title={`${gridLabel} view`}
        aria-label={`${gridLabel} view`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onChange(targetListVal)}
        aria-pressed={isList}
        className={`flex items-center justify-center rounded-lg p-1.5 transition cursor-pointer select-none ${
          isList
            ? "bg-white text-[#064e3b] shadow-2xs font-bold ring-1 ring-emerald-500/15"
            : "text-slate-400 hover:text-slate-700"
        }`}
        title={`${listLabel} view`}
        aria-label={`${listLabel} view`}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
