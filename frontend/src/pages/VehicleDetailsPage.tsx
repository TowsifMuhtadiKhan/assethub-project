import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { listVehicles } from "../services/vehicleService";
import {
  createVehicleExpense,
  createVehicleService,
  listVehicleExpenses,
  listVehicleServices,
} from "../services/vehicleRecordService";
import type {
  ServiceType,
  Vehicle,
  VehicleExpense,
  VehicleService,
} from "../types";

const serviceTypes: ServiceType[] = [
  "Engine oil / Mobil change",
  "Brake pads",
  "Battery",
  "Tire replacement",
  "AC servicing",
  "General servicing",
  "Other/custom service",
];
const expenseCategories = [
  "Fuel",
  "Maintenance",
  "Repair",
  "Insurance",
  "Registration",
  "Tax Token",
  "Parking",
  "Toll",
  "Car Wash",
  "Other",
];

export function VehicleDetailsPage() {
  const { vehicleId = "" } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle>();
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      listVehicles(),
      listVehicleExpenses(vehicleId),
      listVehicleServices(vehicleId),
    ])
      .then(([vehicles, nextExpenses, nextServices]) => {
        const found = vehicles.find((item) => item.id === vehicleId);
        if (!found) throw new Error("Vehicle not found.");
        setVehicle(found);
        setExpenses(nextExpenses);
        setServices(nextServices);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load vehicle.",
        ),
      );
  }, [vehicleId]);

  const saveExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const created = await createVehicleExpense({
        vehicleId,
        date: String(form.get("date")),
        category: String(form.get("category")) as VehicleExpense["category"],
        amount: Number(form.get("amount")),
        mileage: Number(form.get("mileage")),
        description: String(form.get("description")),
        paymentMethod: String(form.get("paymentMethod")),
      });
      setExpenses((current) => [created, ...current]);
      event.currentTarget.reset();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const created = await createVehicleService({
        vehicleId,
        serviceType: String(form.get("serviceType")) as ServiceType,
        serviceDate: String(form.get("serviceDate")),
        mileageAtService: Number(form.get("mileageAtService")),
        workshopName: String(form.get("workshopName")),
        workshopLocation: "",
        mechanicName: "",
        cost: Number(form.get("cost")),
        partsCost: 0,
        laborCost: 0,
        description: String(form.get("description")),
        notes: "",
        nextServiceDate: String(form.get("nextServiceDate")),
        nextServiceMileage: 0,
        reminderEnabled: true,
      });
      setServices((current) => [created, ...current]);
      event.currentTarget.reset();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save maintenance.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!vehicle)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {error || "Loading vehicle..."}
      </div>
    );
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <img
            src={vehicle.image}
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {vehicle.name}
            </h1>
            <p className="text-slate-500">
              {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <RecordForm title="Add expense" onSubmit={saveExpense} saving={saving}>
          <input name="date" type="date" required className="field" />
          <select name="category" className="field" defaultValue="Fuel">
            {expenseCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            min="0"
            required
            placeholder="Amount"
            className="field"
          />
          <input
            name="mileage"
            type="number"
            min="0"
            placeholder="Mileage"
            className="field"
          />
          <input
            name="paymentMethod"
            required
            placeholder="Payment method"
            className="field sm:col-span-2"
          />
          <input
            name="description"
            required
            placeholder="What was this expense for?"
            className="field sm:col-span-2"
          />
          <FilePicker />
        </RecordForm>
        <RecordForm
          title="Add maintenance"
          onSubmit={saveService}
          saving={saving}
        >
          <select name="serviceType" className="field sm:col-span-2">
            {serviceTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input name="serviceDate" type="date" required className="field" />
          <input
            name="mileageAtService"
            type="number"
            required
            placeholder="Mileage at service"
            className="field"
          />
          <input
            name="workshopName"
            required
            placeholder="Workshop name"
            className="field"
          />
          <input
            name="cost"
            type="number"
            min="0"
            required
            placeholder="Total cost"
            className="field"
          />
          <input name="nextServiceDate" type="date" className="field" />
          <input
            name="description"
            required
            placeholder="Work completed"
            className="field"
          />
          <FilePicker />
        </RecordForm>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <RecordList
          title="Expenses"
          empty="No expenses for this vehicle."
          items={expenses.map((item) => ({
            title: item.category,
            date: item.date,
            detail: `${item.description} · ${item.amount.toLocaleString()} · ${item.paymentMethod}`,
            url: item.receiptUrl,
          }))}
        />
        <RecordList
          title="Maintenance history"
          empty="No maintenance for this vehicle."
          items={services.map((item) => ({
            title: item.serviceType,
            date: item.serviceDate,
            detail: `${item.description} · ${item.cost.toLocaleString()} · ${item.workshopName}`,
            url: item.receiptUrl,
          }))}
        />
      </div>
    </div>
  );
}

function RecordForm({
  title,
  onSubmit,
  saving,
  children,
}: {
  title: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <h2 className="text-lg font-bold text-slate-900 sm:col-span-2">
        {title}
      </h2>
      {children}
      <button
        disabled={saving}
        className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
      >
        {saving ? "Saving..." : "Save record"}
      </button>
    </form>
  );
}
function FilePicker() {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 sm:col-span-2">
      <Upload className="h-4 w-4" /> Attach receipt or PDF
      <input name="file" type="file" accept="image/*,.pdf" className="hidden" />
    </label>
  );
}
function RecordList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { title: string; date: string; detail: string; url?: string }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.date}-${index}`}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex justify-between gap-3">
                <b>{item.title}</b>
                <span className="text-xs text-slate-500">{item.date}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-700"
                >
                  Open file <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}
