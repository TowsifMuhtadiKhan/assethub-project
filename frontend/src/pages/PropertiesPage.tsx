import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { apiRequest } from "../services/api";
import type { Property } from "../types";

export function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Property[]>("/properties")
      .then(setProperties)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load properties.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const saveProperty = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const property = await apiRequest<Property>("/properties", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          location: String(form.get("location")),
          type: String(form.get("type")),
          unitsCount: Number(form.get("unitsCount")),
          occupancyRate: Number(form.get("occupancyRate")),
        }),
      });
      setProperties((current) => [property, ...current]);
      setOpen(false);
      event.currentTarget.reset();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save property.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
            <p className="mt-2 text-slate-600">
              Manage your properties, units, tenants, and rent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            <Plus className="h-4 w-4" /> Add Property
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-slate-600">Loading properties...</div>
        ) : properties.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
            No properties added yet. Click Add Property to create your first
            one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Property</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Units</th>
                  <th className="px-5 py-4">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {property.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {property.location}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {property.type}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {property.unitsCount}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {property.occupancyRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={() => setOpen(false)}
        >
          <form
            onSubmit={saveProperty}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Property</h2>
              <button
                type="button"
                aria-label="Close form"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              name="name"
              required
              placeholder="Property name"
              className="field w-full"
            />
            <input
              name="location"
              required
              placeholder="Location"
              className="field w-full"
            />
            <select
              name="type"
              className="field w-full"
              defaultValue="Residential"
            >
              <option>Residential</option>
              <option>Commercial</option>
              <option>Mixed use</option>
              <option>Land</option>
              <option>Other</option>
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="unitsCount"
                type="number"
                min="0"
                placeholder="Number of units"
                className="field w-full"
              />
              <input
                name="occupancyRate"
                type="number"
                min="0"
                max="100"
                placeholder="Occupancy %"
                className="field w-full"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Save Property
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
