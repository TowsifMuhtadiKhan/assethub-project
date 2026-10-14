import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  Fuel,
} from "lucide-react";
import type { VehicleExpense } from "../../types";

type FuelTrendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fuelExpenses: VehicleExpense[];
  vehicleName?: string;
  vehicleReg?: string;
};

// Generate distinct badge colors for percentages matching the screenshot
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

export function FuelTrendModal({
  isOpen,
  onClose,
  fuelExpenses,
  vehicleName,
  vehicleReg,
}: FuelTrendModalProps) {
  const [selectedFuelType, setSelectedFuelType] = useState<string>("all");

  // Selected Year & Month (0-11)
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());

  // Distinct fuel types present in the vehicle's records
  const availableFuelTypes = useMemo(() => {
    const set = new Set<string>();
    fuelExpenses.forEach((exp) => {
      if (exp.fuelType) set.add(exp.fuelType);
    });
    return Array.from(set);
  }, [fuelExpenses]);

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

  // Filter fuel expenses by fuel type if selected
  const filteredExpenses = useMemo(() => {
    if (selectedFuelType === "all") return fuelExpenses;
    return fuelExpenses.filter((e) => e.fuelType === selectedFuelType);
  }, [fuelExpenses, selectedFuelType]);

  // Compute spend and liters for each of the 7 months in monthList
  const trendPoints = useMemo(() => {
    return monthList.map((m) => {
      let totalCost = 0;
      let totalLiters = 0;
      filteredExpenses.forEach((exp) => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === m.year && expDate.getMonth() === m.month) {
          totalCost += Number(exp.amount || 0);
          totalLiters += Number(exp.fuelLiters || 0);
        }
      });
      return {
        ...m,
        total: totalCost,
        liters: totalLiters,
      };
    });
  }, [monthList, filteredExpenses]);

  // Current month total
  const currentMonthPoint = trendPoints.find((p) => p.isSelected) || trendPoints[4];
  const currentTotal = currentMonthPoint?.total || 0;
  const currentLiters = currentMonthPoint?.liters || 0;

  // Previous month total
  const prevMonthIndex = trendPoints.findIndex((p) => p.isSelected) - 1;
  const prevMonthPoint = prevMonthIndex >= 0 ? trendPoints[prevMonthIndex] : null;
  const prevTotal = prevMonthPoint ? prevMonthPoint.total : 0;

  // Month-over-Month Differentiation
  const diffAmount = currentTotal - prevTotal;
  const diffPercent = prevTotal > 0 ? (diffAmount / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

  // Sub-item breakdown for the currently selected month
  const currentMonthExpenses = useMemo(() => {
    return filteredExpenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getFullYear() === viewYear && expDate.getMonth() === viewMonth;
    });
  }, [filteredExpenses, viewYear, viewMonth]);

  // Group by Fuel Station / Pump or Fuel Type
  const subItemBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; liters: number }> = {};
    for (const exp of currentMonthExpenses) {
      const station = (exp.fuelStation || exp.description || "General Fuel Pump").trim();
      const key = exp.fuelType ? `${station} (${exp.fuelType})` : station;
      if (!map[key]) {
        map[key] = { amount: 0, liters: 0 };
      }
      map[key].amount += Number(exp.amount || 0);
      map[key].liters += Number(exp.fuelLiters || 0);
    }

    const items = Object.entries(map).map(([name, data]) => {
      const pct = currentTotal > 0 ? (data.amount / currentTotal) * 100 : 0;
      return {
        name,
        amount: data.amount,
        liters: data.liters,
        percent: Math.round(pct),
        exactPercent: pct,
      };
    });

    items.sort((a, b) => b.amount - a.amount);
    return items;
  }, [currentMonthExpenses, currentTotal]);

  // SVG Chart Dimensions & Coordinates
  const chartHeight = 150;
  const chartWidth = 360;
  const paddingX = 26;
  const paddingY = 28;

  const maxVal = useMemo(() => {
    const max = Math.max(...trendPoints.map((p) => p.total), 0);
    return max > 0 ? max * 1.25 : 100;
  }, [trendPoints]);

  const coords = useMemo(() => {
    const step = (chartWidth - paddingX * 2) / (trendPoints.length - 1);
    return trendPoints.map((p, idx) => {
      const x = paddingX + idx * step;
      const normalized = p.total / maxVal;
      const y = chartHeight - paddingY - normalized * (chartHeight - paddingY * 2);
      return { x, y, ...p };
    });
  }, [trendPoints, maxVal, chartHeight, chartWidth, paddingX, paddingY]);

  // SVG Path (Polyline or Smooth Bezier Curve)
  const pathD = useMemo(() => {
    if (coords.length < 2) return "";
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [coords]);

  const selectedMonthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-[#0b1120] border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top App-Bar Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Fuel Type Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedFuelType}
              onChange={(e) => setSelectedFuelType(e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-700/90 text-white font-bold text-xs px-3 py-1.5 pr-7 rounded-xl border border-slate-700 outline-none transition cursor-pointer text-center"
            >
              <option value="all">⛽ All Fuel & Gas</option>
              {availableFuelTypes.map((ft) => (
                <option key={ft} value={ft}>
                  ⛽ {ft}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vehicle Subtitle Badge */}
        {vehicleName && (
          <div className="px-5 pt-2 pb-1 text-center">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/50 px-2.5 py-0.5 rounded-full border border-slate-700/60">
              {vehicleName} {vehicleReg ? `• ${vehicleReg}` : ""}
            </span>
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {/* Month Selector: < October 2026 > */}
          <div className="flex items-center justify-center gap-3 py-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-bold tracking-wide text-white min-w-[130px] text-center">
              {selectedMonthName} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* SVG 7-Month Trend Chart */}
          <div className="relative rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3 pt-4">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Highlight Column for Selected Month */}
              {coords.map((c) => {
                if (!c.isSelected) return null;
                return (
                  <rect
                    key="highlight-bg"
                    x={c.x - 16}
                    y={10}
                    width={32}
                    height={chartHeight - 32}
                    fill="#a3e635"
                    fillOpacity="0.08"
                    rx={8}
                  />
                );
              })}

              {/* Lime Glow Curve Gradient */}
              <defs>
                <linearGradient id="fuelLimeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area under curve */}
              {coords.length >= 2 && (
                <path
                  d={`${pathD} L ${coords[coords.length - 1].x} ${chartHeight - paddingY} L ${
                    coords[0].x
                  } ${chartHeight - paddingY} Z`}
                  fill="url(#fuelLimeGlow)"
                />
              )}

              {/* Neon Lime Curve Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#a3e635"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & Value labels */}
              {coords.map((c, i) => {
                return (
                  <g key={i}>
                    {/* Value above point */}
                    {c.total > 0 && (
                      <text
                        x={c.x}
                        y={Math.max(c.y - 10, 14)}
                        textAnchor="middle"
                        className={`text-[10px] font-mono font-bold ${
                          c.isSelected ? "fill-lime-400" : "fill-slate-400"
                        }`}
                      >
                        ৳{c.total >= 1000 ? `${(c.total / 1000).toFixed(1)}k` : c.total}
                      </text>
                    )}

                    {/* Outer glow circle for selected month */}
                    {c.isSelected && (
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r="8"
                        fill="#a3e635"
                        fillOpacity="0.25"
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={c.isSelected ? "5" : "3.5"}
                      fill={c.isSelected ? "#a3e635" : "#0b1120"}
                      stroke="#a3e635"
                      strokeWidth="2.5"
                    />

                    {/* Month Label */}
                    <text
                      x={c.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className={`text-[10px] font-semibold transition ${
                        c.isSelected
                          ? "fill-lime-400 font-bold"
                          : "fill-slate-500"
                      }`}
                    >
                      {c.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Month-over-Month Comparison Banner */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Compare with Last Month
            </div>

            <div className="flex items-center gap-2">
              {diffAmount < 0 ? (
                <>
                  <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-emerald-400">
                      ৳{Math.abs(diffAmount).toLocaleString()} less
                    </span>
                    <span className="text-xs text-emerald-300/80 ml-1.5 font-mono">
                      (-{Math.abs(Math.round(diffPercent))}%)
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      than {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-US", { month: "short" })} (৳{prevTotal.toLocaleString()})
                    </span>
                  </div>
                </>
              ) : diffAmount > 0 ? (
                <>
                  <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-amber-400">
                      +৳{diffAmount.toLocaleString()} more
                    </span>
                    <span className="text-xs text-amber-300/80 ml-1.5 font-mono">
                      (+{Math.round(diffPercent)}%)
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      than {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-US", { month: "short" })} (৳{prevTotal.toLocaleString()})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                    <Minus className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-slate-400">
                    Same fuel spend as last month (৳{currentTotal.toLocaleString()})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Current Category / Month Total Pill */}
          <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
                <Fuel className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedFuelType === "all" ? "Total Fuel & Gas" : selectedFuelType}
                </span>
                {currentLiters > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {currentLiters.toFixed(1)} Liters logged
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-extrabold text-lime-400 block">
                ৳ {currentTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">
                {currentMonthExpenses.length} {currentMonthExpenses.length === 1 ? "refill" : "refills"}
              </span>
            </div>
          </div>

          {/* Sub-item Percentage Breakdown Section */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pump & Fuel Breakdown ({selectedMonthName})
            </div>

            {subItemBreakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/60">
                No fuel purchases logged in {selectedMonthName} {viewYear}.
              </div>
            ) : (
              <div className="space-y-2">
                {subItemBreakdown.map((item, idx) => {
                  const badgeColor = getPercentageBadgeColor(idx);
                  return (
                    <div
                      key={item.name}
                      className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Percentage Badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 ${badgeColor}`}
                          >
                            {item.percent}%
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {item.name}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-slate-100">
                            ৳{item.amount.toLocaleString()}
                          </span>
                          {item.liters > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {item.liters.toFixed(1)} L
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-lime-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(item.exactPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {currentMonthExpenses.length} entries in {selectedMonthName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
