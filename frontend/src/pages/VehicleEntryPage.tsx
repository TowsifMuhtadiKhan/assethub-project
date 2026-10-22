import { VehicleBrandLogo } from "../components/common/VehicleBrandLogo";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  ExternalLink,
  Filter,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VehicleEntryForm } from "../components/common/VehicleEntryForm";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { TableRowActions } from "../components/common/TableRowActions";
import { ViewModeToggle } from "../components/common/ViewModeToggle";
import { UiPageHeader, UiButton } from "../components/design-system";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from "../services/vehicleService";
import { getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import { checkPlanLimit, type PlanTier } from "../services/subscriptionService";
import { PlanUpgradeModal } from "../components/common/PlanUpgradeModal";
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
  const [viewMode, setViewMode] = useState<"table" | "grid">(
    typeof window !== "undefined" && window.innerWidth < 768 ? "grid" : "table"
  );
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    featureName: string;
    currentTier: PlanTier;
    recommendedTier?: PlanTier;
    currentCount?: number;
    maxLimit?: number;
    customMessage?: string;
  }>({
    isOpen: false,
    featureName: "Vehicle",
    currentTier: "Free",
  });

  const handleOpenAddVehicle = async () => {
    const check = await checkPlanLimit("vehicles", vehicles.length);
    if (!check.allowed) {
      setUpgradeModal({
        isOpen: true,
        featureName: "Vehicle (গাড়ি)",
        currentTier: check.tier,
        recommendedTier: check.recommendedPlan || "Personal",
        currentCount: check.current,
        maxLimit: check.limit,
        customMessage: check.message,
      });
      return;
    }
    setEditingVehicle(undefined);
    setFormOpen(true);
  };

  // Mobile Header Portal State
  const [headerPortalEl, setHeaderPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("mobile-header-right");
    if (el) {
      setHeaderPortalEl(el);
      return;
    }
    const interval = setInterval(() => {
      const found = document.getElementById("mobile-header-right");
      if (found) {
        setHeaderPortalEl(found);
        clearInterval(interval);
      }
    }, 50);
    const timeout = setTimeout(() => clearInterval(interval), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Sync active tab if filterType prop changes (e.g. user navigated from route /cars or /bikes)
  useEffect(() => {
    setActiveTab(filterType);
  }, [filterType]);

  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [accRes, data] = await Promise.all([
          getCurrentUserAccess(),
          listVehicles(),
        ]);
        setUserAccess(accRes);
        if (!accRes.isHead && accRes.access.canAccessVehicles === false) {
          setIsLocked(true);
        }
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

  const permittedVehicles = useMemo(() => {
    if (!userAccess || userAccess.isHead) return vehicles;
    const acc = userAccess.access;
    if (acc.assignedVehicleScope === "specific" || (acc.assignedVehicleIds && acc.assignedVehicleIds.length > 0)) {
      const allowed = acc.assignedVehicleIds || [];
      return vehicles.filter((v) => allowed.includes(v.id));
    }
    return vehicles;
  }, [vehicles, userAccess]);

  const counts = useMemo(() => {
    const total = permittedVehicles.length;
    const cars = permittedVehicles.filter((v) => (v.type || "").toLowerCase().includes("car")).length;
    const bikes = permittedVehicles.filter((v) => {
      const t = (v.type || "").toLowerCase();
      return t.includes("bike") || t.includes("motorcycle");
    }).length;
    const scooters = permittedVehicles.filter((v) => (v.type || "").toLowerCase().includes("scooter")).length;
    const commercial = permittedVehicles.filter((v) => {
      const t = (v.type || "").toLowerCase();
      return t.includes("truck") || t.includes("commercial");
    }).length;
    const vans = permittedVehicles.filter((v) => (v.type || "").toLowerCase().includes("van")).length;
    const bicycles = permittedVehicles.filter((v) => (v.type || "").toLowerCase().includes("bicycle")).length;
    const other = total - (cars + bikes + scooters + commercial + vans + bicycles);
    return { total, cars, bikes, scooters, commercial, vans, bicycles, other: Math.max(0, other) };
  }, [permittedVehicles]);

  const filteredVehicles = useMemo(() => {
    return permittedVehicles.filter((vehicle) => {
      const t = (vehicle.type || "").toLowerCase();
      let matchesTab = true;

      if (activeTab === "All") {
        matchesTab = true;
      } else if (activeTab === "Car") {
        matchesTab = t.includes("car") || t.includes("sedan") || t.includes("suv") || t.includes("jeep");
      } else if (activeTab === "Bike") {
        matchesTab = t.includes("bike") || t.includes("motorcycle");
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
          !t.includes("bike") &&
          !t.includes("motorcycle") &&
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
      ? "My Vehicles (Cars & Bikes)"
      : activeTab === "Car"
      ? "Cars"
      : activeTab === "Bike"
      ? "Motorcycles & Bikes"
      : activeTab === "Scooter"
      ? "Scooters"
      : activeTab === "Commercial"
      ? "Pickups & Trucks"
      : activeTab === "Van"
      ? "Microbuses & Vans"
      : activeTab === "Bicycle"
      ? "Bicycles"
      : `${activeTab} Vehicles`;

  const pageSubtitle =
    activeTab === "All"
      ? "Keep track of your cars and bikes, registration number plates, petrol/gas, and BRTA papers."
      : activeTab === "Car"
      ? "Car details, registration number plate, fuel costs, and BRTA papers."
      : activeTab === "Bike"
      ? "Bike details, registration number plate, fuel costs, and servicing."
      : "Vehicle details, registration number plate, fuel costs, and maintenance.";

  if (loading) {
    return (
      <BrandLogoLoader
        message="Loading Vehicles & Garage..."
        subtitle="Syncing cars, bikes, mileage & logs"
      />
    );
  }

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
          <Car className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Vehicles Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to access family vehicles, cars, and bikes records. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Top Header Integration via Portal into MobileHeader */}
      {headerPortalEl &&
        createPortal(
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={handleOpenAddVehicle}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>,
          headerPortalEl
        )}

      {/* Desktop Header (Enterprise Sticky Header, Zero Margin on Top/Left/Right) */}
      <UiPageHeader
        title={pageTitle}
        helpTooltip="Manage cars, bikes, fitness papers, insurance, fuel logs, and maintenance."
        subtitle={pageSubtitle}
        sticky={true}
        className="hidden lg:block"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/assets/vehicles/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
              <span>Summary</span>
            </Link>
            <UiButton
              variant="primary"
              size="sm"
              onClick={handleOpenAddVehicle}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Add {activeTab !== "All" ? activeTab : "Vehicle"}
            </UiButton>
          </div>
        }
      />

      {/* Main Content Area with Page Padding */}
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 pb-28 sm:pb-8">

      {/* Mobile 4-Column Metric Strip (lg:hidden) */}
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500">Total</div>
          <div className="text-base font-bold text-slate-900">{counts.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-blue-600">Cars</div>
          <div className="text-base font-bold text-blue-700">{counts.cars}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-emerald-600">Bikes</div>
          <div className="text-base font-bold text-emerald-700">{counts.bikes + counts.scooters}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-1 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-amber-600">Other</div>
          <div className="text-base font-bold text-slate-900">
            {counts.commercial + counts.vans + counts.other + counts.bicycles}
          </div>
        </div>
      </div>

      {/* Desktop 4-Card Vehicle Summary Strip (hidden lg:grid) */}
      <div className="hidden lg:grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Total Vehicles</span>
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{counts.total}</div>
          <div className="text-[10px] text-slate-400">Cars, bikes, and other vehicles</div>
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

      {/* Search Bar, Filter & View Switcher - Single Row on Mobile */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, plate, model..."
              className="w-full rounded-xl border border-slate-200/90 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Filter Icon Button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className={`inline-flex items-center justify-center h-8.5 w-8.5 rounded-xl border transition shrink-0 shadow-2xs cursor-pointer relative ${
              mobileFiltersOpen || activeTab !== "All"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Filter by vehicle type"
            aria-label="Filter"
          >
            <Filter className="h-3.5 w-3.5" />
            {activeTab !== "All" && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white px-1 shadow-2xs">
                1
              </span>
            )}
          </button>

          {/* View Mode Toggle (Grid vs Table) */}
          <ViewModeToggle
            viewMode={viewMode}
            onChange={(mode) => setViewMode(mode as "table" | "grid")}
            gridLabel="Grid"
            listLabel="Table"
            listValue="table"
          />
        </div>

        {/* Expandable Category Pills when Filter is active / open */}
        {(mobileFiltersOpen || activeTab !== "All") && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "All", label: "All", count: counts.total },
              { id: "Car", label: "Cars", count: counts.cars },
              { id: "Bike", label: "Bikes", count: counts.bikes },
              { id: "Scooter", label: "Scooters", count: counts.scooters },
              { id: "Commercial", label: "Commercial", count: counts.commercial },
              { id: "Van", label: "Vans", count: counts.vans },
              { id: "Bicycle", label: "Bicycles", count: counts.bicycles },
              { id: "Other", label: "Other", count: counts.other },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#064e3b] text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Setup banner if tables are missing */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Vehicles Grid / Table View */}
      {filteredVehicles.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
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
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {activeTab !== "All" ? activeTab : "Vehicle"}
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/vehicles/${vehicle.id}`);
              }}
              className="group rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Header: Brand Logo, Name, Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800 group-hover:scale-105 transition-transform">
                      <VehicleBrandLogo brand={vehicle.brand} type={vehicle.type} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {vehicle.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 truncate">
                        {vehicle.brand} {vehicle.model}
                        {vehicle.color && <span> · {vehicle.color}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`rounded-md border px-1.5 py-0.2 text-[10px] font-semibold ${getVehicleTypeBadgeClass(
                        vehicle.type,
                      )}`}
                    >
                      {vehicle.type || "Vehicle"}
                    </span>
                  </div>
                </div>

                {/* Registration plate & Specs summary */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    {vehicle.registrationNumber ? (
                      <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200">
                        {vehicle.registrationNumber}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">Unregistered</span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 font-semibold">
                    {vehicle.mileage.toLocaleString()} km
                  </div>
                </div>
              </div>

              {/* Card Footer: Year & Quick Action Buttons */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  {vehicle.year ? `Year ${vehicle.year}` : "—"}
                </span>

                <TableRowActions
                  title={vehicle.name}
                  subtitle={`${vehicle.brand} ${vehicle.model}${vehicle.registrationNumber ? ` • ${vehicle.registrationNumber}` : ""}`}
                  actions={[
                    {
                      label: "View Details & Papers",
                      description: "BRTA documents, fuel logs & servicing history",
                      icon: ExternalLink,
                      variant: "emerald",
                      onClick: () => navigate(`/vehicles/${vehicle.id}`),
                    },
                    {
                      label: "Edit Vehicle Specs",
                      description: "Update model, year, registration number & color",
                      icon: Pencil,
                      onClick: () => openEdit(vehicle),
                    },
                    {
                      label: "Delete Vehicle",
                      description: "Remove this vehicle and related records",
                      icon: Trash2,
                      variant: "danger",
                      onClick: () => void removeVehicle(vehicle),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Vehicle</th>
                  <th className="px-3.5 py-2.5 font-semibold">Brand / Model</th>
                  <th className="px-3.5 py-2.5 font-semibold">Year</th>
                  <th className="px-3.5 py-2.5 font-semibold">Registration</th>
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

                      <td className="px-3.5 py-2 text-right">
                        <TableRowActions
                          title={vehicle.name}
                          subtitle={`${vehicle.brand} ${vehicle.model}${vehicle.registrationNumber ? ` • ${vehicle.registrationNumber}` : ""}`}
                          actions={[
                            {
                              label: "View Details & Papers",
                              description: "BRTA documents, fuel logs & servicing history",
                              icon: ExternalLink,
                              variant: "emerald",
                              onClick: () => navigate(`/vehicles/${vehicle.id}`),
                            },
                            {
                              label: "Edit Vehicle Specs",
                              description: "Update model, year, registration number & color",
                              icon: Pencil,
                              onClick: () => openEdit(vehicle),
                            },
                            {
                              label: "Delete Vehicle",
                              description: "Remove this vehicle and related records",
                              icon: Trash2,
                              variant: "danger",
                              onClick: () => void removeVehicle(vehicle),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Plan Upgrade Limit Modal */}
      <PlanUpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
        featureName={upgradeModal.featureName}
        currentTier={upgradeModal.currentTier}
        recommendedTier={upgradeModal.recommendedTier}
        currentCount={upgradeModal.currentCount}
        maxLimit={upgradeModal.maxLimit}
        customMessage={upgradeModal.customMessage}
      />
      </div>
    </div>
  );
}
