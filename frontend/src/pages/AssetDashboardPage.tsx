import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Printer, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { listVehicles } from "../services/vehicleService";
import { listVehicleExpenses, listVehicleServices } from "../services/vehicleRecordService";
import { listProperties, listPropertyUnits, listPropertyExpenses } from "../services/propertyService";
import { calculateReport, reportCsv } from "../utils/assetReports";
import type { ReportEntry } from "../utils/assetReports";

const money = (value: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(value);
const control = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

export function AssetDashboardPage({ kind }: { kind: "vehicle" | "property" }) {
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [occupancy, setOccupancy] = useState({ occupied: 0, units: 0 });
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [assetId, setAssetId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setEntries([]); setAssetId("");
    async function load() {
      if (kind === "vehicle") {
        const vehicles = await listVehicles();
        const records = await Promise.all(vehicles.map(async vehicle => {
          const [expenses, services] = await Promise.all([listVehicleExpenses(vehicle.id), listVehicleServices(vehicle.id)]);
          return [...expenses.map(e => ({ id: `expense-${e.id}`, assetId: vehicle.id, asset: vehicle.name, date: e.date, category: e.category, description: e.description, income: 0, expense: e.amount })),
            ...services.map(s => ({ id: `service-${s.id}`, assetId: vehicle.id, asset: vehicle.name, date: s.serviceDate, category: "Servicing", description: s.serviceType, income: 0, expense: s.cost }))];
        }));
        if (!cancelled) { setAssets(vehicles); setEntries(records.flat()); }
      } else {
        const properties = await listProperties();
        const expenseRecords = await listPropertyExpenses(undefined, true);
        const groups = await Promise.all(properties.map(async property => ({ property, units: await listPropertyUnits(property.id) })));
        const records: ReportEntry[] = groups.flatMap(({ property, units }) => units.flatMap(unit => (unit.rentPayments || []).map(p => ({ id: `rent-${p.id}`, assetId: property.id, asset: property.name, date: p.paymentDate, category: "Rent received", description: `${unit.unitName || unit.unitNumber} / ${p.month}`, income: p.amountPaid, expense: 0 }))));
        for (const e of expenseRecords) {
          const property = properties.find(p => p.id === e.propertyId);
          if (property) records.push({ id: `expense-${e.id}`, assetId: property.id, asset: property.name, date: e.date, category: e.category, description: e.description, income: 0, expense: e.amount });
        }
        const units = groups.flatMap(g => g.units);
        if (!cancelled) { setAssets(properties); setEntries(records); setOccupancy({ units: units.length, occupied: units.filter(u => u.status.toLowerCase() === "occupied").length }); }
      }
    }
    load().catch(e => { if (!cancelled) setError(e.message || "Could not load report records."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, refresh]);
  const result = useMemo(() => {
    try { return { report: calculateReport(entries, start, end, assetId), error: "" }; }
    catch (e) { return { report: null, error: e instanceof Error ? e.message : "Invalid report data." }; }
  }, [entries, start, end, assetId]);
  const report = result.report;
  const ready = !loading && !error && !result.error && report;
  const title = kind === "vehicle" ? "Vehicle Dashboard" : "Property Dashboard";

  const monthlyChartData = useMemo(() => {
    if (!ready || !ready.rows.length) return [];
    const map = new Map<
      string,
      {
        month: string;
        label: string;
        fuel: number;
        servicing: number;
        otherExpense: number;
        expense: number;
        income: number;
        net: number;
      }
    >();
    for (const r of ready.rows) {
      const m = r.date.slice(0, 7);
      if (!m) continue;
      let entry = map.get(m);
      if (!entry) {
        const [yr, mo] = m.split("-");
        const d = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
        const label = isNaN(d.getTime())
          ? m
          : d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        entry = {
          month: m,
          label,
          fuel: 0,
          servicing: 0,
          otherExpense: 0,
          expense: 0,
          income: 0,
          net: 0,
        };
        map.set(m, entry);
      }
      const cat = (r.category || "").toLowerCase();
      if (
        cat.includes("fuel") ||
        cat.includes("octane") ||
        cat.includes("diesel") ||
        cat.includes("gas") ||
        cat.includes("cng")
      ) {
        entry.fuel += r.expense;
      } else if (
        cat.includes("service") ||
        cat.includes("servicing") ||
        cat.includes("repair") ||
        cat.includes("maintenance")
      ) {
        entry.servicing += r.expense;
      } else {
        entry.otherExpense += r.expense;
      }
      entry.expense += r.expense;
      entry.income += r.income;
      entry.net += r.income - r.expense;
    }
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({
        ...d,
        fuel: Math.round(d.fuel),
        servicing: Math.round(d.servicing),
        otherExpense: Math.round(d.otherExpense),
        expense: Math.round(d.expense),
        income: Math.round(d.income),
        net: Math.round(d.net),
      }));
  }, [ready]);

  const exportReport = () => {
    if (!ready) return;
    const csv = reportCsv([[title, "Currency: BDT"], ["Period", start || "Beginning", end || "Present"], ["Asset", assets.find(a => a.id === assetId)?.name || "All assets"], ["Income", ready.income], ["Expenses", ready.expense], ["Net cash flow", ready.net], [], ["Date", "Asset", "Category", "Description", "Income (BDT)", "Expense (BDT)"], ...ready.rows.map(r => [r.date.slice(0, 10), r.asset, r.category, r.description, r.income, r.expense])]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${kind}-report-${start || "all"}-${end || "present"}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="asset-report space-y-5">
    <style>{`@media print {
      body:has(.asset-report) aside, body:has(.asset-report) header, body:has(.asset-report) nav { display: none !important; }
      body:has(.asset-report) main { padding: 0 !important; overflow: visible !important; }
      body:has(.asset-report) div { overflow: visible !important; }
      body:has(.asset-report) main > * { margin-left: 0 !important; }
      body:has(.asset-report) div:has(> main) { margin-left: 0 !important; }
      .asset-report tr { break-inside: avoid; }
      .asset-report thead { display: table-header-group; }
    }`}</style>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-bold">{title}</h1><p className="text-sm text-slate-500">Recorded cash flow and downloadable reports</p></div><Link className={`${control} print:hidden`} to={kind === "vehicle" ? "/assets/vehicles" : "/rentals/properties"}>Manage {kind === "vehicle" ? "vehicles" : "properties"}</Link></div>
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <label className="text-xs">From<input aria-label="From date" type="date" className={`${control} block`} value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="text-xs">To<input aria-label="To date" type="date" className={`${control} block`} value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label className="text-xs">Asset<select className={`${control} block`} value={assetId} onChange={e => setAssetId(e.target.value)}><option value="">All assets</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <button className={control} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
      <button disabled={!ready} onClick={exportReport} className={`${control} flex items-center gap-2 disabled:opacity-40`}><Download size={16} /> Generate CSV report</button>
      <button disabled={!ready} onClick={() => window.print()} className={`${control} flex items-center gap-2 disabled:opacity-40`}><Printer size={16} /> Print / Save PDF</button>
    </div>
    <p className="text-sm text-slate-500">{start || "Beginning"} — {end || "Present"} · {assets.find(a => a.id === assetId)?.name || "All assets"} · BDT</p>
    {loading && <p role="status">Loading records…</p>}
    {(error || result.error) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error || result.error} Report generation is unavailable until this is resolved.</p>}
    {ready && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(kind === "vehicle"
          ? [
              ["Vehicles", assetId ? 1 : assets.length, "Active in fleet"],
              [
                "Fuel expenses",
                money(ready.fuel),
                ready.totalLiters > 0
                  ? `${ready.totalLiters.toLocaleString()} L · Avg ৳${ready.avgRatePerLiter}/L`
                  : "All fuel bills",
              ],
              [
                "Other expenses & servicing",
                money(Math.round((ready.expense - ready.fuel) * 100) / 100),
                "Parts & maintenance",
              ],
              [
                "Total operating cost",
                money(ready.expense),
                "Fuel + service sum",
              ],
            ]
          : [
              [
                "Properties",
                assetId ? 1 : assets.length,
                `${occupancy.occupied}/${occupancy.units} units occupied`,
              ],
              ["Rent received", money(ready.income), "Collected gross revenue"],
              [
                "Property expenses",
                money(ready.expense),
                "Repairs, taxes & maintenance",
              ],
              [
                "Net cash income",
                money(ready.net),
                ready.income > 0
                  ? `${Math.round((ready.net / ready.income) * 100)}% profit margin`
                  : "Revenue − expenses",
              ],
            ]
        ).map(([label, value, hint]) => (
          <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Visual Analytics Chart */}
      {monthlyChartData.length > 0 && (
        <div className="print:hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {kind === "vehicle" ? "Vehicle Operating Cost Trend" : "Cash Flow & Net Profit"}
                </h3>
                <p className="text-xs text-slate-500">
                  {kind === "vehicle"
                    ? "Monthly breakdown of Fuel vs Servicing/Repairs and total operating cost"
                    : "Monthly rental revenue vs expenses and net cash position"}
                </p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {kind === "vehicle" ? (
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(val: number) => `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff", fontSize: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    formatter={(value: any, name: any) => [`৳${Number(value || 0).toLocaleString()}`, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="fuel" name="Fuel (৳)" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="servicing" name="Servicing / Repairs (৳)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="otherExpense" name="Other Operating (৳)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="expense" name="Total Cost (৳)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 5 }} />
                </ComposedChart>
              ) : (
                <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(val: number) => `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff", fontSize: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    formatter={(value: any, name: any) => [`৳${Number(value || 0).toLocaleString()}`, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="income" name="Rent Received (৳)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expenses & Taxes (৳)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="net" name="Net Cash Flow (৳)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">{kind === "vehicle" ? "Operating cost = all recorded expenses + service invoice totals. Service totals already include parts and labor; those components are not added again. Record each bill once." : `Net cash income = rent payments received − property expenses, using payment dates. Deposits and estimated rent are excluded. Current portfolio occupancy: ${occupancy.occupied}/${occupancy.units} units (${occupancy.units ? (occupancy.occupied / occupancy.units * 100).toFixed(1) : "0"}%). Historical rent dues require a billing ledger and are not estimated here.`}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Date", "Asset", "Category / Details", "Income (BDT)", "Expense (BDT)"].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{ready.rows.map(r => <tr key={r.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{r.date.slice(0, 10)}</td><td className="p-3">{r.asset}</td><td className="p-3">{r.category}<p className="text-xs text-slate-500">{r.description}</p></td><td className="p-3">{money(r.income)}</td><td className="p-3">{money(r.expense)}</td></tr>)}{!ready.rows.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No records in this period. Add records from the asset management page.</td></tr>}</tbody><tfoot className="border-t font-semibold"><tr><td className="p-3" colSpan={3}>Total · {ready.rows.length} records</td><td className="p-3">{money(ready.income)}</td><td className="p-3">{money(ready.expense)}</td></tr></tfoot></table></div>
    </>}
  </section>;
}
