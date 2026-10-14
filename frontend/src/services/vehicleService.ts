import { supabase } from "../lib/supabase";
import type { Vehicle, VehicleType } from "../types";

const TABLE = "lifenest_vehicles";

// Helper to parse extended specs (CC, Fuel, Seats) embedded in notes
export function parseVehicleSpecsFromNotes(notes?: string): {
  cubicCapacity?: string;
  fuelType?: string;
  seatingCapacity?: string;
} {
  if (!notes) return {};
  const match = notes.match(/\[Specs:\s*([^\]]+)\]/i);
  if (!match) return {};
  const parts = match[1].split(",").map((s) => s.trim());
  const res: { cubicCapacity?: string; fuelType?: string; seatingCapacity?: string } = {};
  for (const part of parts) {
    const [k, v] = part.split(":").map((s) => s.trim());
    if (!k || !v) continue;
    const lk = k.toLowerCase();
    if (lk.includes("cc") || lk.includes("displacement") || lk.includes("cubic")) res.cubicCapacity = v;
    else if (lk.includes("fuel")) res.fuelType = v;
    else if (lk.includes("seat")) res.seatingCapacity = v;
  }
  return res;
}

export function embedVehicleSpecsIntoNotes(
  currentNotes: string,
  specs: { cubicCapacity?: string; fuelType?: string; seatingCapacity?: string }
): string {
  const clean = (currentNotes || "").replace(/\[Specs:[^\]]*\]/gi, "").trim();
  const specsParts: string[] = [];
  if (specs.cubicCapacity) specsParts.push(`CC: ${specs.cubicCapacity}`);
  if (specs.fuelType) specsParts.push(`Fuel: ${specs.fuelType}`);
  if (specs.seatingCapacity) specsParts.push(`Seats: ${specs.seatingCapacity}`);
  if (specsParts.length === 0) return clean;
  const tag = `[Specs: ${specsParts.join(", ")}]`;
  return clean ? `${clean}\n${tag}` : tag;
}

export function normalizeVehicleType(rawType?: string): VehicleType {
  const t = (rawType || "").toLowerCase().trim();
  if (t.includes("bike") || t.includes("motorcycle") || t === "two-wheeler") return "Bike";
  if (t.includes("scooter") || t.includes("moped")) return "Scooter";
  if (t.includes("truck") || t.includes("commercial") || t.includes("pickup") || t.includes("lorry") || t.includes("van") || t.includes("microbus")) return "Commercial";
  if (t.includes("bicycle") || t.includes("cycle")) return "Other";
  if (t.includes("car") || t.includes("sedan") || t.includes("suv") || t.includes("hatchback") || t.includes("jeep") || t.includes("ev")) return "Car";
  return (rawType as VehicleType) || "Car";
}

// Helper to convert database row to Vehicle type
function mapVehicleFromRow(row: Record<string, any>): Vehicle {
  const specs = parseVehicleSpecsFromNotes(row.notes);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    brand: row.brand ?? "",
    model: row.model ?? "",
    year: row.year ?? 2024,
    registrationNumber: row.registration_number ?? "",
    chassisNumber: row.chassis_number ?? "",
    engineNumber: row.engine_number ?? "",
    mileage: row.mileage ?? 0,
    purchaseDate: row.purchase_date ?? "",
    purchasePrice: Number(row.purchase_price ?? 0),
    color: row.color ?? "",
    ownershipInfo: row.ownership_info ?? "",
    insuranceInfo: row.insurance_info ?? "",
    taxTokenInfo: row.tax_token_info ?? "",
    fitnessExpiry: row.fitness_expiry ?? "",
    taxTokenExpiry: row.tax_token_expiry ?? "",
    insuranceExpiry: row.insurance_expiry ?? "",
    routePermitExpiry: row.route_permit_expiry ?? "",
    notes: row.notes ?? "",
    image: row.image ?? "",
    status: row.status ?? "GOOD",
    cubicCapacity: specs.cubicCapacity,
    fuelType: specs.fuelType,
    seatingCapacity: specs.seatingCapacity,
  };
}

export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapVehicleFromRow);
}

export async function createVehicle(
  input: Partial<Vehicle> & { type: VehicleType },
): Promise<Vehicle> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const safeType = normalizeVehicleType(input.type);

  const rowData: Record<string, any> = {
    owner_id: user.id,
    name: input.name,
    type: safeType,
    brand: input.brand ?? "",
    model: input.model ?? "",
    year: input.year ?? 2024,
    registration_number: input.registrationNumber ?? "",
    chassis_number: input.chassisNumber ?? "",
    engine_number: input.engineNumber ?? "",
    mileage: input.mileage ?? 0,
    purchase_date: input.purchaseDate || null,
    purchase_price: input.purchasePrice ?? 0,
    color: input.color ?? "",
    ownership_info: input.ownershipInfo ?? "",
    insurance_info: input.insuranceInfo ?? "",
    tax_token_info: input.taxTokenInfo ?? "",
    fitness_expiry: input.fitnessExpiry || null,
    tax_token_expiry: input.taxTokenExpiry || null,
    insurance_expiry: input.insuranceExpiry || null,
    route_permit_expiry: input.routePermitExpiry || null,
    notes: input.notes ?? "",
    image: input.image ?? "",
    status: input.status ?? "GOOD",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rowData)
    .select()
    .single();

  if (error) throw error;
  return mapVehicleFromRow(data);
}

export async function updateVehicle(
  id: string,
  input: Partial<Vehicle>,
): Promise<Vehicle> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = normalizeVehicleType(input.type);
  if (input.brand !== undefined) patch.brand = input.brand;
  if (input.model !== undefined) patch.model = input.model;
  if (input.year !== undefined) patch.year = input.year;
  if (input.registrationNumber !== undefined)
    patch.registration_number = input.registrationNumber;
  if (input.chassisNumber !== undefined)
    patch.chassis_number = input.chassisNumber;
  if (input.engineNumber !== undefined)
    patch.engine_number = input.engineNumber;
  if (input.mileage !== undefined) patch.mileage = input.mileage;
  if (input.purchaseDate !== undefined)
    patch.purchase_date = input.purchaseDate || null;
  if (input.purchasePrice !== undefined)
    patch.purchase_price = input.purchasePrice;
  if (input.color !== undefined) patch.color = input.color;
  if (input.ownershipInfo !== undefined)
    patch.ownership_info = input.ownershipInfo;
  if (input.insuranceInfo !== undefined)
    patch.insurance_info = input.insuranceInfo;
  if (input.taxTokenInfo !== undefined)
    patch.tax_token_info = input.taxTokenInfo;
  if (input.fitnessExpiry !== undefined)
    patch.fitness_expiry = input.fitnessExpiry || null;
  if (input.taxTokenExpiry !== undefined)
    patch.tax_token_expiry = input.taxTokenExpiry || null;
  if (input.insuranceExpiry !== undefined)
    patch.insurance_expiry = input.insuranceExpiry || null;
  if (input.routePermitExpiry !== undefined)
    patch.route_permit_expiry = input.routePermitExpiry || null;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (
    input.cubicCapacity !== undefined ||
    input.fuelType !== undefined ||
    input.seatingCapacity !== undefined
  ) {
    const existingNotes = (patch.notes as string) ?? input.notes ?? "";
    patch.notes = embedVehicleSpecsIntoNotes(existingNotes, {
      cubicCapacity: input.cubicCapacity,
      fuelType: input.fuelType,
      seatingCapacity: input.seatingCapacity,
    });
  }
  if (input.image !== undefined) patch.image = input.image;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapVehicleFromRow(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

