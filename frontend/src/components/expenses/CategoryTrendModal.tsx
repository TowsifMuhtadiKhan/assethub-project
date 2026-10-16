import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
} from "lucide-react";
import { FormControl, Select, MenuItem } from "@mui/material";
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

// Generate pastel / distinct badge colors for percentages
function getPercentageBadgeColor(index: number) {
  const colors = [
    "bg-rose-100 text-rose-800 border border-rose-200/80",
    "bg-amber-100 text-amber-800 border border-amber-200/80",
    "bg-teal-100 text-teal-800 border border-teal-200/80",
    "bg-emerald-100 text-emerald-800 border border-emerald-200/80",
    "bg-sky-100 text-sky-800 border border-sky-200/80",
    "bg-purple-100 text-purple-800 border border-purple-200/80",
    "bg-indigo-100 text-indigo-800 border border-indigo-200/80",
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
    const availableHeight = chartHeight - paddingTop - paddingBottom;
    const y = chartHeight - paddingBottom - (total / maxSpend) * availableHeight;
    return { x, y };
  };

  const pointsCoordinates = trendPoints.map((p, i) => ({
    ...p,
    ...getCoordinates(i, p.total),
  }));

  // SVG Path generator
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & NAVIGATION (Light Theme & Proper MUI Dropdown)           */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 bg-slate-50/70 gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer select-none active:scale-95 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Back</span>
          </button>

          {/* Proper MUI Category Dropdown Picker */}
          <div className="flex items-center min-w-0 flex-1 justify-center px-1">
            <FormControl size="small" sx={{ maxWidth: { xs: 200, sm: 260 }, width: "auto" }}>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  const raw = selected === "all" ? "All Expenses" : selected;
                  // For compact display on mobile, give a clean concise title if overly long
                  const shortName =
                    raw === "Loan & EMI Repayment"
                      ? "Loan & EMI"
                      : raw === "DPS & Savings Deposit"
                      ? "DPS & Savings"
                      : raw === "Healthcare & Medicine"
                      ? "Healthcare"
                      : raw === "Transport & Commute"
                      ? "Transport"
                      : raw === "Shopping & Personal"
                      ? "Shopping"
                      : raw === "Groceries & Market"
                      ? "Groceries"
                      : raw;
                  const emoji = selected === "all" ? "📊" : getCategoryEmoji(selected);
                  return (
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden pr-0.5">
                      <span className="shrink-0 text-sm leading-none">{emoji}</span>
                      <span className="truncate text-xs font-bold text-slate-800 tracking-tight leading-none">
                        {shortName}
                      </span>
                    </div>
                  );
                }}
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  borderRadius: "9999px",
                  backgroundColor: "#ffffff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e2e8f0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#059669",
                  },
                  "& .MuiSelect-select": {
                    py: "4px",
                    pl: "10px",
                    pr: "28px !important",
                    display: "flex",
                    alignItems: "center",
                    minWidth: 0,
                    overflow: "hidden",
                  },
                  "& .MuiSelect-icon": {
                    right: "6px",
                    color: "#64748b",
                    fontSize: "1.1rem",
                  },
                }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                  <span className="mr-2">📊</span> All Expenses
                </MenuItem>
                {availableCategories.map((cat) => (
                  <MenuItem key={cat} value={cat} sx={{ fontSize: "0.8125rem" }}>
                    <span className="mr-2">{getCategoryEmoji(cat)}</span> {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. MONTH SELECTOR (< Oct 2026 >)                                          */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-100">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer active:scale-90"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-bold tracking-wide text-slate-800">
            {selectedMonthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer active:scale-90"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {/* ========================================================================= */}
          {/* 3. CRISP EMERALD TREND GRAPH (LIGHT THEME)                                */}
          {/* ========================================================================= */}
          <div className="rounded-2xl bg-emerald-50/30 border border-emerald-150/70 p-3 pt-4 relative overflow-hidden shadow-2xs">
            {/* Subtle background grid pattern */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <defs>
                <linearGradient id="lightTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path d={areaD} fill="url(#lightTrendGradient)" />

              {/* Connecting line */}
              <path
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
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
                      fill={isCurrent ? "#047857" : "#64748b"}
                      fontSize={isCurrent ? "10.5" : "9"}
                      fontWeight={isCurrent ? "bold" : "600"}
                      fontFamily="monospace"
                    >
                      {pt.total > 0 ? pt.total.toLocaleString() : "0"}
                    </text>

                    {/* Dot */}
                    {isCurrent && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="6.5"
                        fill="#10b981"
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isCurrent ? "4.5" : "3.5"}
                      fill={isCurrent ? "#059669" : "#ffffff"}
                      stroke="#059669"
                      strokeWidth={isCurrent ? "2" : "1.75"}
                    />

                    {/* Month Label on X axis */}
                    <text
                      x={pt.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fill={isCurrent ? "#047857" : "#64748b"}
                      fontSize="9.5"
                      fontWeight={isCurrent ? "bold" : "600"}
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
          <div className="rounded-2xl p-3.5 bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Compare with Last Month
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {diffAmount < 0 ? (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-emerald-700 font-mono">
                      <ArrowDownRight className="h-4 w-4 shrink-0 text-emerald-600" />
                      ৳{Math.abs(diffAmount).toLocaleString()} less
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {Math.abs(diffPercent).toFixed(1)}% drop
                    </span>
                  </>
                ) : diffAmount > 0 ? (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-rose-700 font-mono">
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-600" />
                      +৳{diffAmount.toLocaleString()} more
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      +{diffPercent.toFixed(1)}% jump
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-0.5 text-xs sm:text-sm font-bold text-slate-700 font-mono">
                      <Minus className="h-4 w-4 text-slate-400" />
                      Same as last month
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                      0% change
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium">Prior Month Spent</div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                ৳{prevTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. CATEGORY TOTAL ROW (e.g. 🚕 Transport ৳ 2,100.00)                      */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/70 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg shrink-0">{categoryEmoji}</span>
              <span className="text-xs font-bold text-slate-900 truncate">{categoryTitle}</span>
            </div>
            <div className="font-mono text-base font-black text-emerald-950 shrink-0">
              ৳ {currentTotal.toLocaleString()}.00
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. SUB-ITEM PERCENTAGE BREAKDOWN                                          */}
          {/* ========================================================================= */}
          <div className="space-y-1.5">
            <div className="px-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <LineChart className="w-3.5 h-3.5 text-teal-600" />
                <span>Item & Merchant Breakdown</span>
              </span>
              <span className="text-slate-400 font-normal">{subItemBreakdown.length} sub-items</span>
            </div>

            {subItemBreakdown.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                No recorded expenses for this category in {selectedMonthName}.
              </div>
            ) : (
              subItemBreakdown.map((item, idx) => {
                const badgeColor = getPercentageBadgeColor(idx);
                return (
                  <div
                    key={item.name}
                    className="group relative flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 transition"
                  >
                    {/* Background mini progress fill */}
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-100/40 rounded-xl pointer-events-none transition-all duration-300"
                      style={{ width: `${Math.min(item.exactPercent, 100)}%` }}
                    />

                    {/* Left: Percentage pill & item name */}
                    <div className="relative flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center min-w-[42px] px-2 py-0.5 rounded text-[11px] font-mono font-bold leading-none ${badgeColor}`}
                      >
                        {item.percent}%
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {item.name}
                      </span>
                    </div>

                    {/* Right: Amount */}
                    <div className="relative font-mono text-xs font-bold text-slate-900">
                      ৳ {item.amount.toLocaleString()}.00
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Bottom Close Button */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            Close Trend View
          </button>
        </div>
      </div>
    </div>
  );
}
