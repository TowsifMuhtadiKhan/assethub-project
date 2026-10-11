import { supabase } from "../lib/supabase";
import type { VehicleExpense, VehicleService } from "../types";

const EXPENSES_TABLE = "lifenest_vehicle_expenses";
const SERVICES_TABLE = "lifenest_vehicle_services";

export async function listVehicleExpenses(
  vehicleId: string,
): Promise<VehicleExpense[]> {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    category: row.category,
    amount: Number(row.amount),
    mileage: row.mileage ?? 0,
    description: row.description ?? "",
    receiptUrl: row.receipt_url ?? undefined,
    paymentMethod: row.payment_method ?? "",
    fuelLiters: row.fuel_liters ? Number(row.fuel_liters) : undefined,
  }));
}

export async function listAllVehicleExpenses(): Promise<VehicleExpense[]> {
  try {
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .select("*")
      .order("date", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      date: row.date,
      category: row.category,
      amount: Number(row.amount),
      mileage: row.mileage ?? 0,
      description: row.description ?? "",
      receiptUrl: row.receipt_url ?? undefined,
      paymentMethod: row.payment_method ?? "",
      fuelLiters: row.fuel_liters ? Number(row.fuel_liters) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function createVehicleExpense(
  input: Omit<VehicleExpense, "id">,
): Promise<VehicleExpense> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData = {
    owner_id: user.id,
    vehicle_id: input.vehicleId,
    date: input.date,
    category: input.category,
    amount: input.amount,
    mileage: input.mileage ?? 0,
    description: input.description ?? "",
    receipt_url: input.receiptUrl ?? null,
    payment_method: input.paymentMethod ?? "",
    fuel_liters: input.fuelLiters ?? null,
  };

  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .insert(rowData)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    date: data.date,
    category: data.category,
    amount: Number(data.amount),
    mileage: data.mileage ?? 0,
    description: data.description ?? "",
    receiptUrl: data.receipt_url ?? undefined,
    paymentMethod: data.payment_method ?? "",
    fuelLiters: data.fuel_liters ? Number(data.fuel_liters) : undefined,
  };
}

export async function updateVehicleExpense(
  id: string,
  input: Partial<VehicleExpense>,
): Promise<VehicleExpense> {
  const patch: Record<string, any> = {};
  if (input.date !== undefined) patch.date = input.date;
  if (input.category !== undefined) patch.category = input.category;
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.mileage !== undefined) patch.mileage = input.mileage;
  if (input.description !== undefined) patch.description = input.description;
  if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod;
  if (input.fuelLiters !== undefined) patch.fuel_liters = input.fuelLiters;
  if (input.receiptUrl !== undefined) patch.receipt_url = input.receiptUrl;

  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    date: data.date,
    category: data.category,
    amount: Number(data.amount),
    mileage: data.mileage ?? 0,
    description: data.description ?? "",
    receiptUrl: data.receipt_url ?? undefined,
    paymentMethod: data.payment_method ?? "",
    fuelLiters: data.fuel_liters ? Number(data.fuel_liters) : undefined,
  };
}

export async function deleteVehicleExpense(id: string): Promise<void> {
  const { error } = await supabase.from(EXPENSES_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function listVehicleServices(
  vehicleId: string,
): Promise<VehicleService[]> {
  const { data, error } = await supabase
    .from(SERVICES_TABLE)
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceDate: row.service_date,
    mileageAtService: row.mileage_at_service ?? 0,
    workshopName: row.workshop_name ?? "",
    workshopLocation: row.workshop_location ?? "",
    mechanicName: row.mechanic_name ?? "",
    cost: Number(row.cost),
    partsCost: Number(row.parts_cost ?? 0),
    laborCost: Number(row.labor_cost ?? 0),
    description: row.description ?? "",
    notes: row.notes ?? "",
    nextServiceDate: row.next_service_date ?? "",
    nextServiceMileage: row.next_service_mileage ?? 0,
    reminderEnabled: row.reminder_enabled ?? true,
    receiptUrl: row.receipt_url ?? undefined,
  }));
}

export async function listAllVehicleServices(): Promise<VehicleService[]> {
  try {
    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select("*")
      .order("service_date", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      serviceType: row.service_type,
      serviceDate: row.service_date,
      mileageAtService: row.mileage_at_service ?? 0,
      workshopName: row.workshop_name ?? "",
      workshopLocation: row.workshop_location ?? "",
      mechanicName: row.mechanic_name ?? "",
      cost: Number(row.cost),
      partsCost: Number(row.parts_cost ?? 0),
      laborCost: Number(row.labor_cost ?? 0),
      description: row.description ?? "",
      notes: row.notes ?? "",
      nextServiceDate: row.next_service_date ?? "",
      nextServiceMileage: row.next_service_mileage ?? 0,
      reminderEnabled: row.reminder_enabled ?? true,
      receiptUrl: row.receipt_url ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function createVehicleService(
  input: Omit<VehicleService, "id">,
): Promise<VehicleService> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData = {
    owner_id: user.id,
    vehicle_id: input.vehicleId,
    service_type: input.serviceType,
    service_date: input.serviceDate,
    mileage_at_service: input.mileageAtService ?? 0,
    workshop_name: input.workshopName ?? "",
    workshop_location: input.workshopLocation ?? "",
    mechanic_name: input.mechanicName ?? "",
    cost: input.cost,
    parts_cost: input.partsCost ?? 0,
    labor_cost: input.laborCost ?? 0,
    description: input.description ?? "",
    notes: input.notes ?? "",
    next_service_date: input.nextServiceDate || null,
    next_service_mileage: input.nextServiceMileage ?? 0,
    reminder_enabled: input.reminderEnabled ?? true,
    receipt_url: input.receiptUrl ?? null,
  };

  const { data, error } = await supabase
    .from(SERVICES_TABLE)
    .insert(rowData)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    serviceType: data.service_type,
    serviceDate: data.service_date,
    mileageAtService: data.mileage_at_service ?? 0,
    workshopName: data.workshop_name ?? "",
    workshopLocation: data.workshop_location ?? "",
    mechanicName: data.mechanic_name ?? "",
    cost: Number(data.cost),
    partsCost: Number(data.parts_cost ?? 0),
    laborCost: Number(data.labor_cost ?? 0),
    description: data.description ?? "",
    notes: data.notes ?? "",
    nextServiceDate: data.next_service_date ?? "",
    nextServiceMileage: data.next_service_mileage ?? 0,
    reminderEnabled: data.reminder_enabled ?? true,
    receiptUrl: data.receipt_url ?? undefined,
  };
}

export async function updateVehicleService(
  id: string,
  input: Partial<VehicleService>,
): Promise<VehicleService> {
  const patch: Record<string, any> = {};
  if (input.serviceType !== undefined) patch.service_type = input.serviceType;
  if (input.serviceDate !== undefined) patch.service_date = input.serviceDate;
  if (input.mileageAtService !== undefined) patch.mileage_at_service = input.mileageAtService;
  if (input.workshopName !== undefined) patch.workshop_name = input.workshopName;
  if (input.workshopLocation !== undefined) patch.workshop_location = input.workshopLocation;
  if (input.mechanicName !== undefined) patch.mechanic_name = input.mechanicName;
  if (input.cost !== undefined) patch.cost = input.cost;
  if (input.partsCost !== undefined) patch.parts_cost = input.partsCost;
  if (input.laborCost !== undefined) patch.labor_cost = input.laborCost;
  if (input.description !== undefined) patch.description = input.description;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.nextServiceDate !== undefined) patch.next_service_date = input.nextServiceDate || null;
  if (input.nextServiceMileage !== undefined) patch.next_service_mileage = input.nextServiceMileage;
  if (input.reminderEnabled !== undefined) patch.reminder_enabled = input.reminderEnabled;
  if (input.receiptUrl !== undefined) patch.receipt_url = input.receiptUrl;

  const { data, error } = await supabase
    .from(SERVICES_TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    serviceType: data.service_type,
    serviceDate: data.service_date,
    mileageAtService: data.mileage_at_service ?? 0,
    workshopName: data.workshop_name ?? "",
    workshopLocation: data.workshop_location ?? "",
    mechanicName: data.mechanic_name ?? "",
    cost: Number(data.cost),
    partsCost: Number(data.parts_cost ?? 0),
    laborCost: Number(data.labor_cost ?? 0),
    description: data.description ?? "",
    notes: data.notes ?? "",
    nextServiceDate: data.next_service_date ?? "",
    nextServiceMileage: data.next_service_mileage ?? 0,
    reminderEnabled: data.reminder_enabled ?? true,
    receiptUrl: data.receipt_url ?? undefined,
  };
}

export async function deleteVehicleService(id: string): Promise<void> {
  const { error } = await supabase.from(SERVICES_TABLE).delete().eq("id", id);
  if (error) throw error;
}

