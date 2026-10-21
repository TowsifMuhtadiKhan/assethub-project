import React, { useState } from "react";
import {
  Columns,
  Filter,
  AlignJustify,
  Search,
  MoreVertical,
} from "lucide-react";

export interface UiTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface UiTableProps<T> {
  columns: UiTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onFilterClick?: () => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function UiTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = "Search...",
  onSearch,
  onFilterClick,
  emptyState,
  className = "",
}: UiTableProps<T>) {
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<"compact" | "normal" | "relaxed">("normal");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  const densityPadding = {
    compact: "py-2 px-3 text-xs",
    normal: "py-3 px-4 text-xs",
    relaxed: "py-4 px-5 text-sm",
  }[density];

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}>
      {/* Table Action Toolbar (Matching Screenshot 2 & 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-b border-slate-200/80 bg-slate-50/50">
        {/* Left Toolbar: Columns, Filters, Density */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Toggle Columns"
          >
            <Columns className="h-3.5 w-3.5 text-slate-500" />
            <span>Columns</span>
          </button>

          <button
            type="button"
            onClick={onFilterClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Filter Data"
          >
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDensity((prev) =>
                prev === "normal" ? "compact" : prev === "compact" ? "relaxed" : "normal"
              );
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title={`Toggle Row Spacing (Current: ${density})`}
          >
            <AlignJustify className="h-3.5 w-3.5 text-slate-500" />
            <span>Density</span>
          </button>
        </div>

        {/* Right Toolbar: Search Input */}
        <div className="relative min-w-[220px] max-w-xs w-full sm:w-auto">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 transition"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="py-2.5 px-4 font-semibold" style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {data.length > 0 ? (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/80 transition-colors group cursor-default"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={densityPadding}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-16 text-center">
                  {emptyState || (
                    <div className="text-xs text-slate-500">No records found.</div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Record count */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/40 text-[11px] font-medium text-slate-500 flex items-center justify-between">
        <span>Showing {data.length} out of {data.length} Records</span>
      </div>
    </div>
  );
}
