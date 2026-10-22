import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  Filter,
  Home,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { PropertyMaintenanceTrendModal } from "../components/rentals/PropertyMaintenanceTrendModal";
import type { Property, PropertyUnit } from "../types";
import type { RentalFile, RentalTenancy, RentSchedule } from "../types/rentals";
import {
  deletePropertyDocument,
  deleteRentalMaintenance,
  deleteRentalProperty,
  deleteRentalUnit,
  deleteRentalTenancy,
  deleteRentSchedule,
  loadRentalData,
  rentalFileUrl,
  saveRentalMaintenance,
  setRentalPayment,
} from "../services/rentalService";
import type { RentalData } from "../services/rentalService";
import { buildRentalLedger, currentMonth } from "../utils/rentalLedger";
import { sumMoney } from "../utils/assetReports";
import { scanMaintenanceReceipt } from "../services/receiptOcr";
import {
  DocumentForm,
  MaintenanceForm,
  PropertyForm,
  ScheduleForm,
  TenancyForm,
  Label,
  button,
  field,
  money,
  errorMessage,
} from "../components/rentals/RentalForms";
import { PropertyEntryForm } from "../components/rentals/PropertyEntryForm";
import { RentalReports } from "../components/rentals/RentalReports";
import { getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { TableRowActions } from "../components/common/TableRowActions";
import { ViewModeToggle } from "../components/common/ViewModeToggle";
import { checkPlanLimit, type PlanTier } from "../services/subscriptionService";
import { PlanUpgradeModal } from "../components/common/PlanUpgradeModal";
import { UiPageHeader, UiButton, UiTable, type Column } from "../components/design-system";

export const BD_PROPERTY_DOC_PRESETS = [
  {
    name: "Title Deed (দলিল / Dalil)",
    category: "Title deed / Sale deed (Dalil / দলিল)",
    description: "Registered sale deed / saf-kabala proving lawful land & flat ownership.",
    required: true,
  },
  {
    name: "Khatian / Porcha (খতিয়ান)",
    category: "Khatian / Record of rights (CS, SA, RS, BS খতিয়ান)",
    description: "CS, SA, RS or City Survey Porcha proving chain of land title.",
    required: true,
  },
  {
    name: "Mutation / Namjari (নামজারি)",
    category: "Mutation / Namjari (নামজারি)",
    description: "Assistant Commissioner (Land) mutation order sheet & DCR receipt.",
    required: true,
  },
  {
    name: "Holding Tax Receipt (হোল্ডিং ট্যাক্স)",
    category: "Holding tax receipt (হোল্ডিং ট্যাক্স)",
    description: "City Corporation or Pourashava municipal holding tax payment clearance.",
    required: true,
  },
  {
    name: "Land Tax / Dakhila (দাখিলা)",
    category: "Land development tax receipt (Dakhila / দাখিলা)",
    description: "Upazila Land Revenue office annual land development tax receipt.",
    required: true,
  },
  {
    name: "Tenancy Agreement (ভাড়া চুক্তিপত্র)",
    category: "Lease / Tenancy agreement (ভাড়া চুক্তিপত্র)",
    description: "Stamp-bonded tenancy contract between landlord and tenant.",
    required: true,
  },
  {
    name: "Renter NID / Passport (ভাড়াটিয়ার এনআইডি)",
    category: "Renter NID / Passport (ভাড়াটিয়ার এনআইডি)",
    description: "National ID photocopy/scan or passport for police verification & record.",
    required: false,
  },
  {
    name: "Utility Sanctions (WASA/DESCO/Titas)",
    category: "Utility connection document (WASA / DESCO / Titas)",
    description: "Electricity, WASA water, or Titas gas meter sanction and clearance papers.",
    required: false,
  },
  {
    name: "Approved Building Plan (RAJUK / CDA)",
    category: "Approved building plan (RAJUK / CDA)",
    description: "Authorized structural architectural blueprint & floor plan.",
    required: false,
  },
];

export const PROPERTY_MAINTENANCE_PRESETS = [
  "Plumbing & Sanitary",
  "Electrical & Wiring",
  "AC Servicing & Cooling",
  "Painting & Wall Repair",
  "Woodwork & Locks",
  "Lift & Generator",
  "Water Motor & Tank",
  "Roof & Waterproofing",
  "General Servicing",
  "Other",
];

function getDaysRemaining(dateStr?: string): { days: number; label: string; tone: "ok" | "warn" | "danger" } {
  if (!dateStr) return { days: 9999, label: "No expiry set", tone: "ok" };
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { days: diff, label: `Expired ${Math.abs(diff)} days ago`, tone: "danger" };
  }
  if (diff <= 30) {
    return { days: diff, label: `Expires in ${diff} days`, tone: "warn" };
  }
  return { days: diff, label: `Valid (${diff} days left)`, tone: "ok" };
}

type Editor =
  | { type: "property" | "flat" | "maintenance" }
  | { type: "document"; preset?: { name: string; category: string } }
  | { type: "tenant"; unit: PropertyUnit; tenancy?: RentalTenancy }
  | { type: "rate"; tenancy: RentalTenancy; schedule?: RentSchedule };

export function PropertiesPage({ dashboard = false }: { dashboard?: boolean }) {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("property") || "";
  const [data, setData] = useState<RentalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState("Flats & Renters");
  const [month, setMonth] = useState(currentMonth());
  const [propertyView, setPropertyView] = useState<"table" | "grid">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "grid";
    }
    return "table";
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = activeCategory !== "All" ? 1 : 0;

  // Maintenance Modal and Trend Modal States
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isMaintenanceTrendModalOpen, setIsMaintenanceTrendModalOpen] = useState(false);

  // Maintenance Logger States (Popup Modal)
  const [mCategory, setMCategory] = useState(PROPERTY_MAINTENANCE_PRESETS[0]);
  const [mUnitId, setMUnitId] = useState("");
  const [mAmount, setMAmount] = useState<number | "">("");
  const [mDate, setMDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date())
  );
  const [mVendor, setMVendor] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mPaymentMethod, setMPaymentMethod] = useState("Cash");
  const [mFiles, setMFiles] = useState<File[]>([]);
  const [mScanning, setMScanning] = useState(false);
  const [mProgress, setMProgress] = useState("");
  const [mScanSuccess, setMScanSuccess] = useState("");
  const [mExtractedText, setMExtractedText] = useState("");
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);

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
    featureName: "Property",
    currentTier: "Free",
  });

  const handleOpenAddProperty = async () => {
    const check = await checkPlanLimit("properties", data?.properties.length || 0);
    if (!check.allowed) {
      setUpgradeModal({
        isOpen: true,
        featureName: "Property (বাড়ি / প্রোপার্টি)",
        currentTier: check.tier,
        recommendedTier: check.recommendedPlan || "Property_Pro",
        currentCount: check.current,
        maxLimit: check.limit,
        customMessage: check.message,
      });
      return;
    }
    setEditor({ type: "property" });
  };

  const handleOpenAddUnit = async () => {
    const check = await checkPlanLimit("units", data?.units.length || 0);
    if (!check.allowed) {
      setUpgradeModal({
        isOpen: true,
        featureName: "Flat / Unit (ফ্ল্যাট বা রুম)",
        currentTier: check.tier,
        recommendedTier: check.recommendedPlan || "Property_Pro",
        currentCount: check.current,
        maxLimit: check.limit,
        customMessage: check.message,
      });
      return;
    }
    setEditor({ type: "flat" });
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

  const refresh = async () => {
    setData(await loadRentalData());
  };

  useEffect(() => {
    let live = true;
    getCurrentUserAccess().then((acc) => {
      if (live) {
        setUserAccess(acc);
        if (!acc.isHead && acc.access.canAccessProperties === false) {
          setIsLocked(true);
        }
      }
    });

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
        `Delete "${name}" and all of its flats, renters, rent history, documents, and maintenance records? This cannot be undone.`
      )
    )
      return;
    void run(async () => {
      await deleteRentalProperty(propertyId);
      if (selectedId === propertyId) setParams({});
    });
  };

  const removeUnit = (unitId: string, unitName: string) => {
    if (
      !window.confirm(
        `Delete space/flat "${unitName}" and all of its associated tenancies, rent history, and records? This cannot be undone.`
      )
    )
      return;
    void run(async () => {
      await deleteRentalUnit(unitId);
    });
  };

  const removeTenancy = (tenancyId: string, tenantName: string) => {
    if (
      !window.confirm(
        `Delete renter record for "${tenantName}"? This will also remove associated rent schedules and payment history.`
      )
    )
      return;
    void run(async () => {
      await deleteRentalTenancy(tenancyId);
    });
  };

  const removeSchedule = (schedId: string) => {
    if (!window.confirm("Delete this rent rate period?")) return;
    void run(async () => {
      await deleteRentSchedule(schedId);
    });
  };

  const deleteDoc = (docId: string, docName: string, files: RentalFile[] = []) => {
    if (!window.confirm(`Delete document "${docName}"? This action cannot be undone.`))
      return;
    void run(async () => {
      await deletePropertyDocument(docId, files);
    });
  };

  const deleteMaint = (
    maintId: string,
    desc: string,
    files: RentalFile[] = []
  ) => {
    if (!window.confirm(`Delete maintenance record "${desc}"?`)) return;
    void run(async () => {
      await deleteRentalMaintenance(maintId, files);
    });
  };

  // Handle OCR scan of maintenance bill
  const handleScanReceipt = async (file: File) => {
    setMScanning(true);
    setMProgress("Analyzing memo with OCR…");
    setMScanSuccess("");
    setError("");
    try {
      const result = await scanMaintenanceReceipt(file, setMProgress);
      setMExtractedText(result.text || "");
      if (result.amount) setMAmount(result.amount);
      if (result.vendor) setMVendor(result.vendor);
      if (result.date) setMDate(result.date);
      if (result.category) {
        const cat = result.category;
        const found = PROPERTY_MAINTENANCE_PRESETS.find((p) =>
          p.toLowerCase().includes(cat.toLowerCase())
        );
        if (found) setMCategory(found);
      }
      setMFiles([file]);
      setMScanSuccess(
        `Extracted: ${result.category || "Service"} · ${result.vendor || "Vendor"} · ${
          result.amount ? `৳${result.amount}` : "Amount"
        }`
      );
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setMScanning(false);
      setMProgress("");
    }
  };

  // Submit inline maintenance record
  const handleInlineSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!mAmount || Number(mAmount) <= 0) {
      setError("Please specify maintenance amount greater than 0.");
      return;
    }
    if (!mDesc.trim()) {
      setError("Please enter a short description of the problem or fix.");
      return;
    }

    void run(async () => {
      await saveRentalMaintenance(
        {
          property_id: selectedId,
          unit_id: mUnitId ? mUnitId : null,
          category: mCategory,
          amount: Number(mAmount),
          date: mDate,
          vendor: mVendor.trim(),
          description: mDesc.trim(),
          payment_method: mPaymentMethod,
          extracted_text: mExtractedText,
        },
        mFiles
      );
      setMAmount("");
      setMVendor("");
      setMDesc("");
      setMFiles([]);
      setMScanSuccess("");
      setMExtractedText("");
      setIsMaintenanceModalOpen(false);
    });
  };

  const property = data?.properties.find((p) => p.id === selectedId);
  const units = data?.units.filter((u) => u.propertyId === selectedId) || [];
  const tenancies =
    data?.tenancies.filter((t) => units.some((u) => u.id === t.unit_id)) || [];

  const propertyTabs = [
    {
      name: "Flats & Renters",
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
          className="text-xs text-emerald-700 underline flex items-center gap-1"
        >
          <FileText className="h-3 w-3" />
          {file.name}
        </button>
      ))}
    </div>
  );

  // Expiring Document Warnings for selected property
  const propertyDocs = useMemo(
    () => data?.documents.filter((d) => d.property_id === selectedId) || [],
    [data, selectedId]
  );

  const expiringDocs = useMemo(() => {
    return propertyDocs.filter((doc) => {
      if (!doc.expiry_date) return false;
      const status = getDaysRemaining(doc.expiry_date || undefined);
      return status.tone === "warn" || status.tone === "danger";
    });
  }, [propertyDocs]);

  // Maintenance cost aggregate for selected property
  const propertyMaintenance = useMemo(
    () => data?.maintenance.filter((m) => m.property_id === selectedId) || [],
    [data, selectedId]
  );

  const totalPropertyMaintenanceCost = useMemo(
    () => sumMoney(propertyMaintenance.map((m) => Number(m.amount))),
    [propertyMaintenance]
  );

  // Portfolio-wide metrics mirroring the Vehicle Fleet Strip
  const scopedProperties = useMemo(() => {
    if (!data?.properties) return [];
    if (!userAccess || userAccess.isHead || userAccess.access.assignedPropertyScope !== "specific") {
      return data.properties;
    }
    const allowed = userAccess.access.assignedPropertyIds || [];
    return data.properties.filter((p) => allowed.includes(p.id));
  }, [data?.properties, userAccess]);

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
    const totalProperties = scopedProperties.length;

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

    const residentialCount = scopedProperties.filter(
      (p) =>
        (p.type || "").toLowerCase().includes("residential") ||
        (p.type || "").toLowerCase().includes("flat")
    ).length;
    const commercialCount = scopedProperties.filter(
      (p) =>
        (p.type || "").toLowerCase().includes("commercial") ||
        (p.type || "").toLowerCase().includes("shop")
    ).length;
    const mixedCount = scopedProperties.filter((p) =>
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
  }, [data, scopedProperties]);

  // Filtered Properties for the Main List
  const filteredProperties = useMemo(() => {
    if (!data) return [];
    return scopedProperties.filter((p) => {
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
  }, [scopedProperties, data, activeCategory, searchQuery]);

  const propertyColumns: Column<Property>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Property Name",
        sortable: true,
        render: (p: Property) => (
          <div className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-emerald-600 transition">
            <Building2 className="text-emerald-600 shrink-0" size={16} />
            <span>{p.name}</span>
          </div>
        ),
      },
      {
        key: "location",
        header: "Address & Location",
        sortable: true,
        render: (p: Property) => <span className="text-slate-600">{p.location}</span>,
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        render: (p: Property) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {p.type || "Residential"}
          </span>
        ),
      },
      {
        key: "spaces",
        header: "Flats / Spaces",
        render: (p: Property) => {
          const pUnits = (data?.units || []).filter((u) => u.propertyId === p.id);
          return (
            <span className="text-slate-600 font-mono">
              {pUnits.filter((u) => !u.parentUnitId).length} spaces
            </span>
          );
        },
      },
      {
        key: "occupancy",
        header: "Occupancy Status",
        render: (p: Property) => {
          const pUnits = (data?.units || []).filter((u) => u.propertyId === p.id);
          const rentals = pUnits.filter((u) => u.rentalMode !== "rooms");
          const occupied = rentals.filter((u) =>
            (data?.tenancies || []).some(
              (t) =>
                t.unit_id === u.id &&
                t.start_month.slice(0, 7) <= currentMonth() &&
                (!t.end_month || t.end_month.slice(0, 7) >= currentMonth())
            )
          ).length;
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                occupied === rentals.length && rentals.length > 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : occupied > 0
                  ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {occupied}/{rentals.length} occupied
            </span>
          );
        },
      },
      {
        key: "monthlyRent",
        header: "Monthly Rent",
        render: (p: Property) => {
          const pUnits = (data?.units || []).filter((u) => u.propertyId === p.id);
          const rentals = pUnits.filter((u) => u.rentalMode !== "rooms");
          const propRent = rentals.reduce((sum, u) => {
            const tenancy = (data?.tenancies || []).find(
              (t) =>
                t.unit_id === u.id &&
                t.start_month.slice(0, 7) <= currentMonth() &&
                (!t.end_month || t.end_month.slice(0, 7) >= currentMonth())
            );
            if (!tenancy) return sum;
            const schedule = (data?.schedules || []).find(
              (s) =>
                s.tenancy_id === tenancy.id &&
                s.from_month.slice(0, 7) <= currentMonth() &&
                (!s.to_month || s.to_month.slice(0, 7) >= currentMonth())
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
            <span className="font-mono font-semibold text-slate-900">
              {propRent > 0 ? `৳${propRent.toLocaleString()}` : "—"}
            </span>
          );
        },
      },
    ],
    [data]
  );

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Properties & Rent Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to access family property, real estate deeds, and rental records. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Header */}
      {property ? (
        <UiPageHeader
          title={property.name}
          subtitle={property.location || undefined}
          helpTooltip="Manage flats, rooms, rent schedules, and maintenance records for this building."
          onBack={() => setParams({})}
          sticky={true}
          actions={
            <div className="flex items-center gap-2 shrink-0">
              <UiButton
                variant="primary"
                size="sm"
                onClick={handleOpenAddUnit}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Add flat
              </UiButton>
              {(!userAccess || userAccess.isHead || userAccess.access.canDeleteProperties !== false) && (
                <UiButton
                  variant="danger"
                  size="sm"
                  onClick={() => removeProperty(property.id, property.name)}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete
                </UiButton>
              )}
            </div>
          }
        />
      ) : (
        <>
          {/* Mobile Top Header Integration via Portal into MobileHeader */}
          {headerPortalEl &&
            (!userAccess || userAccess.isHead || userAccess.access.canCreateProperties !== false) &&
            createPortal(
              <div className="flex items-center gap-1.5 lg:hidden">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 transition cursor-pointer"
                  onClick={handleOpenAddProperty}
                  disabled={!data}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add property</span>
                </button>
              </div>,
              headerPortalEl
            )}

          {/* Desktop Top Header (Enterprise Sticky Header, Zero Margin on Top/Left/Right) */}
          <UiPageHeader
            title={dashboard ? "Property Dashboard" : "Properties & Rentals"}
            helpTooltip={
              dashboard
                ? "Financial insights, profit/loss, occupancy rates, and collection reports."
                : "Whole flats, multiple rooms, renter records, rent ledgers, and maintenance."
            }
            subtitle={
              dashboard
                ? "Financial insights, profit/loss, occupancy rates, and collection reports."
                : "Whole flats, multiple rooms, renter records, rent ledgers, and maintenance."
            }
            sticky={true}
            className="hidden lg:block"
            actions={
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={dashboard ? "/rentals/properties" : "/rentals/dashboard"}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{dashboard ? "Manage" : "Reports"}</span>
                </Link>
                {(!userAccess || userAccess.isHead || userAccess.access.canCreateProperties !== false) && (
                  <UiButton
                    variant="primary"
                    size="sm"
                    onClick={handleOpenAddProperty}
                    disabled={!data}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add property
                  </UiButton>
                )}
              </div>
            }
          />
        </>
      )}

      {/* Main Content Area with Page Padding */}
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 pb-28 sm:pb-8">

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
        <BrandLogoLoader
          message="Loading Properties & Rentals..."
          subtitle="Fetching tenants, units, and rental ledgers"
        />
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
                    {scopedProperties.map((p) => (
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
                  {/* Property Fleet / Portfolio Metric Strip */}
                  <div className="grid grid-cols-4 gap-2 lg:hidden">
                    <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-500">Properties</div>
                      <div className="text-base font-bold text-slate-900">{metrics.totalProperties}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
                      <div className="text-[10px] font-semibold text-emerald-600">Units</div>
                      <div className="text-base font-bold text-emerald-700">{metrics.totalUnits}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
                      <div className="text-[10px] font-semibold text-emerald-600">Rented</div>
                      <div className="text-base font-bold text-emerald-700">{metrics.occupancyRate}%</div>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-white px-1 py-1.5 text-center shadow-2xs">
                      <div className="text-[10px] font-semibold text-amber-600">Rent/Mo</div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        ৳{metrics.expectedMonthlyRent.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:grid lg:grid-cols-4 gap-3">
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
                      <div className="flex items-center justify-between text-emerald-600">
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
                          Units Rented Out
                        </span>
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {metrics.occupancyRate}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {metrics.occupiedUnits} rented flats/rooms
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-amber-600">
                        <span className="text-[11px] font-medium text-slate-500">
                          Total Monthly Rent
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                      <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search property or renter…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-900 shadow-2xs"
                        />
                      </div>

                      {/* Filter Icon Button */}
                      <button
                        type="button"
                        onClick={() => setMobileFiltersOpen((prev) => !prev)}
                        className={`inline-flex items-center justify-center h-8.5 w-8.5 rounded-xl border transition shrink-0 shadow-2xs cursor-pointer relative ${
                          mobileFiltersOpen || activeFilterCount > 0
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        title="Filter properties"
                        aria-label="Filter"
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white px-1 shadow-2xs">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>

                      <ViewModeToggle
                        viewMode={propertyView}
                        onChange={(mode) => setPropertyView(mode as "table" | "grid")}
                        gridLabel="Grid"
                        listLabel="Table"
                        listValue="table"
                      />
                    </div>

                    {/* Expandable Category Pills when Filter is active / open */}
                    {(mobileFiltersOpen || activeFilterCount > 0) && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
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
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 transition cursor-pointer ${
                              activeCategory === cat.id
                                ? "bg-[#064e3b] text-white shadow-2xs"
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
                    )}
                  </div>

                  {/* Table View */}
                  {propertyView === "table" ? (
                    <UiTable<Property>
                      data={filteredProperties}
                      columns={propertyColumns}
                      keyField="id"
                      pagination={true}
                      pageSize={10}
                      pageSizeOptions={[8, 10, 15, 25, 50]}
                      showSearch={false}
                      fullHeight={false}
                      onRowClick={(p) => {
                        setParams({ property: p.id });
                        setTab("Flats & Renters");
                      }}
                      rowActions={(p) => {
                        const pUnits = (data?.units || []).filter((u) => u.propertyId === p.id);
                        return (
                          <TableRowActions
                            title={p.name}
                            subtitle={`${p.location} • ${pUnits.filter((u) => !u.parentUnitId).length} spaces`}
                            actions={[
                              {
                                label: "Manage Flats & Renters",
                                description: "View units, tenancies, and leases",
                                icon: Building2,
                                onClick: () => {
                                  setParams({ property: p.id });
                                  setTab("Flats & Renters");
                                },
                              },
                              ...((!userAccess || userAccess.isHead || userAccess.access.canDeleteProperties !== false)
                                ? [
                                    {
                                      label: "Delete Property",
                                      description: "Permanently delete this property",
                                      icon: Trash2,
                                      variant: "danger" as const,
                                      onClick: () => removeProperty(p.id, p.name),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        );
                      }}
                      emptyMessage="No properties matching your filter. Click '+ Add property' to create one."
                    />
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
                            className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition"
                          >
                            <button
                              type="button"
                              className="w-full text-left"
                              onClick={() => {
                                setParams({ property: p.id });
                                setTab("Flats & Renters");
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-600">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                  {p.type || "Residential"}
                                </span>
                              </div>

                              <h2 className="mt-3 font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition">
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
                                className="text-emerald-700 hover:underline"
                                onClick={() => {
                                  setParams({ property: p.id });
                                  setTab("Flats & Renters");
                                }}
                              >
                                Manage property →
                              </button>
                              {(!userAccess || userAccess.isHead || userAccess.access.canDeleteProperties !== false) && (
                                <button
                                  type="button"
                                  className="text-rose-600 hover:underline"
                                  onClick={() => removeProperty(p.id, p.name)}
                                >
                                  Delete
                                </button>
                              )}
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
                  {/* Section Tabs - Sleek horizontal scrolling segmented control */}
                  <nav
                    className="rental-no-print"
                    aria-label="Property sections"
                  >
                    <div className="p-1 bg-slate-100/90 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                      {propertyTabs.map(({ name, icon: TabIcon, count }) => {
                        const isSelected = tab === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setTab(name)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                              isSelected
                                ? "bg-white text-slate-900 shadow-2xs font-bold"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                            }`}
                          >
                            <TabIcon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-emerald-600" : "text-slate-500"
                              }`}
                            />
                            <span>{name === "Property Documents" ? "Documents" : name}</span>
                            {count !== undefined && (
                              <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                                  isSelected
                                    ? "bg-emerald-50 text-emerald-700 font-bold"
                                    : "bg-slate-200/70 text-slate-600"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </nav>

                  {/* TAB 1: Flats & Renters */}
                  {tab === "Flats & Renters" && (
                    <div className="space-y-4">
                      {units
                        .filter((u) => !u.parentUnitId)
                        .map((flat) => {
                          const isRooms = flat.rentalMode === "rooms";
                          const roomUnits = units.filter((u) => u.parentUnitId === flat.id);

                          // For whole flat, flat is the unit itself
                          const wholeUnitTenancies = tenancies
                            .filter((t) => t.unit_id === flat.id)
                            .sort((a, b) => b.start_month.localeCompare(a.start_month));
                          const wholeActiveTenancy = wholeUnitTenancies.find(
                            (t) =>
                              t.start_month.slice(0, 7) <= currentMonth() &&
                              (!t.end_month || t.end_month.slice(0, 7) >= currentMonth())
                          );

                          // Helper to format unit titles cleanly
                          const formatUnitTitle = (unitNumber: string, defaultPrefix = "Flat") => {
                            const trimmed = (unitNumber || "").trim();
                            if (/^(flat|unit|room|shop|apartment|apt|suite)\b/i.test(trimmed)) {
                              return trimmed;
                            }
                            return `${defaultPrefix} ${trimmed}`;
                          };

                          // Helper to render responsive squircle unit badge
                          const renderUnitBadge = (unitNumber: string, isPurple = false) => {
                            const trimmed = (unitNumber || "").trim();
                            const stripped = trimmed.replace(/^(flat|unit|room|suite|apt|apartment|shop)\s*/i, "").trim();
                            const showText = stripped.length > 0 && stripped.length <= 4;
                            const displayText = showText ? stripped.toUpperCase() : null;

                            const bgBorder = isPurple
                              ? "bg-purple-50 border-purple-100/80 text-purple-700"
                              : "bg-emerald-50 border-emerald-100/80 text-emerald-700";

                            return (
                              <div
                                className={`h-9 w-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs select-none ${bgBorder}`}
                                title={unitNumber}
                              >
                                {displayText ? (
                                  <span className="font-mono tracking-tight">{displayText}</span>
                                ) : (
                                  <Home className="h-4.5 w-4.5" />
                                )}
                              </div>
                            );
                          };

                          // Helper to render tenancies list & rent schedules
                          const renderTenancySection = (targetUnit: PropertyUnit, tList: RentalTenancy[]) => {
                            return (
                              <div className="space-y-2.5">
                                {tList.map((t) => {
                                  const tenantSchedules = data.schedules
                                    .filter((s) => s.tenancy_id === t.id)
                                    .sort((a, b) => a.from_month.localeCompare(b.from_month));

                                  return (
                                    <div
                                      key={t.id}
                                      className="space-y-2.5 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2 flex-wrap">
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
                                            {targetUnit.tenantEmail && (
                                              <span className="inline-flex items-center gap-1 text-slate-500">
                                                <Mail className="h-3 w-3 text-slate-400" />
                                                {targetUnit.tenantEmail}
                                              </span>
                                            )}
                                            {t.tenant_nid && (
                                              <details className="inline-block text-[11px] text-slate-500">
                                                <summary className="cursor-pointer font-medium text-emerald-700">
                                                  NID: {t.tenant_nid.slice(0, 4)}••••
                                                </summary>
                                                <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800">
                                                  {t.tenant_nid}
                                                </span>
                                              </details>
                                            )}
                                            {(() => {
                                              const matchingDocs = propertyDocs.filter(
                                                (d) =>
                                                  (t.tenant_nid && d.document_number === t.tenant_nid) ||
                                                  (d.name.toLowerCase().includes(t.tenant_name.toLowerCase()) &&
                                                    d.category.toLowerCase().includes("nid"))
                                              );
                                              const allNidFiles = [
                                                ...(t.nid_files || []),
                                                ...matchingDocs.flatMap((d) => d.files || []),
                                              ];
                                              const uniqueNidFiles = allNidFiles.filter(
                                                (f, idx, arr) => arr.findIndex((x) => x.path === f.path) === idx
                                              );
                                              if (!uniqueNidFiles.length) return null;
                                              return (
                                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    NID Card:
                                                  </span>
                                                  {renderFiles(uniqueNidFiles)}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <button
                                            type="button"
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                                            onClick={() =>
                                              setEditor({
                                                type: "tenant",
                                                unit: targetUnit,
                                                tenancy: t,
                                              })
                                            }
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
                                            onClick={() =>
                                              setEditor({ type: "rate", tenancy: t })
                                            }
                                          >
                                            + Rent period
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeTenancy(t.id, t.tenant_name)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                            title={`Delete renter record for ${t.tenant_name}`}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Rent Breakdown Cards */}
                                      <div className="space-y-1.5">
                                        {tenantSchedules.map((s) => {
                                          const total = sumMoney([
                                            s.base_rent,
                                            ...s.charges.map((c) => c.amount),
                                          ]);
                                          return (
                                            <div
                                              key={s.id}
                                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs"
                                            >
                                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-baseline gap-1.5">
                                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                                    {money(total)}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-mono">/mo</span>
                                                  <span className="text-[10px] text-slate-400 font-mono ml-0.5">
                                                    ({s.from_month.slice(0, 7)} —{" "}
                                                    {s.to_month?.slice(0, 7) || "Ongoing"})
                                                  </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                                                  <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 font-medium">
                                                    Base: {money(s.base_rent)}
                                                  </span>
                                                  {s.charges.map((c) => (
                                                    <span
                                                      key={c.label}
                                                      className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium"
                                                    >
                                                      {c.label}: {money(c.amount)}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                                  onClick={() =>
                                                    setEditor({
                                                      type: "rate",
                                                      tenancy: t,
                                                      schedule: s,
                                                    })
                                                  }
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => removeSchedule(s.id)}
                                                  className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition cursor-pointer"
                                                  title="Delete rate period"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </div>
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
                          };

                          if (!isRooms) {
                            return (
                              <section
                                key={flat.id}
                                className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3"
                              >
                                {/* Whole Flat Header */}
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {renderUnitBadge(flat.unitNumber, false)}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="font-bold text-sm text-slate-900 truncate">
                                          {formatUnitTitle(flat.unitNumber, "Flat")}
                                        </h2>
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            wholeActiveTenancy
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                              : "bg-amber-50 text-amber-800 border border-amber-200/60"
                                          }`}
                                        >
                                          {wholeActiveTenancy ? "Occupied" : "Vacant Space"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                        Rented as a whole {flat.floor ? `· Floor: ${flat.floor}` : ""}{" "}
                                        {flat.sizeSqft > 0 ? `· ${flat.sizeSqft} sqft` : ""}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer"
                                      onClick={() => setEditor({ type: "tenant", unit: flat })}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>{wholeActiveTenancy ? "Add Next Renter" : "Add Renter"}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeUnit(flat.id, flat.unitNumber)}
                                      className="p-1.5 rounded-full border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                                      title={`Delete flat "${flat.unitNumber}"`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Whole Flat Content */}
                                {!wholeUnitTenancies.length && (
                                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                                    <div>
                                      <p className="font-semibold text-slate-800">Space currently vacant</p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {flat.tenantName
                                          ? `Previous recorded renter: ${flat.tenantName}. Click "Add Renter" to add dates and rent schedule.`
                                          : "Assign a renter and set monthly rent rate to start collecting rent."}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {wholeUnitTenancies.length > 0 &&
                                  renderTenancySection(flat, wholeUnitTenancies)}
                              </section>
                            );
                          }

                          // Rooms rented separately
                          return (
                            <section
                              key={flat.id}
                              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3"
                            >
                              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {renderUnitBadge(flat.unitNumber, true)}
                                  <div className="min-w-0">
                                    <h2 className="font-bold text-sm text-slate-900 truncate">
                                      {formatUnitTitle(flat.unitNumber, "Flat")}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                      Rooms rented separately {flat.floor ? `· Floor: ${flat.floor}` : ""}{" "}
                                      {flat.sizeSqft > 0 ? `· ${flat.sizeSqft} sqft` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => removeUnit(flat.id, flat.unitNumber)}
                                    className="p-1.5 rounded-full border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                                    title={`Delete flat "${flat.unitNumber}"`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {roomUnits.map((room) => {
                                  const roomTenancies = tenancies
                                    .filter((t) => t.unit_id === room.id)
                                    .sort((a, b) => b.start_month.localeCompare(a.start_month));
                                  const activeT = roomTenancies.find(
                                    (t) =>
                                      t.start_month.slice(0, 7) <= currentMonth() &&
                                      (!t.end_month || t.end_month.slice(0, 7) >= currentMonth())
                                  );

                                  return (
                                    <div
                                      key={room.id}
                                      className="rounded-xl bg-slate-50/80 border border-slate-200/70 p-3 space-y-2.5"
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                        <div className="flex items-center gap-2">
                                          <h3 className="text-xs font-bold text-slate-900">
                                            {formatUnitTitle(room.unitNumber, "Room")}
                                          </h3>
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                              activeT
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                : "bg-amber-50 text-amber-800 border border-amber-200/60"
                                            }`}
                                          >
                                            {activeT ? "Occupied" : "Vacant"}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                                            onClick={() => setEditor({ type: "tenant", unit: room })}
                                          >
                                            <Plus className="h-3 w-3" />
                                            <span>{activeT ? "Add Next Renter" : "Add Renter"}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeUnit(room.id, room.unitNumber)}
                                            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                            title={`Delete room "${room.unitNumber}"`}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {!roomTenancies.length && (
                                        <p className="text-[11px] text-slate-400">
                                          Room is currently vacant. Click "Add Renter" to assign a renter.
                                        </p>
                                      )}

                                      {roomTenancies.length > 0 &&
                                        renderTenancySection(room, roomTenancies)}
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })}
                      {!units.filter((u) => !u.parentUnitId).length && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                          No flats added yet. Click "+ Add flat" above to create your first unit.
                        </div>
                      )}
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

                      {/* Flats & Monthly Rent Setup Helper Bar */}
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100/80 pb-2">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                            <ReceiptText className="h-4 w-4 text-emerald-600" />
                            <span>Monthly Rent & Renter Rate Setup for {month}</span>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            Set renter & rent amount to enable monthly collection & ledger
                          </span>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {units
                            .filter((u) => !u.parentUnitId)
                            .map((u) => {
                              const activeT = tenancies.find(
                                (t) =>
                                  t.unit_id === u.id &&
                                  t.start_month.slice(0, 7) <= month &&
                                  (!t.end_month || t.end_month.slice(0, 7) >= month)
                              );
                              const activeSchedule = activeT
                                ? data.schedules.find(
                                    (s) =>
                                      s.tenancy_id === activeT.id &&
                                      s.from_month.slice(0, 7) <= month &&
                                      (!s.to_month || s.to_month.slice(0, 7) >= month)
                                  )
                                : null;

                              return (
                                <div
                                  key={u.id}
                                  className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-slate-900">
                                        {u.unitNumber}
                                      </span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                          activeSchedule
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                            : activeT
                                            ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {activeSchedule
                                          ? "Rent Active"
                                          : activeT
                                          ? "Missing Rent Rate"
                                          : "Vacant"}
                                      </span>
                                    </div>

                                    <p className="mt-1 text-xs text-slate-600">
                                      {activeT ? (
                                        <>
                                          Renter: <strong className="text-slate-800">{activeT.tenant_name}</strong>
                                        </>
                                      ) : (
                                        "No renter recorded"
                                      )}
                                    </p>

                                    {activeSchedule ? (
                                      <p className="mt-1 text-[11px] font-mono font-bold text-emerald-700">
                                        Rate: {money(activeSchedule.base_rent + activeSchedule.charges.reduce((sum, c) => sum + c.amount, 0))}/mo
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-[10px] text-slate-400">
                                        {activeT
                                          ? `Add dated rate to show in ${month} ledger`
                                          : "Assign renter and set how much they pay"}
                                      </p>
                                    )}
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                    {activeT ? (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                                        onClick={() =>
                                          setEditor({
                                            type: "rate",
                                            tenancy: activeT,
                                            schedule: activeSchedule || undefined,
                                          })
                                        }
                                      >
                                        <Plus className="h-3 w-3" />
                                        {activeSchedule ? "Update Rent Rate" : "Set Rent Amount (৳)"}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition"
                                        onClick={() =>
                                          setEditor({ type: "tenant", unit: u })
                                        }
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add Renter & Rent (৳)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              {[
                                "Flat / Renter",
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
                                  className="p-8 text-center"
                                >
                                  <div className="max-w-md mx-auto space-y-2">
                                    <ReceiptText className="h-8 w-8 text-emerald-400 mx-auto" />
                                    <p className="font-bold text-slate-800 text-sm">
                                      No rent records active for {month}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Use the buttons in the "Monthly Rent & Renter Rate Setup" box above to set the rent for your flats. Once set, payment checkboxes and collection balances will appear here immediately.
                                    </p>
                                  </div>
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

                  {/* TAB 3: Property Documents (Full Vehicle Parity with Preset Checklist & Expiry Alerts) */}
                  {tab === "Property Documents" && (
                    <div className="space-y-4">
                      {/* Presets & Quick Add Bar (Matching Vehicle Style) */}
                      <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div>
                            <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                              <FileCheck className="h-4 w-4 text-emerald-600" />
                              Bangladesh Land & Property Legal Compliance Documents
                            </h2>
                            <p className="text-[11px] text-emerald-700/80 mt-0.5">
                              Quickly store Dalil (দলিল), Khatian (খতিয়ান), Namjari (নামজারি), Holding Tax, and Tenancy Agreements.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditor({ type: "document" })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#043327] transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Custom Named Document
                          </button>
                        </div>

                        {/* Presets Checklist / Quick Upload Shortcuts */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {BD_PROPERTY_DOC_PRESETS.map((preset) => {
                            const existing = propertyDocs.find(
                              (d) =>
                                d.category === preset.category ||
                                d.name.toLowerCase().includes(preset.name.toLowerCase())
                            );
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() =>
                                  setEditor({
                                    type: "document",
                                    preset: {
                                      name: preset.name,
                                      category: preset.category,
                                    },
                                  })
                                }
                                className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                                  existing
                                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-2xs"
                                    : "border-slate-200/90 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {existing
                                      ? "Added"
                                      : preset.required
                                      ? "Required"
                                      : "Optional"}
                                  </span>
                                  {existing ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </div>
                                <div className="text-xs font-bold leading-tight">
                                  {preset.name}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                                  {preset.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expiring Document Warnings */}
                      {expiringDocs.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-amber-900 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>
                              <strong>{expiringDocs.length} legal document(s) expiring soon or overdue:</strong>{" "}
                              {expiringDocs.map((d) => d.name).join(", ")}.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Uploaded Documents Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Property Document Vault ({propertyDocs.length} recorded)
                          </h3>
                        </div>

                        {propertyDocs.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-800">
                              No documents uploaded for this property
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Click on any required document above or "Custom Named Document" to store your Title Deed, Khatian, or Agreement.
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {propertyDocs.map((doc) => {
                              const expiryInfo = getDaysRemaining(doc.expiry_date || undefined);
                              return (
                                <div
                                  key={doc.id}
                                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                                          {doc.category}
                                        </span>
                                        <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                                          {doc.name}
                                        </h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteDoc(doc.id, doc.name, doc.files)
                                        }
                                        className="text-slate-400 hover:text-rose-600 transition p-1"
                                        title="Delete document"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    {doc.document_number && (
                                      <p className="text-[11px] font-mono text-slate-600 mt-1">
                                        Doc #: {doc.document_number}
                                      </p>
                                    )}

                                    <div className="mt-2.5 flex items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                          expiryInfo.tone === "danger"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : expiryInfo.tone === "warn"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        }`}
                                      >
                                        {expiryInfo.label}
                                      </span>
                                    </div>

                                    <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                                      {doc.issue_date && (
                                        <p>Issued: {doc.issue_date}</p>
                                      )}
                                      {doc.expiry_date && (
                                        <p>Expires: {doc.expiry_date}</p>
                                      )}
                                    </div>

                                    {doc.notes && (
                                      <p className="mt-2 text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded">
                                        {doc.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                                    {renderFiles(doc.files)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Maintenance */}
                  {tab === "Maintenance" && (
                    <div className="space-y-4">
                      {/* Top Action Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
                        <div>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-emerald-600" />
                            Maintenance & Servicing History
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Track all property repairs, servicing, contractor bills, and renter unit fixes for {property?.name || "this property"}.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-full">
                            ৳{totalPropertyMaintenanceCost.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsMaintenanceTrendModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer"
                            title="View Maintenance Spending Trends"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Trend Graph</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsMaintenanceModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Log Maintenance</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Metrics Bar */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Total Maintenance Spent
                          </span>
                          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
                            ৳{totalPropertyMaintenanceCost.toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Service Jobs Logged
                          </span>
                          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
                            {propertyMaintenance.length} records
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Latest Repair Date
                          </span>
                          <div className="mt-1 text-lg font-bold font-mono text-slate-900">
                            {propertyMaintenance[0]?.date || "—"}
                          </div>
                        </div>
                      </div>

                      {/* List of Maintenance Logs */}
                      {propertyMaintenance.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                          <Wrench className="h-10 w-10 text-slate-300 mx-auto" />
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              No maintenance records logged yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              Log plumbing, electrical repairs, painting, AC servicing, or contractor bills with receipt scanning.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMaintenanceModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Log Maintenance
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {propertyMaintenance.map((m) => (
                            <article
                              key={m.id}
                              className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                      {m.category}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">
                                      {m.unit_id
                                        ? units.find((u) => u.id === m.unit_id)
                                            ?.unitNumber || "Flat Unit"
                                        : "Common Areas / Building"}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                                    {m.description}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-base font-bold text-slate-900">
                                    {money(m.amount)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteMaint(m.id, m.description, m.files)
                                    }
                                    className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer rounded-lg hover:bg-slate-50"
                                    title="Delete record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                                <span className="font-mono">Date: {m.date}</span>
                                {m.vendor && (
                                  <span>Contractor: <strong className="text-slate-700">{m.vendor}</strong></span>
                                )}
                                {m.payment_method && (
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    Paid via {m.payment_method}
                                  </span>
                                )}
                              </div>

                              {m.files && m.files.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-100">
                                  {renderFiles(m.files)}
                                </div>
                              )}

                              {m.extracted_text && (
                                <details className="mt-2 text-xs text-slate-500">
                                  <summary className="cursor-pointer font-medium text-emerald-700 hover:underline">
                                    Show scanned memo text
                                  </summary>
                                  <pre className="whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-xl mt-1 text-[11px] border border-slate-100">
                                    {m.extracted_text}
                                  </pre>
                                </details>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
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
              schedules={data.schedules}
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
              preset={editor.preset}
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

          {/* POPUP MODAL: LOG MAINTENANCE / SERVICING */}
          {isMaintenanceModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
              onMouseDown={() => !busy && !mScanning && setIsMaintenanceModalOpen(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-emerald-600" />
                      Log Maintenance / Servicing
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Attach plumber/electrician receipt or bill to auto-extract details for {property?.name || "this property"}.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || mScanning}
                    onClick={() => setIsMaintenanceModalOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleInlineSaveMaintenance} className="p-6 space-y-4 overflow-y-auto">
                  {/* Smart Bill / Memo Scanner */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Bill / Memo Scanner
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-emerald-100">
                        Auto-Extracts Details
                      </span>
                    </div>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-white p-3.5 hover:bg-emerald-50/30 transition text-center">
                      <Upload className="h-5 w-5 text-emerald-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-800">
                        {mFiles.length > 0 ? mFiles[0].name : "Upload Receipt / Invoice (Image or PDF)"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Scans plumbing, electrical, AC servicing memo & cost
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={mScanning || busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleScanReceipt(f);
                        }}
                      />
                    </label>

                    {mScanning && (
                      <div className="text-xs font-medium text-emerald-700 flex items-center gap-2 pt-1">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        <span>{mProgress}</span>
                      </div>
                    )}

                    {mScanSuccess && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Details Extracted from Bill:
                        </div>
                        <div className="mt-0.5 text-[11px] text-emerald-700 font-mono">
                          {mScanSuccess}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Maintenance Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Maintenance Category *
                    </label>
                    <select
                      value={mCategory}
                      onChange={(e) => setMCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      {PROPERTY_MAINTENANCE_PRESETS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit / Space Covered */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unit / Space Covered
                    </label>
                    <select
                      value={mUnitId}
                      onChange={(e) => setMUnitId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      <option value="">Entire Building / Common Area</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitNumber} {u.tenantName ? `(${u.tenantName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount & Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount (৳ BDT) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="e.g. 2500"
                        value={mAmount}
                        onChange={(e) =>
                          setMAmount(e.target.value ? Number(e.target.value) : "")
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Service Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={mDate}
                        onChange={(e) => setMDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Technician & Payment Method */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Technician / Vendor
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rafiq Plumber"
                        value={mVendor}
                        onChange={(e) => setMVendor(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={mPaymentMethod}
                        onChange={(e) => setMPaymentMethod(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Problem & Fix Description *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Fixed master bathroom leaking pipe, replaced gasket"
                      value={mDesc}
                      onChange={(e) => setMDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Attach Repair Bills / Receipts
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={(e) => setMFiles(Array.from(e.target.files || []))}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={busy || mScanning}
                      onClick={() => setIsMaintenanceModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy || mScanning}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {busy ? "Saving record…" : "Log Maintenance Expense"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* POPUP MODAL: PROPERTY MAINTENANCE TREND GRAPH */}
          <PropertyMaintenanceTrendModal
            isOpen={isMaintenanceTrendModalOpen}
            onClose={() => setIsMaintenanceTrendModalOpen(false)}
            maintenance={propertyMaintenance}
            propertyName={property?.name}
            units={units}
          />
        </>
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
