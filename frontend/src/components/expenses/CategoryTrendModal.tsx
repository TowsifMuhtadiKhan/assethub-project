import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import type { DailyExpense } from "../../types";

type CategoryTrendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string; // e.g. "Transport & Commute", "Food & Dining", or "all"
  allExpenses: DailyExpense[];
  availableCategories: string[];
};

// Emoji / icon helper for standard & custom categories
export function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("transport") || lower.includes("car") || lower.includes("ride") || lower.includes("bike")) return "🚕";
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("lunch")) return "🍔";
  if (lower.includes("grocer") || lower.includes("market") || lower.includes("bazaar") || lower.includes("shwapno")) return "🛒";
  if (lower.includes("shop") || lower.includes("cloth") || lower.includes("personal")) return "🛍️";
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electric") || lower.includes("gas") || lower.includes("wifi")) return "💡";
  if (lower.includes("health") || lower.includes("medic") || lower.includes("doctor") || lower.includes("pharma")) return "💊";
  if (lower.includes("edu") || lower.includes("school") || lower.includes("tuition") || lower.includes("college")) return "🎓";
  if (lower.includes("entert") || lower.includes("movie") || lower.includes("fun") || lower.includes("game")) return "🍿";
  if (lower.includes("family") || lower.includes("home") || lower.includes("house")) return "🏡";
  if (lower.includes("loan") || lower.includes("emi") || lower.includes("debt")) return "💳";
  if (lower.includes("dps") || lower.includes("saving") || lower.includes("deposit")) return "🏦";
  if (lower.includes("pet")) return "🐾";
  if (lower.includes("gym") || lower.includes("fit")) return "🏋️";
  if (lower.includes("charity") || lower.includes("donat")) return "🤲";
  return "🏷️";
}

// Generate pastel / distinct badge colors for percentages matching the screenshot
function getPercentageBadgeColor(index: number) {
  const colors = [
    "bg-rose-500/90 text-white", // 69% - salmon/rose
    "bg-amber-500/90 text-white", // 17% - orange
    "bg-yellow-500/90 text-slate-900 font-bold", // 14% - yellow
    "bg-emerald-500/80 text-white",
    "bg-sky-500/80 text-white",
    "bg-purple-500/80 text-white",
    "bg-indigo-500/80 text-white",
  ];
  return colors[index % colors.length];
}

export function CategoryTrendModal({
  isOpen,
  onClose,
  initialCategory = "all",
  allExpenses,
  availableCategories,
}: CategoryTrendModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");

  // Selected Year & Month (0-11)
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());

  // Keep in sync when initialCategory changes
  React.useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

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

  // 7-month trend calculation centered around the selected month (e.g. 4 months before, selected month, 2 months after)
  const monthList = useMemo(() => {
    const list: { label: string; year: number; month: number; isSelected: boolean }[] = [];
    // 4 months before viewMonth, selected month, and 2 months after
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

  // Expenses for the selected category (or all)
  const categoryExpenses = useMemo(() => {
    if (selectedCategory === "all") return allExpenses;
    return allExpenses.filter((e) => e.category === selectedCategory);
  }, [allExpenses, selectedCategory]);

  // Compute spend for each of the 7 months in monthList
  const trendPoints = useMemo(() => {
    return monthList.map((m) => {
      const total = categoryExpenses.reduce((sum, exp) => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === m.year && expDate.getMonth() === m.month) {
          return sum + Number(exp.amount);
        }
        return sum;
      }, 0);
      return {
        ...m,
        total,
      };
    });
  }, [monthList, categoryExpenses]);

  // Current month total
  const currentMonthPoint = trendPoints.find((p) => p.isSelected) || trendPoints[4];
  const currentTotal = currentMonthPoint?.total || 0;

  // Previous month total
  const prevMonthIndex = trendPoints.findIndex((p) => p.isSelected) - 1;
  const prevMonthPoint = prevMonthIndex >= 0 ? trendPoints[prevMonthIndex] : null;
  const prevTotal = prevMonthPoint ? prevMonthPoint.total : 0;

  // Month-over-Month Differentiation
  const diffAmount = currentTotal - prevTotal;
  const diffPercent = prevTotal > 0 ? (diffAmount / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

  // Sub-item breakdown for the currently selected month
  const currentMonthExpenses = useMemo(() => {
    return categoryExpenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getFullYear() === viewYear && expDate.getMonth() === viewMonth;
    });
  }, [categoryExpenses, viewYear, viewMonth]);

  // Group by item description or merchant
  const subItemBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of currentMonthExpenses) {
      // Prioritize merchant if exists, else description
      const key = (exp.merchant || exp.description || "General").trim();
      map[key] = (map[key] || 0) + Number(exp.amount);
    }

    const items = Object.entries(map).map(([name, amount]) => {
      const pct = currentTotal > 0 ? (amount / currentTotal) * 100 : 0;
      return {
        name,
        amount,
        percent: Math.round(pct),
        exactPercent: pct,
      };
    });

    // Sort descending by amount
    items.sort((a, b) => b.amount - a.amount);
    return items;
  }, [currentMonthExpenses, currentTotal]);

  // SVG Chart Dimensions & Coordinates
  const chartHeight = 150;
  const chartWidth = 360;
  const paddingX = 28;
  const paddingTop = 28;
  const paddingBottom = 26;

  const maxSpend = Math.max(...trendPoints.map((p) => p.total), 100);

  const getCoordinates = (index: number, total: number) => {
    const x = paddingX + (index / (trendPoints.length - 1)) * (chartWidth - paddingX * 2);
    // Inverted Y: 0 total at bottom, maxSpend near top
    const availableHeight = chartHeight - paddingTop - paddingBottom;
    const y = chartHeight - paddingBottom - (total / maxSpend) * availableHeight;
    return { x, y };
  };

  const pointsCoordinates = trendPoints.map((p, i) => ({
    ...p,
    ...getCoordinates(i, p.total),
  }));

  // SVG Path generator (straight polyline or subtle curved)
  const pathD = pointsCoordinates.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  // Area under line
  const areaD = `${pathD} L ${pointsCoordinates[pointsCoordinates.length - 1].x} ${chartHeight - paddingBottom} L ${pointsCoordinates[0].x} ${chartHeight - paddingBottom} Z`;

  const selectedMonthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const categoryTitle = selectedCategory === "all" ? "All Expenses" : selectedCategory;
  const categoryEmoji = selectedCategory === "all" ? "📊" : getCategoryEmoji(selectedCategory);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#121316] text-white shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & NAVIGATION                                                */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#16171b]">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer select-none active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Category Dropdown Picker */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base">{categoryEmoji}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">
                All Expenses
              </option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. MONTH SELECTOR (< Oct 2026 >)                                          */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#121316] border-b border-slate-800/50">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer active:scale-90"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-bold tracking-wide text-slate-200">
            {selectedMonthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer active:scale-90"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {/* ========================================================================= */}
          {/* 3. NEON LIME TREND GRAPH (DARK MODE)                                      */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-[#191b20] border border-slate-800/80 p-2.5 pt-4 relative overflow-hidden shadow-inner">
            {/* Subtle background grid pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#bef264" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#bef264" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path d={areaD} fill="url(#neonGradient)" />

              {/* Connecting line */}
              <path
                d={pathD}
                fill="none"
                stroke="#bef264"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points & Value Labels */}
              {pointsCoordinates.map((pt, i) => {
                const isCurrent = pt.isSelected;
                return (
                  <g key={i}>
                    {/* Amount label above the dot */}
                    <text
                      x={pt.x}
                      y={Math.max(pt.y - 8, 12)}
                      textAnchor="middle"
                      fill={isCurrent ? "#bef264" : "#94a3b8"}
                      fontSize={isCurrent ? "10.5" : "9"}
                      fontWeight={isCurrent ? "bold" : "normal"}
                      fontFamily="monospace"
                    >
                      {pt.total > 0 ? pt.total.toLocaleString() : "0.00"}
                    </text>

                    {/* Dot */}
                    {isCurrent && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="6"
                        fill="#bef264"
                        opacity="0.35"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isCurrent ? "4.5" : "3.5"}
                      fill={isCurrent ? "#bef264" : "#f8fafc"}
                      stroke="#121316"
                      strokeWidth="1.5"
                    />

                    {/* Month Label on X axis */}
                    <text
                      x={pt.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fill={isCurrent ? "#fb923c" : "#64748b"}
                      fontSize="9.5"
                      fontWeight={isCurrent ? "bold" : "normal"}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ========================================================================= */}
          {/* 4. DIFFERENTIATION FROM LAST MONTH (User's Exact Request)                 */}
          {/* ========================================================================= */}
          <div className="rounded-2xl p-3.5 bg-[#181a1f] border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Compare with Last Month
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {diffAmount < 0 ? (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                      <ArrowDownRight className="h-4 w-4 shrink-0 text-emerald-400" />
                      ৳{Math.abs(diffAmount).toLocaleString()} less
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {Math.abs(diffPercent).toFixed(1)}% drop
                    </span>
                  </>
                ) : diffAmount > 0 ? (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-rose-400 font-mono">
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-400" />
                      +৳{diffAmount.toLocaleString()} more
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      +{diffPercent.toFixed(1)}% jump
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-slate-300 font-mono">
                      <Minus className="h-4 w-4 text-slate-400" />
                      Same as last month
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[10px]">
                      0% change
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400">Prior Month Spent</div>
              <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                ৳{prevTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. CATEGORY TOTAL ROW (e.g. 🚕 Transport ৳ 2,100.00)                      */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1d1f26] border border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryEmoji}</span>
              <span className="text-xs font-bold text-slate-100">{categoryTitle}</span>
            </div>
            <div className="font-mono text-base font-black text-white">
              ৳ {currentTotal.toLocaleString()}.00
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. SUB-ITEM PERCENTAGE BREAKDOWN (Pathao, Rickshaw, CNG, etc.)            */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            <div className="px-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Item & Merchant Breakdown</span>
              <span>{subItemBreakdown.length} sub-items</span>
            </div>

            {subItemBreakdown.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#16171b] border border-slate-800 text-slate-400 text-xs">
                No recorded expenses for this category in {selectedMonthName}.
              </div>
            ) : (
              subItemBreakdown.map((item, idx) => {
                const badgeColor = getPercentageBadgeColor(idx);
                return (
                  <div
                    key={item.name}
                    className="group relative flex items-center justify-between p-3 rounded-xl bg-[#181a1f] hover:bg-[#20222a] border border-slate-800/80 transition"
                  >
                    {/* Background mini progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-800/40 rounded-xl pointer-events-none transition-all duration-300"
                      style={{ width: `${Math.min(item.exactPercent, 100)}%` }}
                    />

                    {/* Left: Percentage pill & item name */}
                    <div className="relative flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center min-w-[42px] px-2 py-0.5 rounded text-[11px] font-mono leading-none ${badgeColor}`}
                      >
                        {item.percent}%
                      </span>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {item.name}
                      </span>
                    </div>

                    {/* Right: Amount */}
                    <div className="relative font-mono text-xs font-bold text-slate-100">
                      ৳ {item.amount.toLocaleString()}.00
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Bottom Close Button */}
        <div className="p-3 border-t border-slate-800/80 bg-[#141518]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
          >
            Close Trend View
          </button>
        </div>
      </div>
    </div>
  );
}
