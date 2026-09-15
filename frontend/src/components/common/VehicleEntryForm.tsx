import { useState } from "react";
import type { Vehicle } from "../../types";

export function VehicleEntryForm({
  type,
  onSubmit,
}: {
  type: "Car" | "Bike";
  onSubmit: (payload: Partial<Vehicle> & { type: "Car" | "Bike" }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    registrationNumber: "",
    mileage: 0,
    color: "",
    notes: "",
  });
  const [validationError, setValidationError] = useState("");

  const updateField = (field: string, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.brand || !form.model || !form.registrationNumber) {
      setValidationError("Vehicle name, brand, model, and registration number are required.");
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

  const inputClass = "rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-cyan-500";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-lg font-semibold text-slate-900">Add {type}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Vehicle name" className={inputClass} />
        <input required value={form.brand} onChange={(event) => updateField("brand", event.target.value)} placeholder="Brand (for example Toyota)" className={inputClass} />
        <input required value={form.model} onChange={(event) => updateField("model", event.target.value)} placeholder="Model (for example Premio)" className={inputClass} />
        <input required type="number" value={form.year} onChange={(event) => updateField("year", Number(event.target.value))} placeholder="Year" className={inputClass} />
        <input required value={form.registrationNumber} onChange={(event) => updateField("registrationNumber", event.target.value)} placeholder="Dhaka Metro LA 33-3617" className={inputClass} />
        <input type="number" min="0" value={form.mileage} onChange={(event) => updateField("mileage", Number(event.target.value))} placeholder="Current mileage" className={inputClass} />
        <input value={form.color} onChange={(event) => updateField("color", event.target.value)} placeholder="Color" className={`${inputClass} md:col-span-2`} />
        <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Notes" className={`${inputClass} min-h-[110px] md:col-span-2`} />
      </div>
      {validationError && <p className="mt-3 text-sm text-rose-600">{validationError}</p>}
      <button type="submit" className="mt-4 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500">Save {type}</button>
    </form>
  );
}
