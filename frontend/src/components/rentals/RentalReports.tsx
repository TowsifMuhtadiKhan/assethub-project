import { useMemo, useState } from "react";
import type { RentalData } from "../../services/rentalService";
import { buildRentalLedger, currentMonth } from "../../utils/rentalLedger";
import { reportCsv, sumMoney } from "../../utils/assetReports";
import { button, field, Label, money, errorMessage } from "./RentalForms";

type ReportKind = "Monthly rent" | "Outstanding rent" | "Upcoming rent" | "Maintenance expenses" | "Cash flow";
export function RentalReports({ data, propertyId }: { data: RentalData; propertyId?: string }) {
  const year = currentMonth().slice(0, 4);
  const [from, setFrom] = useState(`${year}-01`), [to, setTo] = useState(`${year}-12`);
  const [kind, setKind] = useState<ReportKind>("Monthly rent"), [unitId, setUnitId] = useState("");
  const units = data.units.filter(u => !propertyId || u.propertyId === propertyId);
  const result = useMemo(() => {
    try {
      const ids = new Set(units.filter(u => !unitId || u.id === unitId).map(u => u.id));
      const tenants = data.tenancies.filter(t => ids.has(t.unit_id));
      const ledger = buildRentalLedger(tenants, data.schedules, data.payments, from, to);
      const name = (id: string) => { const u = data.units.find(u => u.id === id); return `${data.properties.find(p => p.id === u?.propertyId)?.name || ""} / ${u?.unitNumber || id}`; };
      const expenses = data.maintenance.filter(m => (!propertyId || m.property_id === propertyId) && (!unitId || m.unit_id === unitId) && m.date.slice(0, 7) >= from && m.date.slice(0, 7) <= to);
      let headers: string[], rows: (string | number)[][], summary: [string, number][];
      if (kind === "Maintenance expenses") {
        headers = ["Date", "Property / Unit", "Category", "Vendor", "Description", "Cost (BDT)"];
        rows = expenses.map(e => [e.date, e.unit_id ? name(e.unit_id) : data.properties.find(p => p.id === e.property_id)?.name || "", e.category, e.vendor, e.description, e.amount]);
        summary = [["Maintenance cost", sumMoney(expenses.map(e => e.amount))]];
      } else if (kind === "Cash flow") {
        const payments = data.payments.filter(p => !p.voided_at && ids.has(p.unit_id) && p.payment_date.slice(0, 7) >= from && p.payment_date.slice(0, 7) <= to);
        headers = ["Date", "Property / Unit", "Description", "Income (BDT)", "Expense (BDT)"];
        rows = [...payments.map(p => [p.payment_date.slice(0, 10), name(p.unit_id), `Rent for ${p.month}`, p.amount_paid, 0]), ...expenses.map(e => [e.date, e.unit_id ? name(e.unit_id) : data.properties.find(p => p.id === e.property_id)?.name || "", e.description || e.category, 0, e.amount])];
        const income = sumMoney(payments.map(p => p.amount_paid)), cost = sumMoney(expenses.map(e => e.amount));
        summary = [["Received", income], ["Expenses", cost], ["Net cash income", sumMoney([income, -cost])]];
      } else {
        const filtered = ledger.filter(r => kind === "Outstanding rent" ? r.month <= currentMonth() && (r.outstanding === null || r.outstanding > 0) : kind === "Upcoming rent" ? r.month > currentMonth() : true);
        headers = ["Month", "Property / Unit", "Tenant", "Base rent (BDT)", "Other charges (BDT)", "Total due (BDT)", "Received (BDT)", "Outstanding (BDT)", "Credit (BDT)", "Status"];
        rows = filtered.map(r => [r.month, name(r.unitId), r.tenant, r.baseRent ?? "Rate missing", r.charges ?? "", r.expected ?? "Rate missing", r.received, r.outstanding ?? "Rate missing", r.credit, r.status]);
        summary = [["Scheduled charges", sumMoney(filtered.map(r => r.expected || 0))], ["Received for these months", sumMoney(filtered.map(r => r.received))], ["Outstanding", sumMoney(filtered.map(r => r.outstanding || 0))], ["Credit", sumMoney(filtered.map(r => r.credit))]];
      }
      const missing = !["Maintenance expenses", "Cash flow"].includes(kind) && ledger.some(r => r.expected === null);
      const legacy = units.filter(u => u.rentalMode !== "rooms" && u.tenantName && !data.tenancies.some(t => t.unit_id === u.id)).length;
      return { headers, rows, summary, missing, legacy, error: "" };
    } catch (e) { return { headers: [], rows: [], summary: [], missing: false, legacy: 0, error: errorMessage(e) }; }
  }, [data, propertyId, unitId, from, to, kind, units]);
  const exportCsv = () => {
    const csv = reportCsv([[kind, "BDT"], ["Period", from, to], ["Property", data.properties.find(p => p.id === propertyId)?.name || "All properties"], ["Unit", units.find(u => u.id === unitId)?.unitNumber || "All units"], ...result.summary, [], result.headers, ...result.rows]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `rental-${kind.toLowerCase().replaceAll(" ", "-")}-${from}-${to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="rental-report space-y-4">
    <style>{`@media print { body:has(.rental-report) aside, body:has(.rental-report) header, body:has(.rental-report) nav, body:has(.rental-report) .rental-no-print { display:none!important; } body:has(.rental-report) main, body:has(.rental-report) div:has(> main) { margin:0!important; padding:0!important; } body:has(.rental-report) div { overflow:visible!important; } .rental-report tr { break-inside:avoid; } }`}</style>
    <div className="rental-no-print flex flex-wrap items-end gap-3"><Label title="Report"><select value={kind} onChange={e => setKind(e.target.value as ReportKind)} className={field}>{["Monthly rent", "Outstanding rent", "Upcoming rent", "Maintenance expenses", "Cash flow"].map(k => <option key={k}>{k}</option>)}</select></Label><Label title="From month"><input type="month" value={from} onChange={e => setFrom(e.target.value)} className={field} /></Label><Label title="Through month"><input type="month" value={to} onChange={e => setTo(e.target.value)} className={field} /></Label><Label title="Flat / room"><select value={unitId} onChange={e => setUnitId(e.target.value)} className={field}><option value="">All units</option>{units.filter(u => u.rentalMode !== "rooms").map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}</select></Label><button className={button} disabled={!!result.error || result.missing || (result.legacy > 0 && kind !== "Cash flow" && kind !== "Maintenance expenses")} onClick={exportCsv}>Download CSV</button><button className={button} disabled={!!result.error || result.missing} onClick={() => window.print()}>Print / Save PDF</button></div>
    <h2 className="font-semibold">{kind} · {from} to {to}</h2><p className="text-xs text-slate-500">{kind === "Cash flow" ? "Cash basis: payment date determines the reporting month. Net cash income = rent received minus recorded maintenance expenses." : "Rent is calculated using each month's saved rate and optional charges. Payments are allocated to their rental month; credits do not automatically carry into another month. Amounts are in BDT."}</p>
    {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
    {result.missing && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some rental months have no rate. Totals below include configured months only. Add the missing periods before exporting a complete report.</p>}
    {result.legacy > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{result.legacy} existing unit(s) still need their tenant dates and historical rent periods set up. Their old payments remain in Cash flow.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{result.summary.map(([label, amount]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}{result.missing ? " (incomplete)" : ""}</p><p className="mt-2 text-xl font-bold">{money(amount)}</p></div>)}</div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr>{result.headers.map(h => <th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={i} className="border-t border-slate-100">{row.map((cell, j) => <td key={j} className="p-3">{typeof cell === "number" ? cell.toLocaleString("en-BD", { minimumFractionDigits: 2 }) : cell}</td>)}</tr>)}{!result.rows.length && <tr><td colSpan={result.headers.length || 1} className="p-6 text-center text-slate-500">No records in this period.</td></tr>}</tbody></table></div>
  </section>;
}
