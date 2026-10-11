import type { RentalPayment, RentalTenancy, RentSchedule } from "../types/rentals.ts";
import { sumMoney } from "./assetReports.ts";

export function monthKey(value: string) {
  const key = value.slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error("Use a valid month (YYYY-MM).");
  return key;
}
export function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
}
export function monthsBetween(start: string, end: string) {
  const first = monthKey(start), last = monthKey(end);
  if (first > last) throw new Error("The start month must be on or before the end month.");
  const result: string[] = [];
  let [year, month] = first.split("-").map(Number);
  while (`${year}-${String(month).padStart(2, "0")}` <= last) {
    result.push(`${year}-${String(month).padStart(2, "0")}`);
    if (result.length > 1200) throw new Error("Choose a report period of at most 100 years.");
    month++; if (month === 13) { month = 1; year++; }
  }
  return result;
}
export function validateSchedule(schedule: Omit<RentSchedule, "id"> & { id?: string }, others: RentSchedule[]) {
  const start = monthKey(schedule.from_month), end = schedule.to_month ? monthKey(schedule.to_month) : "9999-12";
  if (end < start) throw new Error("The rent period ends before it starts.");
  for (const value of [schedule.base_rent, ...schedule.charges.map(c => c.amount)]) {
    if (!Number.isFinite(value) || value < 0 || Math.round(value * 100) / 100 !== value) throw new Error("Amounts must be non-negative and have at most two decimal places.");
  }
  if (schedule.charges.some(c => !c.label.trim())) throw new Error("Give each additional charge a name.");
  if (others.some(s => s.id !== schedule.id && s.tenancy_id === schedule.tenancy_id && monthKey(s.from_month) <= end && (!s.to_month || monthKey(s.to_month) >= start))) {
    throw new Error("This rent period overlaps another period. End the earlier period in the preceding month first.");
  }
}
export type LedgerRow = {
  tenancyId: string; unitId: string; tenant: string; month: string; baseRent: number | null;
  charges: number | null; expected: number | null; received: number; outstanding: number | null;
  credit: number; status: "Paid" | "Partial" | "Unpaid" | "Upcoming" | "Rate missing";
};
export function buildRentalLedger(tenancies: RentalTenancy[], schedules: RentSchedule[], payments: RentalPayment[], start: string, end: string, now = currentMonth()): LedgerRow[] {
  return tenancies.flatMap(tenancy => monthsBetween(start, end).filter(month => month >= monthKey(tenancy.start_month) && (!tenancy.end_month || month <= monthKey(tenancy.end_month))).map(month => {
    const applicable = schedules.filter(s => s.tenancy_id === tenancy.id && monthKey(s.from_month) <= month && (!s.to_month || monthKey(s.to_month) >= month));
    if (applicable.length > 1) throw new Error(`Overlapping rates for ${tenancy.tenant_name} in ${month}.`);
    const rate = applicable[0];
    const received = sumMoney(payments.filter(p => !p.voided_at && (p.tenancy_id === tenancy.id || (!p.tenancy_id && p.unit_id === tenancy.unit_id)) && normalizeLegacyMonth(p.month) === month).map(p => Number(p.amount_paid)));
    const charges = rate ? sumMoney(rate.charges.map(c => Number(c.amount))) : null;
    const expected = rate ? sumMoney([Number(rate.base_rent), charges!]) : null;
    const outstanding = expected === null ? null : Math.max(0, sumMoney([expected, -received]));
    return { tenancyId: tenancy.id, unitId: tenancy.unit_id, tenant: tenancy.tenant_name, month, baseRent: rate ? Number(rate.base_rent) : null, charges, expected, received, outstanding, credit: expected === null ? 0 : Math.max(0, sumMoney([received, -expected])), status: expected === null ? "Rate missing" : outstanding === 0 ? "Paid" : received > 0 ? "Partial" : month > now ? "Upcoming" : "Unpaid" };
  }));
}
export function normalizeLegacyMonth(value: string) {
  if (/^\d{4}-(0[1-9]|1[0-2])(?:$|-)/.test(value)) return value.slice(0, 7);
  const match = value.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const names = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const index = match ? names.indexOf(match[1].toLowerCase()) : -1;
  return match && index >= 0 ? `${match[2]}-${String(index + 1).padStart(2, "0")}` : "";
}
