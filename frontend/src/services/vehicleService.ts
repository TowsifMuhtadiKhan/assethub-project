import { apiRequest } from "./api";
import type { Vehicle } from "../types";

export async function listVehicles(): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>("/vehicles");
}

export async function createVehicle(
  input: Partial<Vehicle> & { type: "Car" | "Bike" },
): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      type: input.type,
      brand: input.brand,
      model: input.model,
      year: input.year,
      registrationNumber: input.registrationNumber ?? "",
      mileage: input.mileage ?? 0,
      color: input.color ?? "",
      notes: input.notes ?? "",
      image: input.image ?? "",
      status: input.status ?? "GOOD",
    }),
  });
}

export async function updateVehicle(id: string, input: Partial<Vehicle>) {
  return apiRequest<Vehicle>(`/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteVehicle(id: string) {
  return apiRequest<void>(`/vehicles/${id}`, { method: "DELETE" });
}
