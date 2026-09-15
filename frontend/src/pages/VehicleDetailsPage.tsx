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
const maintenanceOptions = [
  "Mobil change",
  "Air filter",
  "Oil filter",
  "AC filter",
  "AC servicing",
  "Brake pads",
  "General servicing",
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
  const [activeTab, setActiveTab] = useState<
    "fuel" | "maintenance" | "expense"
  >("fuel");

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
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    try {
      const form = new FormData(formElement);
      const file = form.get("file");
      const receiptUrl = file instanceof File && file.size > 0
        ? await fileToDataUrl(file)
        : undefined;
      const created = await createVehicleExpense({
        vehicleId,
        date: String(form.get("date")),
        category: String(form.get("category")) as VehicleExpense["category"],
        amount: Number(form.get("amount")),
        mileage: Number(form.get("mileage")),
        description: String(form.get("description")),
        paymentMethod: String(form.get("paymentMethod")),
        fuelLiters: Number(form.get("fuelLiters")) || undefined,
        receiptUrl,
      });
      setExpenses((current) => [created, ...current]);
      formElement.reset();
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
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    try {
      const form = new FormData(formElement);
      const file = form.get("file");
      const receiptUrl = file instanceof File && file.size > 0
        ? await fileToDataUrl(file)
        : undefined;
      const created = await createVehicleService({
        vehicleId,
        serviceType:
          String(form.get("serviceType")) === "Other"
            ? (String(form.get("customServiceType")) as ServiceType)
            : (String(form.get("serviceType")) as ServiceType),
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
        receiptUrl,
      });
      setServices((current) => [created, ...current]);
      formElement.reset();
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

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const isLastMonth = (value: string) => {
    const date = new Date(value);
    return (
      date.getFullYear() === lastMonth.getFullYear() &&
      date.getMonth() === lastMonth.getMonth()
    );
  };
  const fuelExpenses = expenses.filter((item) => item.category === "Fuel");
  const otherExpenses = expenses.filter((item) => item.category !== "Fuel");
  const totalFuel = fuelExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalMaintenance = services.reduce(
    (sum, item) => sum + Number(item.cost),
    0,
  );
  const totalOtherExpenses = otherExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const lastMonthFuel = fuelExpenses
    .filter((item) => isLastMonth(item.date))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const lastMonthMaintenance = services
    .filter((item) => isLastMonth(item.serviceDate))
    .reduce((sum, item) => sum + Number(item.cost), 0);
  const lastMonthOtherExpenses = otherExpenses
    .filter((item) => isLastMonth(item.date))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const formatMoney = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

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
      <div className="grid gap-4 md:grid-cols-3">
        <CostCard
          title="Fuel cost"
          total={formatMoney(totalFuel)}
          lastMonth={formatMoney(lastMonthFuel)}
          detail={`${fuelExpenses.reduce((sum, item) => sum + Number(item.fuelLiters ?? 0), 0).toLocaleString()} L recorded`}
        />
        <CostCard
          title="Maintenance cost"
          total={formatMoney(totalMaintenance)}
          lastMonth={formatMoney(lastMonthMaintenance)}
          detail={`${services.length} maintenance record${services.length === 1 ? "" : "s"}`}
        />
        <CostCard
          title="Other expenses"
          total={formatMoney(totalOtherExpenses)}
          lastMonth={formatMoney(lastMonthOtherExpenses)}
          detail={`${otherExpenses.length} expense record${otherExpenses.length === 1 ? "" : "s"}`}
        />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {[
            ["fuel", "Fuel Log"],
            ["maintenance", "Maintenance"],
            ["expense", "Expense"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "fuel" && (
          <RecordForm
            title="Add fuel entry"
            onSubmit={saveExpense}
            saving={saving}
          >
            <input name="date" type="date" required className="field" />
            <input
              name="amount"
              type="number"
              min="0"
              required
              placeholder="Fuel amount"
              className="field"
            />
            <input
              name="fuelLiters"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Liters"
              className="field"
            />
            <input
              name="mileage"
              type="number"
              min="0"
              placeholder="Mileage"
              className="field"
            />
            <input type="hidden" name="category" value="Fuel" />
            <input
              name="paymentMethod"
              required
              placeholder="Payment method"
              className="field"
            />
            <input
              name="description"
              required
              placeholder="Fuel station or note"
              className="field sm:col-span-2"
            />
            <FilePicker />
          </RecordForm>
        )}
        {activeTab === "expense" && (
          <RecordForm
            title="Add expense"
            onSubmit={saveExpense}
            saving={saving}
          >
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
              name="fuelLiters"
              type="number"
              min="0"
              step="0.01"
              placeholder="Fuel liters (for Fuel)"
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
        )}
        {activeTab === "maintenance" && (
          <RecordForm
            title="Add maintenance"
            onSubmit={saveService}
            saving={saving}
          >
            <select name="serviceType" className="field sm:col-span-2">
              {maintenanceOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              name="customServiceType"
              placeholder="If Other: write maintenance type"
              className="field sm:col-span-2"
            />
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
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <RecordList
          title="Fuel log"
          empty="No fuel entries for this vehicle."
          items={expenses
            .filter((item) => item.category === "Fuel")
            .map((item) => ({
              title: `${item.fuelLiters ?? 0} L fuel`,
              date: item.date,
              detail: `${item.amount.toLocaleString()} · ${item.description} · ${item.paymentMethod}`,
            }))}
        />
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

function fileToDataUrl(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("Attachment must be 5 MB or smaller."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}

function CostCard({
  title,
  total,
  lastMonth,
  detail,
}: {
  title: string;
  total: string;
  lastMonth: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{total}</div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">Last month</span>
        <span className="font-semibold text-cyan-700">{lastMonth}</span>
      </div>
      <div className="mt-2 text-xs text-slate-400">{detail}</div>
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
