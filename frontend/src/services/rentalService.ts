import { supabase } from "../lib/supabase";
import type { Property, PropertyUnit } from "../types";
import type { PropertyDocument, RentalFile, RentalMaintenance, RentalPayment, RentalTenancy, RentSchedule } from "../types/rentals";
import { validateSchedule } from "../utils/rentalLedger";

// Paginate financial data: PostgREST's default page limit must not truncate a report.
async function allRows<T>(table: string, field?: string, value?: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from(table).select("*").order("id").range(offset, offset + 499);
    if (field && value) query = query.eq(field, value);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []) as T[]);
    if (!data || data.length < 500) return rows;
  }
}
async function ownerId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in again.");
  return user.id;
}
export type RentalData = { properties: Property[]; units: PropertyUnit[]; tenancies: RentalTenancy[]; schedules: RentSchedule[]; payments: RentalPayment[]; maintenance: RentalMaintenance[]; documents: PropertyDocument[] };
export async function loadRentalData(): Promise<RentalData> {
  const [properties, units, tenancies, schedules, payments, maintenance, documents] = await Promise.all([
    allRows<Record<string, any>>("lifenest_properties"), allRows<Record<string, any>>("lifenest_property_units"),
    allRows<RentalTenancy>("lifenest_rental_tenancies"), allRows<RentSchedule>("lifenest_rent_schedules"),
    allRows<RentalPayment>("lifenest_rent_payments"), allRows<RentalMaintenance>("lifenest_property_expenses"), allRows<PropertyDocument>("lifenest_property_documents"),
  ]);
  return {
    properties: properties.map(p => ({ id: p.id, name: p.name, location: p.location, type: p.type, unitsCount: p.units_count, occupancyRate: p.occupancy_rate })),
    units: units.map(u => ({ id: u.id, propertyId: u.property_id, parentUnitId: u.parent_unit_id, rentalMode: u.rental_mode || "whole", unitNumber: u.unit_number, unitName: u.unit_name, unitType: u.unit_type, floor: u.floor || "", sizeSqft: u.size_sqft || 0, monthlyRent: Number(u.monthly_rent), securityDeposit: Number(u.security_deposit), currentTenant: u.tenant_name || "", tenantName: u.tenant_name, tenantPhone: u.tenant_phone, tenantEmail: u.tenant_email, tenantNid: u.tenant_nid, emergencyContact: u.emergency_contact, status: u.status })),
    tenancies, schedules: schedules.map(s => ({ ...s, base_rent: Number(s.base_rent) })), payments: payments.map(p => ({ ...p, amount_paid: Number(p.amount_paid) })), maintenance: maintenance.map(m => ({ ...m, amount: Number(m.amount), files: m.files || [] })), documents,
  };
}
export async function createRentalProperty(input: { name: string; location: string; type: string; flat: string; rooms: number }) {
  const { data, error } = await supabase.rpc("create_rental_property", { p_name: input.name, p_location: input.location, p_type: input.type, p_flat_name: input.flat, p_rooms: input.rooms });
  if (error) throw error; return data as string;
}
export async function addRentalFlat(propertyId: string, name: string, rooms: number) {
  const { error } = await supabase.rpc("add_rental_flat", { p_property: propertyId, p_name: name, p_rooms: rooms });
  if (error) throw error;
}
export async function deleteRentalProperty(propertyId: string) {
  const { data: units, error: unitsError } = await supabase
    .from("lifenest_property_units")
    .select("id")
    .eq("property_id", propertyId);
  if (unitsError) throw unitsError;

  const unitIds = (units || []).map(unit => unit.id as string);
  let tenancyIds: string[] = [];
  if (unitIds.length) {
    const { data: tenancies, error: tenanciesError } = await supabase
      .from("lifenest_rental_tenancies")
      .select("id")
      .in("unit_id", unitIds);
    if (tenanciesError) throw tenanciesError;
    tenancyIds = (tenancies || []).map(tenancy => tenancy.id as string);
  }

  const { data: documents, error: documentsError } = await supabase
    .from("lifenest_property_documents")
    .select("files")
    .eq("property_id", propertyId);
  if (documentsError) throw documentsError;
  const { data: expenses, error: expensesError } = await supabase
    .from("lifenest_property_expenses")
    .select("files")
    .eq("property_id", propertyId);
  if (expensesError) throw expensesError;

  const files = [...(documents || []), ...(expenses || [])].flatMap(row =>
    Array.isArray(row.files) ? row.files as RentalFile[] : [],
  );
  if (files.length) await removeRentalFiles(files);

  const removeByIds = async (table: string, field: string, ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from(table).delete().in(field, ids);
    if (error) throw error;
  };
  await removeByIds("lifenest_rent_schedules", "tenancy_id", tenancyIds);
  await removeByIds("lifenest_rent_payments", "unit_id", unitIds);
  await removeByIds("lifenest_rental_tenancies", "unit_id", unitIds);

  for (const table of ["lifenest_property_documents", "lifenest_property_expenses", "lifenest_property_units"]) {
    const { error } = await supabase.from(table).delete().eq("property_id", propertyId);
    if (error) throw error;
  }
  const { error } = await supabase.from("lifenest_properties").delete().eq("id", propertyId);
  if (error) throw error;
}
export async function saveTenancy(input: Omit<RentalTenancy, "id" | "owner_id"> & { id?: string }) {
  if (!input.tenant_name.trim() || input.tenant_phone.trim().length < 6) throw new Error("Tenant name and phone number are required.");
  const { id, ...values } = input;
  const row = { ...values, start_month: values.start_month.slice(0, 7) + "-01", end_month: values.end_month ? values.end_month.slice(0, 7) + "-01" : null };
  const query = id ? supabase.from("lifenest_rental_tenancies").update(row).eq("id", id) : supabase.from("lifenest_rental_tenancies").insert({ ...row, owner_id: await ownerId() });
  const { error } = await query;
  if (error) throw error;
}
export async function saveRentSchedule(input: Omit<RentSchedule, "id"> & { id?: string }, existing: RentSchedule[]) {
  validateSchedule(input, existing);
  const { id, ...values } = input;
  const row = { ...values, from_month: values.from_month.slice(0, 7) + "-01", to_month: values.to_month ? values.to_month.slice(0, 7) + "-01" : null };
  const query = id ? supabase.from("lifenest_rent_schedules").update(row).eq("id", id) : supabase.from("lifenest_rent_schedules").insert({ ...row, owner_id: await ownerId() });
  const { error } = await query;
  if (error) throw error;
}
export async function setRentalPayment(tenancyId: string, month: string, paid: boolean, amount?: number, date?: string) {
  const { error } = await supabase.rpc("set_rental_payment", { p_tenancy: tenancyId, p_month: month + "-01", p_paid: paid, p_amount: amount ?? null, ...(date ? { p_date: date } : {}) });
  if (error) throw error;
}
export async function uploadRentalFiles(propertyId: string, files: File[]): Promise<RentalFile[]> {
  const owner = await ownerId();
  const uploaded: RentalFile[] = [];
  try {
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Use JPG, PNG, WebP or PDF files up to 20 MB each.");
      const path = `${owner}/${propertyId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("rental-private").upload(path, file);
      if (error) throw error;
      uploaded.push({ path, name: file.name });
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await removeRentalFiles(uploaded);
    throw error;
  }
}
export async function removeRentalFiles(files: RentalFile[]) {
  await supabase.storage.from("rental-private").remove(files.map(f => f.path));
}
export async function rentalFileUrl(file: RentalFile) {
  const { data, error } = await supabase.storage.from("rental-private").createSignedUrl(file.path, 120);
  if (error) throw error; return data.signedUrl;
}
export async function savePropertyDocument(input: Omit<PropertyDocument, "id" | "files">, files: File[]) {
  const uploaded = await uploadRentalFiles(input.property_id, files);
  try {
    const { error } = await supabase.from("lifenest_property_documents").insert({ ...input, files: uploaded, owner_id: await ownerId() });
    if (error) throw error;
  } catch (error) { await removeRentalFiles(uploaded); throw error; }
}
export async function saveRentalMaintenance(input: Omit<RentalMaintenance, "id" | "files">, files: File[]) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a maintenance cost greater than zero.");
  const uploaded = await uploadRentalFiles(input.property_id, files);
  try {
    const { error } = await supabase.from("lifenest_property_expenses").insert({ ...input, files: uploaded, owner_id: await ownerId() });
    if (error) throw error;
  } catch (error) { await removeRentalFiles(uploaded); throw error; }
}
