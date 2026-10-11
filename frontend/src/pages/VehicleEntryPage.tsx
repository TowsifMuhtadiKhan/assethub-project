import { VehicleBrandLogo } from "../components/common/VehicleBrandLogo";
import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Bike,
  Truck,
  Bus,
  Zap,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Search,
  Layers,
  BarChart3,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VehicleEntryForm } from "../components/common/VehicleEntryForm";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from "../services/vehicleService";
import type { Vehicle, VehicleType } from "../types";

export function getVehicleIcon(type: string) {
  const normalized = (type || "").toLowerCase();
  if (normalized.includes("bike") || normalized.includes("motorcycle") || normalized.includes("cycle")) {
    return Bike;
  }
  if (normalized.includes("truck") || normalized.includes("commercial")) {
    return Truck;
  }
  if (normalized.includes("van") || normalized.includes("bus")) {
    return Bus;
  }
  if (normalized.includes("ev") || normalized.includes("electric")) {
    return Zap;
  }
  if (normalized.includes("scooter")) {
    return Bike;
  }
  if (normalized.includes("car")) {
    return Car;
  }
  return MoreHorizontal;
}

export function getVehicleTypeBadgeClass(type: string) {
  const normalized = (type || "").toLowerCase();
  if (normalized.includes("car")) {
    return "bg-blue-50 text-blue-700 border-blue-200/60";
  }
  if (normalized.includes("bike") || normalized.includes("motorcycle")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  }
  if (normalized.includes("scooter")) {
    return "bg-teal-50 text-teal-700 border-teal-200/60";
  }
  if (normalized.includes("truck") || normalized.includes("commercial")) {
    return "bg-amber-50 text-amber-700 border-amber-200/60";
  }
  if (normalized.includes("van") || normalized.includes("bus")) {
    return "bg-purple-50 text-purple-700 border-purple-200/60";
  }
  if (normalized.includes("bicycle")) {
    return "bg-sky-50 text-sky-700 border-sky-200/60";
  }
  if (normalized.includes("ev") || normalized.includes("electric")) {
    return "bg-violet-50 text-violet-700 border-violet-200/60";
  }
  return "bg-slate-100 text-slate-700 border-slate-200/60";
}

export function VehicleEntryPage({
  filterType = "All",
}: {
  filterType?: string;
}) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<string>(filterType);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle>();

  // Sync active tab if filterType prop changes (e.g. user navigated from route /cars or /bikes)
  useEffect(() => {
    setActiveTab(filterType);
  }, [filterType]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listVehicles();
        setVehicles(data);
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
  }, []);

  const counts = useMemo(() => {
    const total = vehicles.length;
    const cars = vehicles.filter((v) => (v.type || "").toLowerCase().includes("car")).length;
    const bikes = vehicles.filter((v) => {
      const t = (v.type || "").toLowerCase();
      return t === "bike" || t === "motorcycle";
    }).length;
    const scooters = vehicles.filter((v) => (v.type || "").toLowerCase().includes("scooter")).length;
    const commercial = vehicles.filter((v) => {
      const t = (v.type || "").toLowerCase();
      return t.includes("truck") || t.includes("commercial");
    }).length;
    const vans = vehicles.filter((v) => (v.type || "").toLowerCase().includes("van")).length;
    const bicycles = vehicles.filter((v) => (v.type || "").toLowerCase().includes("bicycle")).length;
    const other = total - (cars + bikes + scooters + commercial + vans + bicycles);
    return { total, cars, bikes, scooters, commercial, vans, bicycles, other: Math.max(0, other) };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const t = (vehicle.type || "").toLowerCase();
      let matchesTab = true;

      if (activeTab === "All") {
        matchesTab = true;
      } else if (activeTab === "Car") {
        matchesTab = t.includes("car");
      } else if (activeTab === "Bike") {
        matchesTab = t === "bike" || t === "motorcycle";
      } else if (activeTab === "Scooter") {
        matchesTab = t.includes("scooter");
      } else if (activeTab === "Commercial") {
        matchesTab = t.includes("truck") || t.includes("commercial");
      } else if (activeTab === "Van") {
        matchesTab = t.includes("van");
      } else if (activeTab === "Bicycle") {
        matchesTab = t.includes("bicycle");
      } else if (activeTab === "Other") {
        matchesTab =
          !t.includes("car") &&
          t !== "bike" &&
          t !== "motorcycle" &&
          !t.includes("scooter") &&
          !t.includes("truck") &&
          !t.includes("commercial") &&
          !t.includes("van") &&
          !t.includes("bicycle");
      } else {
        matchesTab = t === activeTab.toLowerCase();
      }

      if (!matchesTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchTarget = `${vehicle.name} ${vehicle.brand} ${vehicle.model} ${vehicle.registrationNumber || ""} ${vehicle.color || ""} ${vehicle.type || ""}`.toLowerCase();
        return searchTarget.includes(q);
      }

      return true;
    });
  }, [vehicles, activeTab, searchQuery]);

  const handleSubmit = async (
    payload: Partial<Vehicle> & { type: VehicleType },
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
        `Delete ${vehicle.name}? This will also delete all fuel and maintenance logs.`,
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

  const pageTitle =
    activeTab === "All"
      ? "All Vehicles & Fleet"
      : activeTab === "Car"
      ? "Cars & Four-Wheelers"
      : activeTab === "Bike"
      ? "Motorcycles & Two-Wheelers"
      : activeTab === "Scooter"
      ? "Scooters & Mopeds"
      : activeTab === "Commercial"
      ? "Commercial Trucks & Pickups"
      : activeTab === "Van"
      ? "Vans & Microbuses"
      : activeTab === "Bicycle"
      ? "Bicycles & Cycles"
      : `${activeTab} Vehicles`;

  const pageSubtitle =
    activeTab === "All"
      ? "Manage all cars, bikes, scooters, commercial and private vehicles, registrations, fuel, and BRTA fitness records."
      : activeTab === "Car"
      ? "Manage specs, registration numbers, mileage, fuel logs, and BRTA fitness records."
      : activeTab === "Bike"
      ? "Manage specs, registration numbers, mileage, fuel logs, and bike servicing."
      : "Manage vehicle specs, registration numbers, mileage, and maintenance logs.";

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-2xs">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 mb-3" />
        <p className="text-xs font-medium">Loading your vehicle records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {pageTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/assets/vehicles/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
          >
            <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
            <span>Vehicle Dashboard & Fuel</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingVehicle(undefined);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {activeTab !== "All" ? activeTab : "Vehicle"}
          </button>
        </div>
      </div>

      {/* Fleet Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Total Vehicles</span>
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{counts.total}</div>
          <div className="text-[10px] text-slate-400">Cars, bikes, and fleet</div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-medium text-slate-500">Cars</span>
            <Car className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{counts.cars}</div>
          <div className="text-[10px] text-slate-400">Sedans, SUVs & 4-wheelers</div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-medium text-slate-500">Bikes & Scooters</span>
            <Bike className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{counts.bikes + counts.scooters}</div>
          <div className="text-[10px] text-slate-400">{counts.bikes} bikes · {counts.scooters} scooters</div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-medium text-slate-500">Commercial / Other</span>
            <Truck className="h-3.5 w-3.5" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {counts.commercial + counts.vans + counts.other + counts.bicycles}
          </div>
          <div className="text-[10px] text-slate-400">Trucks, vans & specialty</div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "All", label: "All Vehicles", count: counts.total },
            { id: "Car", label: "Cars", count: counts.cars },
            { id: "Bike", label: "Bikes", count: counts.bikes },
            { id: "Scooter", label: "Scooters", count: counts.scooters },
            { id: "Commercial", label: "Commercial", count: counts.commercial },
            { id: "Van", label: "Vans", count: counts.vans },
            { id: "Bicycle", label: "Bicycles", count: counts.bicycles },
            { id: "Other", label: "Other", count: counts.other },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, plate, model..."
            className="w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Setup banner if tables are missing */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Table of Vehicles */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {filteredVehicles.length === 0 ? (
          <div className="border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
              <Car className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              No {activeTab !== "All" ? `${activeTab.toLowerCase()}s` : "vehicles"} found
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery
                ? `No vehicles match "${searchQuery}". Clear your search or add a new record.`
                : `Click "Add ${activeTab !== "All" ? activeTab : "Vehicle"}" to record your first vehicle specs & logs.`}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingVehicle(undefined);
                setFormOpen(true);
              }}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {activeTab !== "All" ? activeTab : "Vehicle"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Vehicle</th>
                  <th className="px-3.5 py-2.5 font-semibold">Type</th>
                  <th className="px-3.5 py-2.5 font-semibold">Brand / Model</th>
                  <th className="px-3.5 py-2.5 font-semibold">Year</th>
                  <th className="px-3.5 py-2.5 font-semibold">Registration</th>
                  <th className="px-3.5 py-2.5 font-semibold">Mileage</th>
                  <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => {

                  return (
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
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                            <VehicleBrandLogo brand={vehicle.brand} type={vehicle.type} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {vehicle.name}
                            </div>
                            {vehicle.color && (
                              <div className="text-[10px] text-slate-400">
                                {vehicle.color}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getVehicleTypeBadgeClass(
                            vehicle.type,
                          )}`}
                        >
                          {vehicle.type || "Vehicle"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">
                        {vehicle.brand} {vehicle.model}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">
                        {vehicle.year}
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        {vehicle.registrationNumber ? (
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200">
                            {vehicle.registrationNumber}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-400">—</span>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => {
            setFormOpen(false);
            setEditingVehicle(undefined);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <VehicleEntryForm
              type={
                editingVehicle?.type ||
                (activeTab !== "All" && activeTab !== "Other"
                  ? (activeTab as VehicleType)
                  : "Car")
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormOpen(false);
                setEditingVehicle(undefined);
              }}
              initialVehicle={editingVehicle}
              submitLabel={editingVehicle ? "Update vehicle" : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
