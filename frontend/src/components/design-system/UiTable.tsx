import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Columns,
  Filter,
  AlignJustify,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

export interface UiTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  className?: string;
}

export type Column<T> = UiTableColumn<T>;

export interface UiTableProps<T> {
  columns: UiTableColumn<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  keyField?: keyof T | ((row: T) => string);
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
  onFilterClick?: () => void;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  // Dynamic Height
  fullHeight?: boolean;
  minHeight?: string;
  // Pagination
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  // Row Actions
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  // Custom toolbar extension slots
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function UiTable<T>({
  columns,
  data,
  keyExtractor,
  keyField,
  searchPlaceholder = "Search by name, email, or role...",
  searchValue,
  onSearch,
  showSearch = true,
  onFilterClick,
  emptyState,
  emptyMessage,
  className = "",
  fullHeight = false,
  minHeight = "",
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [8, 10, 15, 25, 50],
  rowActions,
  onRowClick,
  leftActions,
  rightActions,
}: UiTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const [density, setDensity] = useState<"compact" | "normal" | "relaxed">("normal");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Record<string, boolean>>({});
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const effectiveKeyExtractor = useMemo(() => {
    if (keyExtractor) return keyExtractor;
    if (typeof keyField === "function") return keyField;
    if (keyField) return (row: T) => String((row as any)[keyField]);
    return (row: any) => String(row.id ?? row.key ?? Math.random());
  }, [keyExtractor, keyField]);

  // Close columns dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setColumnsMenuOpen(false);
      }
    }
    if (columnsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [columnsMenuOpen]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    setCurrentPage(1);
    onSearch?.(val);
  };

  // Filter columns based on user column visibility
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColumnKeys[col.key]);
  }, [columns, hiddenColumnKeys]);

  const toggleColumnVisibility = (key: string) => {
    setHiddenColumnKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If onSearch is not provided externally, perform internal client filtering
  const effectiveQuery = searchValue !== undefined ? searchValue : internalSearch;
  const filteredData = useMemo(() => {
    if (onSearch || !effectiveQuery.trim()) return data;
    const q = effectiveQuery.toLowerCase();
    return data.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, effectiveQuery, onSearch]);

  // Pagination calculation
  const totalRecords = filteredData.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRecords / pageSize)) : 1;

  // Ensure currentPage is valid if data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pagination, currentPage, pageSize]);

  const densityPadding = {
    compact: "py-2 px-3 text-xs",
    normal: "py-3 px-4 text-xs",
    relaxed: "py-4 px-5 text-sm",
  }[density];

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col ${
        fullHeight ? "flex-1 min-h-[calc(100vh-270px)]" : minHeight
      } w-full overflow-hidden ${className}`}
    >
      {/* Table Action Toolbar (Unified Enterprise Toolbar) */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 border-b border-slate-200/80 bg-slate-50/50">
        {/* Left Toolbar: Columns, Filters, Density + Left Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-2.5 min-w-0 w-full md:w-auto">
          {/* Row 1 on mobile: Columns & Density buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Columns Toggle Dropdown */}
            <div className="relative" ref={columnsMenuRef}>
              <button
                type="button"
                onClick={() => setColumnsMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                title="Toggle Columns"
              >
                <Columns className="h-3.5 w-3.5 text-slate-500" />
                <span>Columns</span>
              </button>

              {columnsMenuOpen && (
                <div className="absolute left-0 top-9 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-100 mb-1">
                    Toggle Columns
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {columns.map((col) => {
                      const isVisible = !hiddenColumnKeys[col.key];
                      return (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => toggleColumnVisibility(col.key)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition text-left cursor-pointer"
                        >
                          <span className="truncate">{col.header}</span>
                          {isVisible && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Filters Button */}
            {onFilterClick && (
              <button
                type="button"
                onClick={onFilterClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                title="Filter Data"
              >
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span>Filters</span>
              </button>
            )}

            {/* Density Toggle Button */}
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

          {/* Row 2 on mobile, inline on desktop: Left Actions */}
          {leftActions && (
            <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {leftActions}
            </div>
          )}
        </div>

        {/* Right Toolbar: Search Input + Right Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto shrink-0">
          {showSearch && (
            <div className="relative w-full sm:w-auto md:w-56 lg:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={effectiveQuery}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition"
              />
            </div>
          )}
          {rightActions && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {rightActions}
            </div>
          )}
        </div>
      </div>

      {/* Main Table Body - Expands vertically to fill available space */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200/80 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-4 font-semibold ${col.className || ""}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="py-2.5 px-3 text-right font-semibold w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr
                  key={effectiveKeyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-slate-50/80 transition-colors group ${
                    onRowClick ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {visibleColumns.map((col) => (
                    <td key={col.key} className={`${densityPadding} ${col.className || ""}`}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length + (rowActions ? 1 : 0)} className="py-20 text-center">
                  {emptyState || (
                    <div className="text-xs text-slate-500 font-medium">
                      {emptyMessage || "No records found."}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Record count & Pagination (Pinned at bottom) */}
      <div className="mt-auto shrink-0 p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] font-medium text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Record count info */}
        <div>
          Showing {totalRecords === 0 ? "0" : `${startRecord} to ${endRecord}`} out of {totalRecords} Records
        </div>

        {/* Pagination controls */}
        {pagination && totalRecords > 0 && (
          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Navigation Buttons */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {pageNumbers.map((p, idx) =>
                typeof p === "number" ? (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      currentPage === p
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                )
              )}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
