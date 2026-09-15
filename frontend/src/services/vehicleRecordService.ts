import { apiRequest } from "./api";
import type { VehicleExpense, VehicleService } from "../types";

export function listVehicleExpenses(vehicleId: string) {
  return apiRequest<VehicleExpense[]>(`/vehicles/${vehicleId}/expenses`);
}

export function createVehicleExpense(input: Omit<VehicleExpense, "id">) {
  return apiRequest<VehicleExpense>(`/vehicles/${input.vehicleId}/expenses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listVehicleServices(vehicleId: string) {
  return apiRequest<VehicleService[]>(`/vehicles/${vehicleId}/maintenance`);
}

export function createVehicleService(input: Omit<VehicleService, "id">) {
  return apiRequest<VehicleService>(
    `/vehicles/${input.vehicleId}/maintenance`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
