import { supabase } from "../lib/supabase";
import type { Property, PropertyUnit, RentPayment } from "../types";

const PROPERTIES_TABLE = "lifenest_properties";
const UNITS_TABLE = "lifenest_property_units";
const PAYMENTS_TABLE = "lifenest_rent_payments";

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from(PROPERTIES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location ?? "",
    type: row.type ?? "",
    unitsCount: row.units_count ?? 0,
    occupancyRate: row.occupancy_rate ?? 0,
  }));
}

export async function createProperty(input: {
  name: string;
  location: string;
  type: string;
  unitsCount: number;
  occupancyRate?: number;
}): Promise<Property> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from(PROPERTIES_TABLE)
    .insert({
      owner_id: user.id,
      name: input.name,
      location: input.location,
      type: input.type,
      units_count: input.unitsCount,
      occupancy_rate: input.occupancyRate ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    location: data.location ?? "",
    type: data.type ?? "",
    unitsCount: data.units_count ?? 0,
    occupancyRate: data.occupancy_rate ?? 0,
  };
}

export async function listPropertyUnits(
  propertyId: string,
): Promise<PropertyUnit[]> {
  const { data: unitsData, error: unitsError } = await supabase
    .from(UNITS_TABLE)
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });

  if (unitsError) throw unitsError;

  const unitIds = (unitsData || []).map((u) => u.id);
  const paymentsByUnit: Record<string, RentPayment[]> = {};

  if (unitIds.length > 0) {
    const { data: paymentsData, error: paymentsError } = await supabase
      .from(PAYMENTS_TABLE)
      .select("*")
      .in("unit_id", unitIds)
      .order("payment_date", { ascending: false });

    if (!paymentsError && paymentsData) {
      for (const p of paymentsData) {
        if (!paymentsByUnit[p.unit_id]) paymentsByUnit[p.unit_id] = [];
        paymentsByUnit[p.unit_id].push({
          id: p.id,
          unitId: p.unit_id,
          tenantId: "",
          month: p.month,
          amountPayable: 0,
          amountPaid: Number(p.amount_paid),
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method ?? "",
          status: "PAID",
        });
      }
    }
  }

  return (unitsData || []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    unitNumber: row.unit_number ?? "",
    unitName: row.unit_name ?? "",
    unitType: row.unit_type ?? "Room",
    floor: row.floor ?? "",
    sizeSqft: row.size_sqft ?? 0,
    monthlyRent: Number(row.monthly_rent ?? 0),
    securityDeposit: Number(row.security_deposit ?? 0),
    currentTenant: row.tenant_name ?? "",
    tenantName: row.tenant_name ?? "",
    status: row.status ?? "Vacant",
    rentPayments: paymentsByUnit[row.id] || [],
  }));
}

export async function createPropertyUnit(input: {
  propertyId: string;
  unitNumber: string;
  unitType: string;
  monthlyRent: number;
  tenantName: string;
}): Promise<PropertyUnit> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from(UNITS_TABLE)
    .insert({
      owner_id: user.id,
      property_id: input.propertyId,
      unit_number: input.unitNumber,
      unit_type: input.unitType,
      monthly_rent: input.monthlyRent,
      tenant_name: input.tenantName,
      status: input.tenantName.trim() ? "Occupied" : "Vacant",
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    propertyId: data.property_id,
    unitNumber: data.unit_number,
    unitName: data.unit_name ?? "",
    unitType: data.unit_type,
    floor: data.floor ?? "",
    sizeSqft: data.size_sqft ?? 0,
    monthlyRent: Number(data.monthly_rent ?? 0),
    securityDeposit: Number(data.security_deposit ?? 0),
    currentTenant: data.tenant_name ?? "",
    tenantName: data.tenant_name ?? "",
    status: data.status,
    rentPayments: [],
  };
}

export async function updatePropertyUnit(
  unitId: string,
  input: { tenantName?: string; monthlyRent?: number },
): Promise<Partial<PropertyUnit>> {
  const patch: Record<string, unknown> = {};
  if (input.tenantName !== undefined) {
    patch.tenant_name = input.tenantName;
    patch.status = input.tenantName.trim() ? "Occupied" : "Vacant";
  }
  if (input.monthlyRent !== undefined) {
    patch.monthly_rent = input.monthlyRent;
  }

  const { data, error } = await supabase
    .from(UNITS_TABLE)
    .update(patch)
    .eq("id", unitId)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    propertyId: data.property_id,
    unitNumber: data.unit_number,
    tenantName: data.tenant_name,
    monthlyRent: Number(data.monthly_rent),
    status: data.status,
  };
}

export async function addRentPayment(input: {
  unitId: string;
  month: string;
  amountPaid: number;
}): Promise<RentPayment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from(PAYMENTS_TABLE)
    .insert({
      owner_id: user.id,
      unit_id: input.unitId,
      month: input.month,
      amount_paid: input.amountPaid,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    unitId: data.unit_id,
    tenantId: "",
    month: data.month,
    amountPayable: 0,
    amountPaid: Number(data.amount_paid),
    paymentDate: data.payment_date,
    paymentMethod: data.payment_method ?? "",
    status: "PAID",
  };
}
