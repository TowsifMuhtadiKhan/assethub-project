import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VehicleEntryForm } from "../components/common/VehicleEntryForm";
import { createVehicle, listVehicles } from "../services/vehicleService";
import type { Vehicle } from "../types";

export function VehicleEntryPage({ type }: { type: "Car" | "Bike" }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

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
      const created = await createVehicle(payload);
      setVehicles((current) => [
        created,
        ...current.filter((vehicle) => vehicle.type === type),
      ]);
      setFormOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save vehicle.",
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {type === "Car" ? "Cars" : "Bikes"}
            </h1>
            <p className="mt-2 text-slate-600">
              Add and manage your vehicles through the AssetHub API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            <Plus className="h-4 w-4" />
            Add {type}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {vehicles.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
            No {type.toLowerCase()}s added yet. Click Add {type} to create your
            first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Vehicle</th>
                  <th className="px-5 py-4 font-semibold">Brand / Model</th>
                  <th className="px-5 py-4 font-semibold">Year</th>
                  <th className="px-5 py-4 font-semibold">Registration</th>
                  <th className="px-5 py-4 font-semibold">Mileage</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
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
                    className="cursor-pointer hover:bg-cyan-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                      {vehicle.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {vehicle.brand} / {vehicle.model}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {vehicle.year}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {vehicle.registrationNumber || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {vehicle.mileage.toLocaleString()} km
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {vehicle.status}
                      </span>
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
                onClick={() => setFormOpen(false)}
                className="rounded-full bg-white p-2 text-slate-500 shadow hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <VehicleEntryForm type={type} onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </div>
  );
}
