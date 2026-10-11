export type ReportEntry = {
  id: string;
  assetId: string;
  asset: string;
  date: string;
  category: string;
  description: string;
  income: number;
  expense: number;
  fuelLiters?: number;
};

export function sumMoney(values: number[]) {
  return values.reduce((total, value) => {
    if (!Number.isFinite(value)) throw new Error("A record contains an invalid amount. Correct it before generating a report.");
    return total + Math.round(value * 100);
  }, 0) / 100;
}

export function calculateReport(entries: ReportEntry[], start: string, end: string, assetId = "") {
  if (start && end && start > end) throw new Error("Start date must be on or before end date.");
  const rows = entries.filter(row => (!assetId || row.assetId === assetId) && (!start || row.date.slice(0, 10) >= start) && (!end || row.date.slice(0, 10) <= end)).sort((a, b) => b.date.localeCompare(a.date));
  const income = sumMoney(rows.map(row => row.income));
  const expense = sumMoney(rows.map(row => row.expense));
  const fuelRows = rows.filter(row => row.category === "Fuel");
  const fuel = sumMoney(fuelRows.map(row => row.expense));
  const totalLiters = fuelRows.reduce((sum, row) => sum + (row.fuelLiters || 0), 0);
  const avgRatePerLiter = totalLiters > 0 ? Math.round((fuel / totalLiters) * 10) / 10 : 0;
  return {
    rows,
    income,
    expense,
    net: sumMoney([income, -expense]),
    fuel,
    totalLiters,
    avgRatePerLiter,
  };
}

export function reportCsv(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? "'" + value : String(value);
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}
