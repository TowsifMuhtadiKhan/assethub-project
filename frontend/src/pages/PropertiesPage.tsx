import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Building2,
  FileText,
  Grid2X2,
  Home,
  List,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Users,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import type { PropertyUnit } from "../types";
import type { RentalFile, RentalTenancy, RentSchedule } from "../types/rentals";
import {
  deleteRentalProperty,
  loadRentalData,
  rentalFileUrl,
  setRentalPayment,
} from "../services/rentalService";
import type { RentalData } from "../services/rentalService";
import { buildRentalLedger, currentMonth } from "../utils/rentalLedger";
import { sumMoney } from "../utils/assetReports";
import {
  DocumentForm,
  MaintenanceForm,
  PropertyForm,
  ScheduleForm,
  TenancyForm,
  Label,
  button,
  field,
  primary,
  money,
  errorMessage,
} from "../components/rentals/RentalForms";
import { PropertyEntryForm } from "../components/rentals/PropertyEntryForm";
import { RentalReports } from "../components/rentals/RentalReports";

type Editor =
  | { type: "property" | "flat" | "document" | "maintenance" }
  | { type: "tenant"; unit: PropertyUnit; tenancy?: RentalTenancy }
  | { type: "rate"; tenancy: RentalTenancy; schedule?: RentSchedule };

export function PropertiesPage({ dashboard = false }: { dashboard?: boolean }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("property") || "";
  const [data, setData] = useState<RentalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState("Flats & Tenants");
  const [month, setMonth] = useState(currentMonth());
  const [propertyView, setPropertyView] = useState<"table" | "grid">("table");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const refresh = async () => {
    setData(await loadRentalData());
  };

  useEffect(() => {
    let live = true;
    loadRentalData()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const done = async (id?: string) => {
    await refresh();
    setEditor(null);
    if (id) setParams({ property: id });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const removeProperty = (propertyId: string, name: string) => {
    if (
      !window.confirm(
        `Delete "${name}" and all of its flats, tenants, rent history, documents, and maintenance records? This cannot be undone.`
      )
    )
      return;
    void run(async () => {
      await deleteRentalProperty(propertyId);
      if (selectedId === propertyId) setParams({});
    });
  };

  const property = data?.properties.find((p) => p.id === selectedId);
  const units = data?.units.filter((u) => u.propertyId === selectedId) || [];
  const tenancies =
    data?.tenancies.filter((t) => units.some((u) => u.id === t.unit_id)) || [];

  const propertyTabs = [
    {
      name: "Flats & Tenants",
      icon: Users,
      count: units.filter((u) => !u.parentUnitId).length,
    },
    { name: "Rent & Payments", icon: ReceiptText, count: tenancies.length },
    {
      name: "Property Documents",
      icon: FileText,
      count: data?.documents.filter((d) => d.property_id === selectedId).length || 0,
    },
    {
      name: "Maintenance",
      icon: Wrench,
      count: data?.maintenance.filter((m) => m.property_id === selectedId).length || 0,
    },
    { name: "Reports", icon: BarChart3 },
  ];

  let ledgerError = "";
  let ledger: ReturnType<typeof buildRentalLedger> = [];
  try {
    if (data && month)
      ledger = buildRentalLedger(tenancies, data.schedules, data.payments, month, month);
  } catch (e) {
    ledgerError = errorMessage(e);
  }

  const openFile = async (file: RentalFile) => {
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    try {
      const url = await rentalFileUrl(file);
      if (win) win.location.href = url;
      else throw new Error("Allow pop-ups to view attachments.");
    } catch (e) {
      win?.close();
      setError(errorMessage(e));
    }
  };

  const renderFiles = (files: RentalFile[]) => (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.path}
          type="button"
          onClick={() => void openFile(file)}
          className="text-xs text-indigo-700 underline"
        >
          {file.name}
        </button>
      ))}
    </div>
  );

  // Portfolio-wide metrics mirroring the Vehicle Fleet Strip
  const metrics = useMemo(() => {
    if (!data)
      return {
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        expectedMonthlyRent: 0,
        residentialCount: 0,
        commercialCount: 0,
        mixedCount: 0,
      };

    const curMonth = currentMonth();
    const totalProperties = data.properties.length;

    // Rental spaces: all units that are not room containers
    const rentalUnits = data.units.filter((u) => u.rentalMode !== "rooms");
    const totalUnits = rentalUnits.length;

    const activeTenancies = data.tenancies.filter(
      (t) =>
        t.start_month.slice(0, 7) <= curMonth &&
        (!t.end_month || t.end_month.slice(0, 7) >= curMonth)
    );

    const occupiedUnitIds = new Set(activeTenancies.map((t) => t.unit_id));
    const occupiedUnits = rentalUnits.filter((u) => occupiedUnitIds.has(u.id)).length;
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // Monthly Rent Expected: sum up for each active tenancy
    let expectedMonthlyRent = 0;
    for (const tenancy of activeTenancies) {
      const schedule = data.schedules.find(
        (s) =>
          s.tenancy_id === tenancy.id &&
          s.from_month.slice(0, 7) <= curMonth &&
          (!s.to_month || s.to_month.slice(0, 7) >= curMonth)
      );
      if (schedule) {
        const chargesTotal = (schedule.charges || []).reduce(
          (sum, c) => sum + (c.amount || 0),
          0
        );
        expectedMonthlyRent += (schedule.base_rent || 0) + chargesTotal;
      } else {
        const u = data.units.find((unit) => unit.id === tenancy.unit_id);
        if (u && u.monthlyRent) expectedMonthlyRent += u.monthlyRent;
      }
    }

    const residentialCount = data.properties.filter(
      (p) => (p.type || "").toLowerCase().includes("residential") || (p.type || "").toLowerCase().includes("flat")
    ).length;
    const commercialCount = data.properties.filter((p) =>
      (p.type || "").toLowerCase().includes("commercial") || (p.type || "").toLowerCase().includes("shop")
    ).length;
    const mixedCount = data.properties.filter((p) =>
      (p.type || "").toLowerCase().includes("mixed")
    ).length;

    return {
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      expectedMonthlyRent,
      residentialCount,
      commercialCount,
      mixedCount,
    };
  }, [data]);

  // Filtered Properties for the Main List
  const filteredProperties = useMemo(() => {
    if (!data) return [];
    return data.properties.filter((p) => {
      // Category filter
      if (activeCategory === "Residential") {
        const t = (p.type || "").toLowerCase();
        if (!t.includes("residential") && !t.includes("flat") && !t.includes("house"))
          return false;
      } else if (activeCategory === "Commercial") {
        const t = (p.type || "").toLowerCase();
        if (!t.includes("commercial") && !t.includes("shop") && !t.includes("office"))
          return false;
      } else if (activeCategory === "Mixed") {
        const t = (p.type || "").toLowerCase();
        if (!t.includes("mixed")) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pUnits = data.units.filter((u) => u.propertyId === p.id);
        const hasMatchingUnit = pUnits.some(
          (u) =>
            u.unitNumber.toLowerCase().includes(q) ||
            (u.tenantName || "").toLowerCase().includes(q) ||
            (u.tenantPhone || "").toLowerCase().includes(q)
        );
        const matchesProp =
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.type || "").toLowerCase().includes(q);
        if (!matchesProp && !hasMatchingUnit) return false;
      }

      return true;
    });
  }, [data, activeCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Header - Strict Parity with Vehicle Pattern */}
      <div className="rental-no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            {dashboard
              ? "Property Dashboard & Reports"
              : property?.name || "Properties & Rentals"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {dashboard
              ? "Financial insights, profit/loss, occupancy rates, and collection reports."
              : property
              ? `Manage units, rental agreements, Bangladeshi documents, and maintenance for ${property.name}.`
              : "Whole flats, multiple rooms, tenant records, rent ledgers, Bangladeshi legal records, and maintenance."}
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            to={dashboard ? "/rentals/properties" : "/rentals/dashboard"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>{dashboard ? "Manage properties" : "Property Dashboard & Reports"}</span>
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            onClick={() => setEditor({ type: "property" })}
            disabled={!data}
          >
            <Plus className="h-3.5 w-3.5" />
            + Add property
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rental-no-print rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            className={`${button} ml-3`}
            disabled={busy}
            onClick={() => void run(async () => {})}
          >
            Retry loading
          </button>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-2xs">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 mb-3" />
          <p className="text-xs font-medium">Loading property & rental records…</p>
        </div>
      )}

      {data && (
        <>
          {dashboard ? (
            <>
              <div className="rental-no-print max-w-sm">
                <Label title="Property">
                  <select
                    value={selectedId}
                    onChange={(e) =>
                      setParams(e.target.value ? { property: e.target.value } : {})
                    }
                    className={field}
                  >
                    <option value="">All properties</option>
                    {data.properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Label>
              </div>
              <RentalReports
                key={selectedId}
                data={data}
                propertyId={selectedId || undefined}
              />
            </>
          ) : (
            <>
              {/* Main Property Overview & List View */}
              {!property ? (
                <section className="space-y-4">
                  {/* Property Fleet / Portfolio Metric Strip (Matching Vehicle Pattern) */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium">Total Properties</span>
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {metrics.totalProperties}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Residential & commercial
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-indigo-600">
                        <span className="text-[11px] font-medium text-slate-500">
                          Flats & Rental Spaces
                        </span>
                        <Home className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {metrics.totalUnits}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {metrics.occupiedUnits} occupied · {metrics.vacantUnits} vacant
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-emerald-600">
                        <span className="text-[11px] font-medium text-slate-500">
                          Occupancy Rate
                        </span>
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {metrics.occupancyRate}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {metrics.occupiedUnits} active tenancies
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-amber-600">
                        <span className="text-[11px] font-medium text-slate-500">
                          Monthly Rent Revenue
                        </span>
                        <ReceiptText className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        ৳{metrics.expectedMonthlyRent.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Expected for {currentMonth()}
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills, Search Bar & View Switcher */}
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "All", label: "All Properties", count: metrics.totalProperties },
                        { id: "Residential", label: "Residential", count: metrics.residentialCount },
                        { id: "Commercial", label: "Commercial", count: metrics.commercialCount },
                        { id: "Mixed", label: "Mixed-use", count: metrics.mixedCount },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            activeCategory === cat.id
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                              activeCategory === cat.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search and Grid/Table Switcher */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-60">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search property or tenant…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>

                      <div
                        className="flex rounded-lg border border-slate-200 bg-white p-0.5"
                        role="group"
                        aria-label="Property view"
                      >
                        <button
                          type="button"
                          aria-label="Table view"
                          aria-pressed={propertyView === "table"}
                          onClick={() => setPropertyView("table")}
                          className={`rounded-md p-1.5 transition ${
                            propertyView === "table"
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <List size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Grid view"
                          aria-pressed={propertyView === "grid"}
                          onClick={() => setPropertyView("grid")}
                          className={`rounded-md p-1.5 transition ${
                            propertyView === "grid"
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Grid2X2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table View */}
                  {propertyView === "table" ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3">Property Name</th>
                            <th className="p-3">Address & Location</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Flats / Spaces</th>
                            <th className="p-3">Occupancy Status</th>
                            <th className="p-3">Monthly Rent</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredProperties.map((p) => {
                            const pUnits = data.units.filter(
                              (u) => u.propertyId === p.id
                            );
                            const rentals = pUnits.filter(
                              (u) => u.rentalMode !== "rooms"
                            );
                            const occupied = rentals.filter((u) =>
                              data.tenancies.some(
                                (t) =>
                                  t.unit_id === u.id &&
                                  t.start_month.slice(0, 7) <= currentMonth() &&
                                  (!t.end_month ||
                                    t.end_month.slice(0, 7) >= currentMonth())
                              )
                            ).length;

                            // Calculate monthly expected rent for this property
                            const propRent = rentals.reduce((sum, u) => {
                              const tenancy = data.tenancies.find(
                                (t) =>
                                  t.unit_id === u.id &&
                                  t.start_month.slice(0, 7) <= currentMonth() &&
                                  (!t.end_month ||
                                    t.end_month.slice(0, 7) >= currentMonth())
                              );
                              if (!tenancy) return sum;
                              const schedule = data.schedules.find(
                                (s) =>
                                  s.tenancy_id === tenancy.id &&
                                  s.from_month.slice(0, 7) <= currentMonth() &&
                                  (!s.to_month ||
                                    s.to_month.slice(0, 7) >= currentMonth())
                              );
                              if (schedule) {
                                return (
                                  sum +
                                  schedule.base_rent +
                                  schedule.charges.reduce((csum, c) => csum + c.amount, 0)
                                );
                              }
                              return sum + (u.monthlyRent || 0);
                            }, 0);

                            return (
                              <tr
                                key={p.id}
                                className="hover:bg-slate-50/70 transition"
                              >
                                <td className="p-3">
                                  <button
                                    className="flex items-center gap-2 text-left font-bold text-slate-900 hover:text-indigo-600 transition"
                                    onClick={() => {
                                      setParams({ property: p.id });
                                      setTab("Flats & Tenants");
                                    }}
                                  >
                                    <Building2
                                      className="text-indigo-600 shrink-0"
                                      size={16}
                                    />
                                    <span>{p.name}</span>
                                  </button>
                                </td>
                                <td className="p-3 text-slate-600">{p.location}</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    {p.type || "Residential"}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-mono">
                                  {pUnits.filter((u) => !u.parentUnitId).length} spaces
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                      occupied === rentals.length && rentals.length > 0
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                        : occupied > 0
                                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {occupied}/{rentals.length} occupied
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-semibold text-slate-900">
                                  {propRent > 0 ? `৳${propRent.toLocaleString()}` : "—"}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex justify-end gap-3 font-semibold">
                                    <button
                                      className="text-indigo-700 hover:underline"
                                      onClick={() => {
                                        setParams({ property: p.id });
                                        setTab("Flats & Tenants");
                                      }}
                                    >
                                      Manage →
                                    </button>
                                    <button
                                      className="text-rose-600 hover:underline"
                                      onClick={() => removeProperty(p.id, p.name)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {!filteredProperties.length && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-8 text-center text-xs text-slate-500"
                              >
                                No properties matching your filter. Click "+ Add property" to create one.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Grid View */
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProperties.map((p) => {
                        const pUnits = data.units.filter(
                          (u) => u.propertyId === p.id
                        );
                        const rentals = pUnits.filter(
                          (u) => u.rentalMode !== "rooms"
                        );
                        const occupied = rentals.filter((u) =>
                          data.tenancies.some(
                            (t) =>
                              t.unit_id === u.id &&
                              t.start_month.slice(0, 7) <= currentMonth() &&
                              (!t.end_month ||
                                t.end_month.slice(0, 7) >= currentMonth())
                          )
                        ).length;

                        const propRent = rentals.reduce((sum, u) => {
                          const tenancy = data.tenancies.find(
                            (t) =>
                              t.unit_id === u.id &&
                              t.start_month.slice(0, 7) <= currentMonth() &&
                              (!t.end_month ||
                                t.end_month.slice(0, 7) >= currentMonth())
                          );
                          if (!tenancy) return sum;
                          const schedule = data.schedules.find(
                            (s) =>
                              s.tenancy_id === tenancy.id &&
                              s.from_month.slice(0, 7) <= currentMonth() &&
                              (!s.to_month ||
                                s.to_month.slice(0, 7) >= currentMonth())
                          );
                          if (schedule) {
                            return (
                              sum +
                              schedule.base_rent +
                              schedule.charges.reduce((csum, c) => csum + c.amount, 0)
                            );
                          }
                          return sum + (u.monthlyRent || 0);
                        }, 0);

                        return (
                          <article
                            key={p.id}
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition"
                          >
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => {
                                setParams({ property: p.id });
                                setTab("Flats & Tenants");
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                  {p.type || "Residential"}
                                </span>
                              </div>

                              <h2 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                                {p.name}
                              </h2>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                {p.location}
                              </p>

                              <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                                <span className="text-slate-500">
                                  {pUnits.filter((u) => !u.parentUnitId).length} flats ·{" "}
                                  <span className="font-semibold text-slate-700">
                                    {occupied}/{rentals.length} occupied
                                  </span>
                                </span>
                                {propRent > 0 && (
                                  <span className="font-mono font-bold text-slate-900">
                                    ৳{propRent.toLocaleString()}/mo
                                  </span>
                                )}
                              </div>
                            </button>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs font-semibold">
                              <button
                                type="button"
                                className="text-indigo-700 hover:underline"
                                onClick={() => {
                                  setParams({ property: p.id });
                                  setTab("Flats & Tenants");
                                }}
                              >
                                Manage property →
                              </button>
                              <button
                                type="button"
                                className="text-rose-600 hover:underline"
                                onClick={() => removeProperty(p.id, p.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      {!filteredProperties.length && (
                        <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                          No properties found. Click "+ Add property" to create your first real estate asset.
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ) : (
                /* Selected Property Detail Screen */
                <>
                  {/* Breadcrumb & Action Strip */}
                  <div className="rental-no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => setParams({})}
                      >
                        ← All properties
                      </button>
                      <span className="text-xs font-bold text-slate-800">
                        {property.name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{property.location}</span>
                    </div>

                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-2xs"
                      onClick={() => setEditor({ type: "flat" })}
                    >
                      <Plus className="h-3 w-3" />
                      + Add flat
                    </button>
                  </div>

                  {/* Section Tabs */}
                  <nav
                    className="rental-no-print border-b border-slate-200/80"
                    aria-label="Property sections"
                  >
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      {propertyTabs.map(({ name, icon: TabIcon, count }) => {
                        const isDocuments = name === "Property Documents";
                        const isMaintenance = name === "Maintenance";
                        const activeClass = isDocuments
                          ? "border-indigo-600 text-indigo-700 font-bold"
                          : "border-slate-900 text-slate-900";
                        const iconClass = isDocuments
                          ? "text-indigo-600"
                          : isMaintenance
                          ? "text-emerald-600"
                          : "";
                        const countClass = isDocuments
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                          : "bg-slate-100 text-slate-600";
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setTab(name)}
                            className={`inline-flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 transition cursor-pointer ${
                              tab === name
                                ? activeClass
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <TabIcon className={`h-3.5 w-3.5 ${iconClass}`} />
                            <span>{name}</span>
                            {count !== undefined && (
                              <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                  isDocuments ? "font-bold" : ""
                                } ${countClass}`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </nav>

                  {/* TAB 1: Flats & Tenants */}
                  {tab === "Flats & Tenants" && (
                    <div className="space-y-4">
                      {units
                        .filter((u) => !u.parentUnitId)
                        .map((flat) => (
                          <section
                            key={flat.id}
                            className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <div>
                                <h2 className="font-bold text-sm text-slate-900">
                                  {flat.unitNumber}
                                  <span className="ml-2 text-xs font-normal text-slate-500">
                                    {flat.rentalMode === "rooms"
                                      ? "Rooms rented separately"
                                      : "Rented as a whole"}
                                  </span>
                                </h2>
                                {(flat.sizeSqft > 0 || flat.floor) && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {flat.sizeSqft > 0 ? `${flat.sizeSqft} sqft` : ""}{" "}
                                    {flat.floor ? `· Floor: ${flat.floor}` : ""}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(flat.rentalMode === "rooms"
                              ? units.filter((u) => u.parentUnitId === flat.id)
                              : [flat]
                            ).map((unit) => {
                              const unitTenancies = tenancies
                                .filter((t) => t.unit_id === unit.id)
                                .sort((a, b) =>
                                  b.start_month.localeCompare(a.start_month)
                                );
                              const activeTenancy = unitTenancies.find(
                                (t) =>
                                  t.start_month.slice(0, 7) <= currentMonth() &&
                                  (!t.end_month ||
                                    t.end_month.slice(0, 7) >= currentMonth())
                              );

                              return (
                                <div
                                  key={unit.id}
                                  className="mt-3 rounded-xl bg-slate-50/80 border border-slate-200/70 p-3.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-xs font-bold text-slate-900">
                                        {unit.unitNumber}
                                      </h3>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                          activeTenancy
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                            : "bg-slate-200/70 text-slate-700"
                                        }`}
                                      >
                                        {activeTenancy ? "Occupied" : "Vacant"}
                                      </span>
                                    </div>

                                    <button
                                      className={button}
                                      onClick={() =>
                                        setEditor({ type: "tenant", unit })
                                      }
                                    >
                                      + Add tenant / next tenancy
                                    </button>
                                  </div>

                                  {!unitTenancies.length && (
                                    <p className="mt-2.5 text-xs text-slate-500">
                                      {unit.tenantName
                                        ? `Existing tenant: ${unit.tenantName}. Add tenancy dates and historical rent periods to enable monthly calculations.`
                                        : "No tenant recorded. Add a tenant when this space is rented."}
                                    </p>
                                  )}

                                  {unitTenancies.map((t) => {
                                    const tenantSchedules = data.schedules
                                      .filter((s) => s.tenancy_id === t.id)
                                      .sort((a, b) =>
                                        a.from_month.localeCompare(b.from_month)
                                      );

                                    return (
                                      <div
                                        key={t.id}
                                        className="mt-3 space-y-2.5 border-t border-slate-200/60 pt-2.5"
                                      >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-xs text-slate-900">
                                                {t.tenant_name}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {t.start_month.slice(0, 7)} —{" "}
                                                {t.end_month?.slice(0, 7) || "Ongoing"}
                                              </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                              <span className="inline-flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                {t.tenant_phone}
                                              </span>

                                              {unit.tenantEmail && (
                                                <span className="inline-flex items-center gap-1 text-slate-500">
                                                  <Mail className="h-3 w-3 text-slate-400" />
                                                  {unit.tenantEmail}
                                                </span>
                                              )}

                                              {t.tenant_nid && (
                                                <details className="inline-block text-[11px] text-slate-500">
                                                  <summary className="cursor-pointer font-medium text-indigo-700">
                                                    NID: {t.tenant_nid.slice(0, 4)}••••
                                                  </summary>
                                                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                                                    {t.tenant_nid}
                                                  </span>
                                                </details>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex gap-2">
                                            <button
                                              className={button}
                                              onClick={() =>
                                                setEditor({
                                                  type: "tenant",
                                                  unit,
                                                  tenancy: t,
                                                })
                                              }
                                            >
                                              Edit / End tenancy
                                            </button>
                                            <button
                                              className={button}
                                              onClick={() =>
                                                setEditor({ type: "rate", tenancy: t })
                                              }
                                            >
                                              + Rent period
                                            </button>
                                          </div>
                                        </div>

                                        {/* Rent breakdown cards */}
                                        <div className="space-y-1.5">
                                          {tenantSchedules.map((s) => {
                                            const total = sumMoney([
                                              s.base_rent,
                                              ...s.charges.map((c) => c.amount),
                                            ]);
                                            return (
                                              <div
                                                key={s.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-white p-2.5 text-xs shadow-2xs"
                                              >
                                                <div className="space-y-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-900">
                                                      {money(total)}/month
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                      ({s.from_month.slice(0, 7)} —{" "}
                                                      {s.to_month?.slice(0, 7) ||
                                                        "Ongoing"}
                                                      )
                                                    </span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                                      Base: {money(s.base_rent)}
                                                    </span>
                                                    {s.charges.map((c) => (
                                                      <span
                                                        key={c.label}
                                                        className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 border border-indigo-100"
                                                      >
                                                        {c.label}: {money(c.amount)}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>

                                                <button
                                                  className={button}
                                                  onClick={() =>
                                                    setEditor({
                                                      type: "rate",
                                                      tenancy: t,
                                                      schedule: s,
                                                    })
                                                  }
                                                >
                                                  Edit period
                                                </button>
                                              </div>
                                            );
                                          })}
                                          {!tenantSchedules.length && (
                                            <p className="text-[11px] text-amber-800">
                                              No rent period yet. Add a dated rate to calculate monthly rent & bills.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </section>
                        ))}
                    </div>
                  )}

                  {/* TAB 2: Rent & Payments */}
                  {tab === "Rent & Payments" && (
                    <section className="space-y-4">
                      <div className="max-w-xs">
                        <Label title="Rental month">
                          <input
                            type="month"
                            required
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className={field}
                          />
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500">
                        Tick Paid to record the outstanding amount. Unticking voids that
                        month's receipts while retaining history. Record partial or
                        advance payments below.
                      </p>
                      {ledgerError && (
                        <p role="alert" className="text-red-700">
                          {ledgerError}
                        </p>
                      )}

                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              {[
                                "Flat / Tenant",
                                "Breakdown",
                                "Received",
                                "Balance",
                                "Paid?",
                                "Record payment",
                              ].map((h) => (
                                <th key={h} className="p-3">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ledger.map((r) => (
                              <tr key={r.tenancyId} className="border-t border-slate-100">
                                <td className="p-3">
                                  <p className="font-semibold">
                                    {
                                      units.find((u) => u.id === r.unitId)
                                        ?.unitNumber
                                    }
                                  </p>
                                  <p className="text-xs text-slate-500">{r.tenant}</p>
                                </td>
                                <td className="p-3">
                                  {r.expected === null ? (
                                    "Rate missing"
                                  ) : (
                                    <>
                                      <p>{money(r.expected)}</p>
                                      <p className="text-xs text-slate-500">
                                        Rent {money(r.baseRent!)} + charges{" "}
                                        {money(r.charges!)}
                                      </p>
                                    </>
                                  )}
                                </td>
                                <td className="p-3">{money(r.received)}</td>
                                <td className="p-3">
                                  {r.outstanding === null ? (
                                    "—"
                                  ) : (
                                    money(r.outstanding)
                                  )}
                                  <p className="text-xs text-slate-500">
                                    {r.status}
                                    {r.credit > 0
                                      ? ` · credit ${money(r.credit)}`
                                      : ""}
                                  </p>
                                </td>
                                <td className="p-3">
                                  <input
                                    aria-label={`Rent paid for ${r.tenant} in ${month}`}
                                    type="checkbox"
                                    checked={r.status === "Paid"}
                                    disabled={
                                      busy ||
                                      r.expected === null ||
                                      r.expected === 0
                                    }
                                    onChange={(e) => {
                                      const paid = e.target.checked;
                                      if (
                                        !paid &&
                                        !window.confirm(
                                          `Mark ${month} unpaid? Payments will be voided and kept in history.`
                                        )
                                      )
                                        return;
                                      void run(() =>
                                        setRentalPayment(
                                          r.tenancyId,
                                          month,
                                          paid
                                        )
                                      );
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <form
                                    className="flex flex-wrap gap-2"
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const f = new FormData(e.currentTarget);
                                      void run(() =>
                                        setRentalPayment(
                                          r.tenancyId,
                                          month,
                                          true,
                                          Number(f.get("amount")),
                                          String(f.get("date"))
                                        )
                                      );
                                    }}
                                  >
                                    <input
                                      aria-label="Payment amount"
                                      name="amount"
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      required
                                      placeholder="Amount"
                                      className={`${field} max-w-28`}
                                    />
                                    <input
                                      aria-label="Payment date"
                                      name="date"
                                      type="date"
                                      required
                                      defaultValue={new Intl.DateTimeFormat(
                                        "en-CA",
                                        { timeZone: "Asia/Dhaka" }
                                      ).format(new Date())}
                                      className={`${field} max-w-36`}
                                    />
                                    <button
                                      disabled={busy || r.expected === null}
                                      className={button}
                                    >
                                      Record
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                            {!ledger.length && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="p-8 text-center text-slate-500"
                                >
                                  No tenancy covers this month. Add a tenant and rent
                                  period first.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <details className="rounded-xl border border-slate-200 bg-white p-4">
                        <summary className="text-sm font-semibold cursor-pointer">
                          Payment history (including voided receipts)
                        </summary>
                        <div className="mt-3 space-y-2">
                          {data.payments
                            .filter(
                              (p) =>
                                units.some((u) => u.id === p.unit_id) &&
                                p.month === month
                            )
                            .map((p) => (
                              <p key={p.id} className="text-xs text-slate-600">
                                {p.payment_date.slice(0, 10)} ·{" "}
                                {
                                  units.find((u) => u.id === p.unit_id)
                                    ?.unitNumber
                                }{" "}
                                · {money(p.amount_paid)} ·{" "}
                                {p.voided_at ? "Voided" : "Recorded"}
                              </p>
                            ))}
                        </div>
                      </details>
                    </section>
                  )}

                  {/* TAB 3: Property Documents */}
                  {tab === "Property Documents" && (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Bangladesh property records, title deeds, Khatian, mutation, holding tax, and tenancy agreements.
                        </p>
                        <button
                          className={primary}
                          onClick={() => setEditor({ type: "document" })}
                        >
                          + Add document
                        </button>
                      </div>

                      {data.documents
                        .filter((d) => d.property_id === selectedId)
                        .map((d) => (
                          <article
                            key={d.id}
                            className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px] font-semibold border border-indigo-200/60">
                                <ShieldCheck className="h-3 w-3" />
                                {d.category}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">
                              {d.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {d.document_number
                                ? `Doc #: ${d.document_number}`
                                : "No number recorded"}{" "}
                              · Issued: {d.issue_date || "—"} · Expires:{" "}
                              {d.expiry_date || "No expiry"}
                            </p>
                            {d.notes && (
                              <p className="text-xs text-slate-600">{d.notes}</p>
                            )}
                            {renderFiles(d.files)}
                          </article>
                        ))}
                      {!data.documents.some((d) => d.property_id === selectedId) && (
                        <p className="rounded-xl bg-white p-6 text-xs text-slate-500 border border-slate-200">
                          No documents yet. Add deeds (Dalil), Khatian, mutation (Namjari), holding tax receipts, plans or tenancy agreements.
                        </p>
                      )}
                    </section>
                  )}

                  {/* TAB 4: Maintenance */}
                  {tab === "Maintenance" && (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Plumbing, electrical, AC, repairs, technician contacts, and receipt attachments.
                        </p>
                        <button
                          className={primary}
                          onClick={() => setEditor({ type: "maintenance" })}
                        >
                          + Add maintenance
                        </button>
                      </div>

                      {data.maintenance
                        .filter((m) => m.property_id === selectedId)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((m) => (
                          <article
                            key={m.id}
                            className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-bold border border-emerald-200/60">
                                  {m.category}
                                </span>
                                {m.payment_method && (
                                  <span className="text-[10px] text-slate-400">
                                    Paid via {m.payment_method}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {money(m.amount)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {m.date} ·{" "}
                              {m.unit_id
                                ? units.find((u) => u.id === m.unit_id)?.unitNumber
                                : "Property / common areas"}{" "}
                              · Technician/Vendor: {m.vendor || "No vendor recorded"}
                            </p>
                            <p className="text-xs text-slate-700">{m.description}</p>
                            {renderFiles(m.files)}
                            {m.receipt_url && /^https?:/.test(m.receipt_url) && (
                              <a
                                href={m.receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-700 underline"
                              >
                                Existing receipt
                              </a>
                            )}
                            {m.extracted_text && (
                              <details className="text-xs text-slate-500">
                                <summary className="cursor-pointer">
                                  Receipt text
                                </summary>
                                <pre className="whitespace-pre-wrap font-mono text-[11px] bg-slate-50 p-2 rounded">
                                  {m.extracted_text}
                                </pre>
                              </details>
                            )}
                          </article>
                        ))}
                      {!data.maintenance.some((m) => m.property_id === selectedId) && (
                        <p className="rounded-xl bg-white p-6 text-xs text-slate-500 border border-slate-200">
                          No maintenance costs recorded. Track plumbing, AC, electrical, and structural repairs easily.
                        </p>
                      )}
                    </section>
                  )}

                  {/* TAB 5: Reports */}
                  {tab === "Reports" && (
                    <RentalReports data={data} propertyId={selectedId} />
                  )}
                </>
              )}
            </>
          )}

          {/* Form Dialogs */}
          {editor?.type === "property" && (
            <PropertyEntryForm onSuccess={done} onCancel={() => setEditor(null)} />
          )}

          {property && editor?.type === "flat" && (
            <PropertyForm
              propertyId={property.id}
              done={done}
              close={() => setEditor(null)}
            />
          )}

          {editor?.type === "tenant" && (
            <TenancyForm
              unit={editor.unit}
              tenancy={editor.tenancy}
              done={done}
              close={() => setEditor(null)}
            />
          )}

          {editor?.type === "rate" && (
            <ScheduleForm
              tenancy={editor.tenancy}
              schedule={editor.schedule}
              schedules={data.schedules}
              done={done}
              close={() => setEditor(null)}
            />
          )}

          {property && editor?.type === "document" && (
            <DocumentForm
              propertyId={property.id}
              done={done}
              close={() => setEditor(null)}
            />
          )}

          {property && editor?.type === "maintenance" && (
            <MaintenanceForm
              propertyId={property.id}
              units={units}
              done={done}
              close={() => setEditor(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
