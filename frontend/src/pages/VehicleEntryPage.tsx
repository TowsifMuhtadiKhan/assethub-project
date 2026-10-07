import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VehicleEntryForm } from "../components/common/VehicleEntryForm";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from "../services/vehicleService";
import type { Vehicle } from "../types";

export function VehicleEntryPage({ type }: { type: "Car" | "Bike" }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle>();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listVehicles();
        setVehicles(data.filter((vehicle) => vehicle.type === type));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load vehicles.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [type]);

  const handleSubmit = async (
    payload: Partial<Vehicle> & { type: "Car" | "Bike" },
  ) => {
    setError("");
    try {
      const saved = editingVehicle
        ? await updateVehicle(editingVehicle.id, payload)
        : await createVehicle(payload);
      setVehicles((current) =>
        editingVehicle
          ? current.map((vehicle) =>
              vehicle.id === saved.id ? saved : vehicle,
            )
          : [saved, ...current],
      );
      setFormOpen(false);
      setEditingVehicle(undefined);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save vehicle.",
      );
    }
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormOpen(true);
  };

  const removeVehicle = async (vehicle: Vehicle) => {
    if (
      !window.confirm(
        `Delete ${vehicle.name}? This will also delete its records.`,
      )
    )
      return;
    setError("");
    try {
      await deleteVehicle(vehicle.id);
      setVehicles((current) =>
        current.filter((item) => item.id !== vehicle.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete vehicle.",
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
        Loading your vehicles...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {type === "Car" ? "Cars & Four-Wheelers" : "Motorcycles & Two-Wheelers"}
          </h1>
          <p className="text-xs text-slate-500">
            Manage specs, registration numbers, mileage, and BRTA fitness records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingVehicle(undefined);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {type}
        </button>
      </div>

      {/* Setup banner if tables are missing */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {vehicles.length === 0 ? (
          <div className="border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
            No {type.toLowerCase()}s recorded yet. Click "Add {type}" to record your first vehicle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Vehicle</th>
                  <th className="px-3.5 py-2.5 font-semibold">Brand / Model</th>
                  <th className="px-3.5 py-2.5 font-semibold">Year</th>
                  <th className="px-3.5 py-2.5 font-semibold">Registration</th>
                  <th className="px-3.5 py-2.5 font-semibold">Mileage</th>
                  <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter")
                        navigate(`/vehicles/${vehicle.id}`);
                    }}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-medium text-slate-900">
                      {vehicle.name}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">
                      {vehicle.brand} {vehicle.model}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">
                      {vehicle.year}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                      {vehicle.registrationNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                      {vehicle.mileage.toLocaleString()} km
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200/50">
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEdit(vehicle)}
                          className="rounded p-1 text-slate-400 hover:text-slate-800"
                          aria-label={`Edit ${vehicle.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeVehicle(vehicle)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600"
                          aria-label={`Delete ${vehicle.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={() => setFormOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="Close form"
                onClick={() => {
                  setFormOpen(false);
                  setEditingVehicle(undefined);
                }}
                className="rounded-full bg-white p-2 text-slate-500 shadow hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <VehicleEntryForm
              type={type}
              onSubmit={handleSubmit}
              initialVehicle={editingVehicle}
              submitLabel={editingVehicle ? "Update vehicle" : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
