import { useState } from "react";
import TextField from "@mui/material/TextField";
import type { Vehicle } from "../../types";

export function VehicleEntryForm({
  type,
  onSubmit,
  initialVehicle,
  submitLabel,
}: {
  type: "Car" | "Bike";
  onSubmit: (payload: Partial<Vehicle> & { type: "Car" | "Bike" }) => void;
  initialVehicle?: Vehicle;
  submitLabel?: string;
}) {
  const [form, setForm] = useState({
    name: initialVehicle?.name ?? "",
    brand: initialVehicle?.brand ?? "",
    model: initialVehicle?.model ?? "",
    year: initialVehicle?.year ?? new Date().getFullYear(),
    registrationNumber: initialVehicle?.registrationNumber ?? "",
    mileage: initialVehicle?.mileage ?? 0,
    color: initialVehicle?.color ?? "",
    notes: initialVehicle?.notes ?? "",
  });
  const [validationError, setValidationError] = useState("");

  const updateField = (field: string, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.brand || !form.model || !form.registrationNumber) {
      setValidationError(
        "Vehicle name, brand, model, and registration number are required.",
      );
      return;
    }

    onSubmit({
      type,
      name: form.name,
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      mileage: Number(form.mileage),
      color: form.color,
      notes: form.notes,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchasePrice: 0,
      insuranceInfo: "Not added",
      taxTokenInfo: "Not added",
      fitnessExpiry: new Date().toISOString().slice(0, 10),
      image:
        type === "Car"
          ? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80"
          : "https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80",
      status: "GOOD",
    });

    setForm({
      name: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      registrationNumber: "",
      mileage: 0,
      color: "",
      notes: "",
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl"
    >
      <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {initialVehicle ? `Edit ${initialVehicle.name}` : `Add New ${type}`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fill in vehicle specs, license plate number, and odometer reading.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
          {type}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Vehicle Name *"
          size="small"
          required
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="e.g. My Civic / Daily Commuter"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Brand *"
          size="small"
          required
          value={form.brand}
          onChange={(event) => updateField("brand", event.target.value)}
          placeholder="e.g. Toyota, Honda, Yamaha"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Model *"
          size="small"
          required
          value={form.model}
          onChange={(event) => updateField("model", event.target.value)}
          placeholder="e.g. Premio, Corolla Cross, R15"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Manufacturing Year *"
          size="small"
          required
          type="number"
          value={form.year}
          onChange={(event) => updateField("year", Number(event.target.value))}
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Registration / Plate Number *"
          size="small"
          required
          value={form.registrationNumber}
          onChange={(event) => updateField("registrationNumber", event.target.value)}
          placeholder="e.g. Dhaka Metro GA 11-2233"
          helperText="Format: Dhaka Metro [Series] [Number]"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Current Mileage (km)"
          size="small"
          type="number"
          value={form.mileage}
          onChange={(event) => updateField("mileage", Number(event.target.value))}
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Color"
          size="small"
          value={form.color}
          onChange={(event) => updateField("color", event.target.value)}
          placeholder="e.g. Pearl White, Metallic Black"
          className="md:col-span-2"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />

        <TextField
          label="Additional Notes / Specs"
          size="small"
          multiline
          rows={3}
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="e.g. Engine capacity 1500cc, smart card issued, tracking device installed."
          className="md:col-span-2"
          slotProps={{
            input: {
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#f8fafc",
              },
            },
          }}
        />
      </div>

      {validationError && (
        <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          {validationError}
        </p>
      )}

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors"
        >
          {submitLabel ?? `Save ${type}`}
        </button>
      </div>
    </form>
  );
}
