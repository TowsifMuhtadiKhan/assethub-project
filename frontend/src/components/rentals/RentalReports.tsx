import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import type { RentalData } from "../../services/rentalService";
import { buildRentalLedger, currentMonth } from "../../utils/rentalLedger";
import { reportCsv, sumMoney } from "../../utils/assetReports";
import { button, field, Label, money, errorMessage } from "./RentalForms";

type ReportKind =
  | "Monthly rent"
  | "Outstanding rent"
  | "Upcoming rent"
  | "Maintenance expenses"
  | "Cash flow";

type ChartView = "cashflow" | "collection" | "categories";

function getMonthsRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let cur = startMonth.slice(0, 7);
  const end = endMonth.slice(0, 7);
  while (cur <= end) {
    months.push(cur);
    const [y, m] = cur.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    cur = nextDate.toISOString().slice(0, 7);
  }
  return months;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthLabel(mStr: string) {
  const [y, m] = mStr.split("-").map(Number);
  const monthIdx = (m || 1) - 1;
  const shortYear = String(y || "").slice(2);
  return `${MONTH_NAMES[monthIdx] || ""} '${shortYear}`;
}

export function RentalReports({
  data,
  propertyId,
}: {
  data: RentalData;
  propertyId?: string;
}) {
  const year = currentMonth().slice(0, 4);
  const [from, setFrom] = useState(`${year}-01`);
  const [to, setTo] = useState(`${year}-12`);
  const [kind, setKind] = useState<ReportKind>("Monthly rent");
  const [unitId, setUnitId] = useState("");
  const [chartView, setChartView] = useState<ChartView>("cashflow");

  const units = data.units.filter((u) => !propertyId || u.propertyId === propertyId);

  const result = useMemo(() => {
    try {
      const ids = new Set(units.filter((u) => !unitId || u.id === unitId).map((u) => u.id));
      const tenants = data.tenancies.filter((t) => ids.has(t.unit_id));
      const ledger = buildRentalLedger(tenants, data.schedules, data.payments, from, to);
      const name = (id: string) => {
        const u = data.units.find((unit) => unit.id === id);
        return `${
          data.properties.find((p) => p.id === u?.propertyId)?.name || ""
        } / ${u?.unitNumber || id}`;
      };
      const expenses = data.maintenance.filter(
        (m) =>
          (!propertyId || m.property_id === propertyId) &&
          (!unitId || m.unit_id === unitId) &&
          m.date.slice(0, 7) >= from &&
          m.date.slice(0, 7) <= to
      );
      const payments = data.payments.filter(
        (p) =>
          !p.voided_at &&
          ids.has(p.unit_id) &&
          p.payment_date.slice(0, 7) >= from &&
          p.payment_date.slice(0, 7) <= to
      );

      let headers: string[], rows: (string | number)[][], summary: [string, number][];

      if (kind === "Maintenance expenses") {
        headers = ["Date", "Property / Unit", "Category", "Vendor", "Description", "Cost (BDT)"];
        rows = expenses.map((e) => [
          e.date,
          e.unit_id ? name(e.unit_id) : data.properties.find((p) => p.id === e.property_id)?.name || "",
          e.category,
          e.vendor,
          e.description,
          e.amount,
        ]);
        summary = [["Maintenance cost", sumMoney(expenses.map((e) => e.amount))]];
      } else if (kind === "Cash flow") {
        headers = ["Date", "Property / Unit", "Description", "Income (BDT)", "Expense (BDT)"];
        rows = [
          ...payments.map((p) => [
            p.payment_date.slice(0, 10),
            name(p.unit_id),
            `Rent for ${p.month}`,
            p.amount_paid,
            0,
          ]),
          ...expenses.map((e) => [
            e.date,
            e.unit_id ? name(e.unit_id) : data.properties.find((p) => p.id === e.property_id)?.name || "",
            e.description || e.category,
            0,
            e.amount,
          ]),
        ];
        const income = sumMoney(payments.map((p) => p.amount_paid));
        const cost = sumMoney(expenses.map((e) => e.amount));
        summary = [
          ["Received", income],
          ["Expenses", cost],
          ["Net cash income", sumMoney([income, -cost])],
        ];
      } else {
        const filtered = ledger.filter((r) =>
          kind === "Outstanding rent"
            ? r.month <= currentMonth() && (r.outstanding === null || r.outstanding > 0)
            : kind === "Upcoming rent"
            ? r.month > currentMonth()
            : true
        );
        headers = [
          "Month",
          "Property / Unit",
          "Renter",
          "Base rent (BDT)",
          "Other charges (BDT)",
          "Total due (BDT)",
          "Received (BDT)",
          "Outstanding (BDT)",
          "Credit (BDT)",
          "Status",
        ];
        rows = filtered.map((r) => [
          r.month,
          name(r.unitId),
          r.tenant,
          r.baseRent ?? "Rate missing",
          r.charges ?? "",
          r.expected ?? "Rate missing",
          r.received,
          r.outstanding ?? "Rate missing",
          r.credit,
          r.status,
        ]);
        summary = [
          ["Scheduled charges", sumMoney(filtered.map((r) => r.expected || 0))],
          ["Received for these months", sumMoney(filtered.map((r) => r.received))],
          ["Outstanding", sumMoney(filtered.map((r) => r.outstanding || 0))],
          ["Credit", sumMoney(filtered.map((r) => r.credit))],
        ];
      }

      const missing =
        !["Maintenance expenses", "Cash flow"].includes(kind) &&
        ledger.some((r) => r.expected === null);
      const legacy = units.filter(
        (u) =>
          u.rentalMode !== "rooms" &&
          u.tenantName &&
          !data.tenancies.some((t) => t.unit_id === u.id)
      ).length;

      // Compute monthly chart data across the date range
      const monthList = getMonthsRange(from, to);
      const monthlyChartData = monthList.map((m) => {
        const mPayments = payments.filter((p) => p.payment_date.slice(0, 7) === m);
        const mExpenses = expenses.filter((e) => e.date.slice(0, 7) === m);
        const mLedger = ledger.filter((r) => r.month === m);

        const income = sumMoney(mPayments.map((p) => p.amount_paid));
        const expense = sumMoney(mExpenses.map((e) => e.amount));
        const net = sumMoney([income, -expense]);

        const scheduled = sumMoney(mLedger.map((r) => r.expected || 0));
        const received = sumMoney(mLedger.map((r) => r.received || 0));
        const outstanding = sumMoney(
          mLedger.map((r) => (r.outstanding && r.outstanding > 0 ? r.outstanding : 0))
        );

        return {
          month: m,
          label: formatMonthLabel(m),
          income,
          expense,
          net,
          scheduled,
          received,
          outstanding,
        };
      });

      // Compute category breakdown data
      const catMap = new Map<string, number>();
      for (const e of expenses) {
        const c = e.category || "General Maintenance";
        catMap.set(c, (catMap.get(c) || 0) + e.amount);
      }
      const categoryExpensesData = Array.from(catMap.entries())
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount * 100) / 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        headers,
        rows,
        summary,
        missing,
        legacy,
        error: "",
        monthlyChartData,
        categoryExpensesData,
      };
    } catch (e) {
      return {
        headers: [],
        rows: [],
        summary: [],
        missing: false,
        legacy: 0,
        error: errorMessage(e),
        monthlyChartData: [],
        categoryExpensesData: [],
      };
    }
  }, [data, propertyId, unitId, from, to, kind, units]);

  const exportCsv = () => {
    const csv = reportCsv([
      [kind, "BDT"],
      ["Period", from, to],
      [
        "Property",
        data.properties.find((p) => p.id === propertyId)?.name || "All properties",
      ],
      ["Unit", units.find((u) => u.id === unitId)?.unitNumber || "All units"],
      ...result.summary,
      [],
      result.headers,
      ...result.rows,
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rental-${kind.toLowerCase().replaceAll(" ", "-")}-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const chartData = result.monthlyChartData || [];
  const categoryData = result.categoryExpensesData || [];

  return (
    <section className="rental-report space-y-4">
      <style>{`@media print { body:has(.rental-report) aside, body:has(.rental-report) header, body:has(.rental-report) nav, body:has(.rental-report) .rental-no-print { display:none!important; } body:has(.rental-report) main, body:has(.rental-report) div:has(> main) { margin:0!important; padding:0!important; } body:has(.rental-report) div { overflow:visible!important; } .rental-report tr { break-inside:avoid; } }`}</style>

      {/* Filter Bar */}
      <div className="rental-no-print flex flex-wrap items-end gap-3 border-b border-slate-200/80 pb-3">
        <Label title="Report">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReportKind)}
            className={field}
          >
            {[
              "Monthly rent",
              "Outstanding rent",
              "Upcoming rent",
              "Maintenance expenses",
              "Cash flow",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Label>
        <Label title="From month">
          <input
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </Label>
        <Label title="Through month">
          <input
            type="month"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </Label>
        <Label title="Flat / room">
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className={field}
          >
            <option value="">All units</option>
            {units
              .filter((u) => u.rentalMode !== "rooms")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitNumber}
                </option>
              ))}
          </select>
        </Label>
        <button
          className={button}
          disabled={
            !!result.error ||
            result.missing ||
            (result.legacy > 0 &&
              kind !== "Cash flow" &&
              kind !== "Maintenance expenses")
          }
          onClick={exportCsv}
        >
          Download CSV
        </button>
        <button
          className={button}
          disabled={!!result.error || result.missing}
          onClick={() => window.print()}
        >
          Print / Save PDF
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-base text-slate-900">
            {kind} · {from} to {to}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {kind === "Cash flow"
              ? "Cash basis: Net cash income = rent received minus maintenance costs."
              : "Calculated using dated rates and breakdown charges. Amounts in ৳ BDT."}
          </p>
        </div>
      </div>

      {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
      {result.missing && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          Some rental months have no rate. Totals below include configured months only. Add the missing periods before exporting a complete report.
        </p>
      )}
      {result.legacy > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {result.legacy} existing unit(s) still need their renter dates and historical rent periods set up.
        </p>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {result.summary.map(([label, amount]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
          >
            <p className="text-xs text-slate-500 font-medium">
              {label}
              {result.missing ? " (incomplete)" : ""}
            </p>
            <p className="mt-1.5 text-xl font-bold font-mono text-slate-900">
              {money(amount)}
            </p>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DASHBOARD CHARTS / GRAPHS                                      */}
      {/* ========================================================================= */}
      <div className="rental-no-print rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Financial Graphs & Trend Analysis
              </h3>
              <p className="text-[11px] text-slate-400">
                Month-by-month cash flow, rental collection, and repair cost distributions
              </p>
            </div>
          </div>

          {/* Chart View Switcher */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartView("cashflow")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                chartView === "cashflow"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              <span>Cash Flow & Net Profit</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView("collection")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                chartView === "collection"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3 w-3" />
              <span>Rent Collection vs Due</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView("categories")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                chartView === "categories"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PieChartIcon className="h-3 w-3" />
              <span>Maintenance by Category</span>
            </button>
          </div>
        </div>

        {/* Chart View 1: Cash Flow & Net Profit */}
        {chartView === "cashflow" && (
          <div className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `৳${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      `৳${Number(val).toLocaleString()}`,
                      name === "income"
                        ? "Rent Received"
                        : name === "expense"
                        ? "Maintenance Cost"
                        : "Net Cash Flow",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    formatter={(val) =>
                      val === "income"
                        ? "Rent Income (৳)"
                        : val === "expense"
                        ? "Maintenance Expense (৳)"
                        : "Net Profit / Cash (৳)"
                    }
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Green bars: Collected rent income · Amber bars: Maintenance costs · Indigo line: Net cash profit
            </p>
          </div>
        )}

        {/* Chart View 2: Rent Collection vs Due */}
        {chartView === "collection" && (
          <div className="pt-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `৳${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      `৳${Number(val).toLocaleString()}`,
                      name === "scheduled"
                        ? "Total Due"
                        : name === "received"
                        ? "Received"
                        : "Outstanding Due",
                    ]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "11px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    formatter={(val) =>
                      val === "scheduled"
                        ? "Scheduled Due (৳)"
                        : val === "received"
                        ? "Collected (৳)"
                        : "Outstanding Due (৳)"
                    }
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Bar dataKey="scheduled" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="received" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Sky bars: Total rent due · Green bars: Collected rent · Red bars: Overdue balance
            </p>
          </div>
        )}

        {/* Chart View 3: Maintenance Expense by Category */}
        {chartView === "categories" && (
          <div className="pt-2">
            {categoryData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No maintenance expenses recorded in this period to display.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={categoryData}
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(v) => `৳${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`}
                    />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 10, fill: "#334155" }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(val) => [`৳${Number(val).toLocaleString()}`, "Spent"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "0.75rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Repair & servicing expenditure broken down by trade category
            </p>
          </div>
        )}
      </div>

      {/* Ledger Records Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-600">
            <tr>
              {result.headers.map((h) => (
                <th key={h} className="p-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition">
                {row.map((cell, j) => (
                  <td key={j} className="p-3">
                    {typeof cell === "number"
                      ? cell.toLocaleString("en-BD", { minimumFractionDigits: 2 })
                      : cell}
                  </td>
                ))}
              </tr>
            ))}
            {!result.rows.length && (
              <tr>
                <td
                  colSpan={result.headers.length || 1}
                  className="p-8 text-center text-xs text-slate-500"
                >
                  No records found in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
