import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  Wrench,
} from "lucide-react";
import type { RentalMaintenance } from "../../types/rentals";
import type { PropertyUnit } from "../../types";

type PropertyMaintenanceTrendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  maintenance: RentalMaintenance[];
  propertyName?: string;
  units?: PropertyUnit[];
};

export function getMaintenanceCategoryEmoji(cat: string): string {
  const l = cat.toLowerCase();
  if (l.includes("plumb") || l.includes("sanitary") || l.includes("water") || l.includes("pipe")) return "🚿";
  if (l.includes("electric") || l.includes("light") || l.includes("wire")) return "⚡";
  if (l.includes("ac") || l.includes("cool") || l.includes("air")) return "❄️";
  if (l.includes("paint")) return "🎨";
  if (l.includes("carpent") || l.includes("wood") || l.includes("door")) return "🪚";
  if (l.includes("mason") || l.includes("brick") || l.includes("tile")) return "🧱";
  if (l.includes("pest")) return "🐜";
  if (l.includes("lift") || l.includes("elevator") || l.includes("generator")) return "🛗";
  if (l.includes("roof") || l.includes("tank")) return "🏠";
  if (l.includes("appliance")) return "🔌";
  return "🔧";
}

function getPercentageBadgeColor(index: number) {
  const colors = [
    "bg-lime-500/90 text-slate-900 font-bold", // lime
    "bg-sky-500/90 text-white font-bold", // sky
    "bg-amber-500/90 text-white font-bold", // amber
    "bg-rose-500/80 text-white font-bold", // rose
    "bg-purple-500/80 text-white font-bold", // purple
    "bg-emerald-500/80 text-white font-bold",
  ];
  return colors[index % colors.length];
}

export function PropertyMaintenanceTrendModal({
  isOpen,
  onClose,
  maintenance,
  propertyName,
  units = [],
}: PropertyMaintenanceTrendModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Selected Year & Month (0-11)
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());

  // Distinct maintenance categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    maintenance.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [maintenance]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // 7-month trend calculation centered around the selected month (4 months before, selected month, 2 months after)
  const monthList = useMemo(() => {
    const list: { label: string; year: number; month: number; isSelected: boolean }[] = [];
    for (let offset = -4; offset <= 2; offset++) {
      const d = new Date(viewYear, viewMonth + offset, 1);
      list.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        isSelected: offset === 0,
      });
    }
    return list;
  }, [viewYear, viewMonth]);

  // Filter maintenance records by category
  const filteredMaintenance = useMemo(() => {
    if (selectedCategory === "all") return maintenance;
    return maintenance.filter((m) => m.category === selectedCategory);
  }, [maintenance, selectedCategory]);

  // Compute spend for each of the 7 months in monthList
  const trendPoints = useMemo(() => {
    return monthList.map((m) => {
      let totalCost = 0;
      let count = 0;
      filteredMaintenance.forEach((rec) => {
        const d = new Date(rec.date);
        if (d.getFullYear() === m.year && d.getMonth() === m.month) {
          totalCost += Number(rec.amount || 0);
          count += 1;
        }
      });
      return {
        ...m,
        total: totalCost,
        count,
      };
    });
  }, [monthList, filteredMaintenance]);

  // Current month total
  const currentMonthPoint = trendPoints.find((p) => p.isSelected) || trendPoints[4];
  const currentTotal = currentMonthPoint?.total || 0;
  const currentCount = currentMonthPoint?.count || 0;

  // Previous month total
  const prevMonthIndex = trendPoints.findIndex((p) => p.isSelected) - 1;
  const prevMonthPoint = prevMonthIndex >= 0 ? trendPoints[prevMonthIndex] : null;
  const prevTotal = prevMonthPoint ? prevMonthPoint.total : 0;

  // Month-over-Month Differentiation
  const diffAmount = currentTotal - prevTotal;
  const diffPercent = prevTotal > 0 ? (diffAmount / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

  // Sub-item breakdown for the currently selected month
  const currentMonthRecords = useMemo(() => {
    return filteredMaintenance.filter((rec) => {
      const d = new Date(rec.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
  }, [filteredMaintenance, viewYear, viewMonth]);

  // Group by category (or vendor if specific category selected)
  const subItemBreakdown = useMemo(() => {
    if (currentMonthRecords.length === 0) return [];

    const map = new Map<string, { total: number; count: number; items: RentalMaintenance[] }>();
    currentMonthRecords.forEach((rec) => {
      const key = selectedCategory === "all" ? (rec.category || "General") : (rec.vendor || rec.description || "Repair Job");
      const existing = map.get(key) || { total: 0, count: 0, items: [] };
      existing.total += Number(rec.amount || 0);
      existing.count += 1;
      existing.items.push(rec);
      map.set(key, existing);
    });

    const totalMonthSpend = currentTotal > 0 ? currentTotal : 1;
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percent: Math.round((data.total / totalMonthSpend) * 100),
        items: data.items,
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthRecords, currentTotal, selectedCategory]);

  // Helper unit name
  const getUnitName = (unitId: string | null) => {
    if (!unitId) return "Building / Common Area";
    const found = units.find((u) => u.id === unitId);
    return found ? `${found.unitNumber}${found.tenantName ? ` (${found.tenantName})` : ""}` : "Unit Space";
  };

  // Build SVG path coordinates for neon curve
  const svgWidth = 420;
  const svgHeight = 110;
  const paddingX = 26;
  const paddingY = 22;

  const maxVal = Math.max(...trendPoints.map((p) => p.total), 1);
  const minVal = 0;

  const points = trendPoints.map((p, idx) => {
    const x = paddingX + (idx / (trendPoints.length - 1)) * (svgWidth - 2 * paddingX);
    const normalized = (p.total - minVal) / (maxVal - minVal || 1);
    const y = svgHeight - paddingY - normalized * (svgHeight - 2 * paddingY);
    return { ...p, x, y };
  });

  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    const cpY2 = point.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
  }, "");

  const selectedMonthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl overflow-hidden my-auto flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Controls / Month Switcher Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold tracking-tight text-white min-w-[125px] text-center font-mono">
              {selectedMonthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-lime-400 cursor-pointer"
            >
              <option value="all">All Maintenance</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[82vh]">
          {/* Header Title with Property Name */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Maintenance & Repair Trends
                </h3>
                {propertyName && (
                  <p className="text-xs text-slate-400 font-medium">
                    {propertyName}
                  </p>
                )}
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
              7-Month Comparison
            </span>
          </div>

          {/* Month-over-Month Differentiation Banner */}
          <div
            className={`rounded-2xl p-3.5 sm:p-4 border flex items-center justify-between gap-3 ${
              diffAmount < 0
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : diffAmount > 0
                ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                : "bg-slate-800/40 border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  diffAmount < 0
                    ? "bg-emerald-500/20 text-emerald-400"
                    : diffAmount > 0
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-slate-700/40 text-slate-400"
                }`}
              >
                {diffAmount < 0 ? (
                  <ArrowDownRight className="h-5 w-5" />
                ) : diffAmount > 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : (
                  <Minus className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold font-mono tracking-tight truncate">
                  {diffAmount < 0 ? (
                    <>৳{Math.abs(diffAmount).toLocaleString()} less (-{Math.abs(diffPercent).toFixed(0)}%)</>
                  ) : diffAmount > 0 ? (
                    <>+৳{diffAmount.toLocaleString()} more (+{diffPercent.toFixed(0)}%)</>
                  ) : (
                    <>Same as last month (৳0)</>
                  )}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5 truncate">
                  compared to previous month ({prevMonthPoint ? `৳${prevTotal.toLocaleString()}` : "৳0"})
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                This Month Total
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-white">
                ৳{currentTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Neon Lime Curve Trend Graph */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Monthly Spending Trajectory
              </span>
              <span className="font-mono text-[11px] text-lime-400 flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-lime-400 inline-block animate-pulse" />
                {selectedCategory === "all" ? "All Categories" : selectedCategory}
              </span>
            </div>

            {/* SVG Trend Line Graph */}
            <div className="relative w-full pt-1">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-32 overflow-visible">
                <defs>
                  <linearGradient id="maintLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="50%" stopColor="#a3e635" />
                    <stop offset="100%" stopColor="#bef264" />
                  </linearGradient>
                  <filter id="maintGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Subtle horizontal baseline */}
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Neon curve */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#maintLineGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#maintGlow)"
                  />
                )}

                {/* Data points with value labels */}
                {points.map((pt) => {
                  return (
                    <g key={`${pt.year}-${pt.month}`}>
                      {/* Vertical highlight indicator line for selected month */}
                      {pt.isSelected && (
                        <line
                          x1={pt.x}
                          y1={pt.y}
                          x2={pt.x}
                          y2={svgHeight - paddingY}
                          stroke="#a3e635"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                          opacity="0.7"
                        />
                      )}

                      {/* Dot circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.isSelected ? 5.5 : 4}
                        fill={pt.isSelected ? "#a3e635" : "#1e293b"}
                        stroke={pt.isSelected ? "#ffffff" : "#a3e635"}
                        strokeWidth={pt.isSelected ? "2.5" : "2"}
                      />

                      {/* Price label above dot */}
                      {pt.total > 0 && (
                        <text
                          x={pt.x}
                          y={pt.y - 9}
                          textAnchor="middle"
                          fill={pt.isSelected ? "#facc15" : "#cbd5e1"}
                          fontSize={pt.isSelected ? "10.5" : "9"}
                          fontWeight={pt.isSelected ? "bold" : "600"}
                          fontFamily="monospace"
                        >
                          ৳{pt.total >= 1000 ? `${(pt.total / 1000).toFixed(pt.total % 1000 === 0 ? 0 : 1)}k` : pt.total}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Month Pills below graph */}
              <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-800/60 mt-1">
                {trendPoints.map((pt) => (
                  <button
                    key={`${pt.year}-${pt.month}`}
                    type="button"
                    onClick={() => {
                      setViewYear(pt.year);
                      setViewMonth(pt.month);
                    }}
                    className={`text-center py-1 px-1.5 sm:px-2 rounded-xl transition cursor-pointer ${
                      pt.isSelected
                        ? "bg-lime-400 text-slate-950 font-bold shadow-md shadow-lime-400/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-[11px] font-mono tracking-tight leading-none">
                      {pt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Month Summary Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 border border-slate-700/80 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{getMaintenanceCategoryEmoji(selectedCategory)}</span>
              <span className="text-xs font-bold text-white">
                {selectedCategory === "all" ? "All Maintenance Jobs" : selectedCategory}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                • {currentCount} service job{currentCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-lime-400">
              ৳ {currentTotal.toLocaleString()}
            </div>
          </div>

          {/* Sub-item Breakdown / Receipts List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {selectedCategory === "all" ? "Category Breakdown" : "Service Records"} ({selectedMonthName})
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                {currentMonthRecords.length} record{currentMonthRecords.length === 1 ? "" : "s"}
              </span>
            </div>

            {subItemBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-6 text-center text-xs text-slate-500 space-y-1">
                <Wrench className="h-6 w-6 text-slate-600 mx-auto" />
                <p>No maintenance expenditures logged for this month.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {subItemBreakdown.map((item, idx) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Percentage Pill */}
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-mono shrink-0 shadow-xs ${getPercentageBadgeColor(
                            idx
                          )}`}
                        >
                          {item.percent}%
                        </span>
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({item.count} job{item.count === 1 ? "" : "s"})
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-white">
                          ৳ {item.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>

                    {/* Detailed item list if category mode */}
                    {item.items.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-900/80 space-y-1">
                        {item.items.map((rec) => (
                          <div
                            key={rec.id}
                            className="flex items-center justify-between text-[11px] text-slate-400 font-mono"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-slate-500">{rec.date}</span>
                              <span className="text-slate-300 truncate max-w-[200px]">
                                {rec.description}
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                • {getUnitName(rec.unit_id)}
                              </span>
                            </div>
                            <span className="text-slate-200 font-bold shrink-0">
                              ৳{rec.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
