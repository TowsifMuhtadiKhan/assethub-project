import { useState } from "react";
import { Car, Bike, Truck, Bus, Zap, MoreHorizontal, Bell } from "lucide-react";
import type { Vehicle, VehicleType } from "../../types";

const VEHICLE_TYPE_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
  icon: typeof Car;
}> = [
  { value: "Car", label: "Car / Four-Wheeler", description: "Sedan, SUV, Hatchback, Jeep", icon: Car },
  { value: "Bike", label: "Motorcycle / Bike", description: "Standard, Sports, Cruiser", icon: Bike },
  { value: "Scooter", label: "Scooter", description: "Scooter, Moped, Vespas", icon: Bike },
  { value: "Commercial", label: "Commercial / Truck", description: "Truck, Pickup, Lorry", icon: Truck },
  { value: "Van", label: "Van / Microbus", description: "HiAce, Noah, Microbus", icon: Bus },
  { value: "Bicycle", label: "Bicycle / Cycle", description: "Manual or Electric Bicycle", icon: Bike },
  { value: "EV", label: "Electric Vehicle (EV)", description: "Tesla, BYD, Electric Car", icon: Zap },
  { value: "Other", label: "Other Vehicle", description: "Auto rickshaw, CNG, Specialty", icon: MoreHorizontal },
];

const DEFAULT_IMAGES: Record<string, string> = {
  Car: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  Bike: "https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80",
  Motorcycle: "https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80",
  Scooter: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
  Commercial: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80",
  Truck: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80",
  Van: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
  Bicycle: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80",
  EV: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=80",
  Other: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
};

export function VehicleEntryForm({
  type = "Car",
  onSubmit,
  onCancel,
  initialVehicle,
  submitLabel,
}: {
  type?: VehicleType;
  onSubmit: (payload: Partial<Vehicle> & { type: VehicleType }) => void;
  onCancel?: () => void;
  initialVehicle?: Vehicle;
  submitLabel?: string;
}) {
  const [selectedType, setSelectedType] = useState<VehicleType>(
    initialVehicle?.type ?? type ?? "Car",
  );
  const [customType, setCustomType] = useState(
    initialVehicle && !VEHICLE_TYPE_OPTIONS.some((opt) => opt.value === initialVehicle.type)
      ? initialVehicle.type
      : "",
  );
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
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [fitnessExpiry, setFitnessExpiry] = useState(
    initialVehicle?.fitnessExpiry || "",
  );
  const [taxTokenExpiry, setTaxTokenExpiry] = useState(
    initialVehicle?.taxTokenExpiry || "",
  );
  const [reminderLeadDays, setReminderLeadDays] = useState<number>(() => {
    const match = initialVehicle?.notes?.match(/\[Reminder: (\d+) days\]/);
    return match ? Number(match[1]) : 15;
  });
  const [validationError, setValidationError] = useState("");

  const updateField = (field: string, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError("");
  };

  const effectiveType = selectedType === "Other" && customType.trim() ? customType.trim() : selectedType;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.brand || !form.model) {
      setValidationError("Vehicle name, brand, and model are required.");
      return;
    }

    const image =
      initialVehicle?.image ||
      DEFAULT_IMAGES[selectedType] ||
      DEFAULT_IMAGES.Car;

    let finalNotes = form.notes.trim();
    if (reminderEnabled) {
      finalNotes = `${finalNotes} [Reminder: ${reminderLeadDays} days]`.trim();
    }

    onSubmit({
      type: effectiveType,
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      mileage: Number(form.mileage) || 0,
      color: form.color.trim(),
      notes: finalNotes,
      purchaseDate: initialVehicle?.purchaseDate || new Date().toISOString().slice(0, 10),
      purchasePrice: initialVehicle?.purchasePrice ?? 0,
      insuranceInfo: initialVehicle?.insuranceInfo || "Not added",
      taxTokenInfo: initialVehicle?.taxTokenInfo || "Not added",
      fitnessExpiry: fitnessExpiry || initialVehicle?.fitnessExpiry || new Date().toISOString().slice(0, 10),
      taxTokenExpiry: taxTokenExpiry || initialVehicle?.taxTokenExpiry,
      image,
      status: initialVehicle?.status || "GOOD",
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
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {initialVehicle ? "Edit Vehicle" : "Create Vehicle"}
            </span>
            <span className="text-xs text-slate-400 font-mono">LN-VEHICLE</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
            {initialVehicle ? `Edit ${initialVehicle.name}` : `New Vehicle Profile`}
          </h2>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Vehicle Type Selector */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Vehicle Type / Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VEHICLE_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200/90 bg-slate-50/60 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 shadow-2xs"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold leading-tight truncate">
                      {opt.label.split("/")[0].trim()}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {opt.value}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedType === "Other" && (
            <div className="mt-2.5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Specify Custom Vehicle Type <span className="text-rose-500">*</span>
              </label>
              <input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. CNG, Auto Rickshaw, Forklift, Boat"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
          )}
        </div>

        {/* Clean Standard Input Fields Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vehicle Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. My Civic, Red Pulsar, Daily Commuter"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Brand / Manufacturer <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.brand}
              onChange={(event) => updateField("brand", event.target.value)}
              placeholder="e.g. Toyota, Honda, Yamaha, Suzuki, Tata"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Model <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.model}
              onChange={(event) => updateField("model", event.target.value)}
              placeholder="e.g. Premio, Corolla Cross, R15, FZ-S, Ace"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manufacturing Year <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1950"
              max="2035"
              value={form.year}
              onChange={(event) => updateField("year", Number(event.target.value))}
              placeholder="e.g. 2022"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registration / Plate Number
            </label>
            <input
              value={form.registrationNumber}
              onChange={(event) => updateField("registrationNumber", event.target.value)}
              placeholder="e.g. Dhaka Metro GA 11-2233 or Serial No"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Registration plate (or Serial/NA for bicycles)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Mileage (km)
            </label>
            <input
              type="number"
              min="0"
              value={form.mileage}
              onChange={(event) => updateField("mileage", Number(event.target.value))}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Color / Paint
            </label>
            <input
              value={form.color}
              onChange={(event) => updateField("color", event.target.value)}
              placeholder="e.g. Pearl White, Metallic Black, Racing Blue"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Notes / Specs
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="e.g. Engine capacity 1500cc, smart card issued, tracking device installed, 2 keys."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>

          {/* Item-Specific WhatsApp Reminder Settings */}
          <div className="sm:col-span-2 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Automated WhatsApp Expiry Reminder (This Vehicle)
                </span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Active</span>
              </label>
            </div>

            {reminderEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Fitness Expiry Date
                  </label>
                  <input
                    type="date"
                    value={fitnessExpiry}
                    onChange={(e) => setFitnessExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tax Token Expiry
                  </label>
                  <input
                    type="date"
                    value={taxTokenExpiry}
                    onChange={(e) => setTaxTokenExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reminder Lead Time
                  </label>
                  <select
                    value={reminderLeadDays}
                    onChange={(e) => setReminderLeadDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value={3}>3 days before expiry</option>
                    <option value={7}>7 days before expiry</option>
                    <option value={15}>15 days before expiry (Recommended)</option>
                    <option value={30}>30 days before expiry</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {validationError && (
          <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {validationError}
          </p>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            {submitLabel ?? (initialVehicle ? "Update Vehicle" : `Save ${effectiveType || "Vehicle"}`)}
          </button>
        </div>
      </div>
    </form>
  );
}
