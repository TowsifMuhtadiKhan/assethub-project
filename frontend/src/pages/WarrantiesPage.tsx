import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, Plus, Search, FileText, Trash2, Filter } from "lucide-react";
import {
  listWarranties,
  createWarranty,
  deleteWarranty,
} from "../services/warrantyService";
import { getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import type { WarrantyItem } from "../types";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";
import { DocumentViewerModal, type ViewableDocument } from "../components/common/DocumentViewerModal";
import { TableRowActions } from "../components/common/TableRowActions";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { ViewModeToggle } from "../components/common/ViewModeToggle";
import { UiPageHeader, UiButton } from "../components/design-system";

export function WarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ViewableDocument | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [error, setError] = useState("");
  const [warrantyRecipients, setWarrantyRecipients] = useState<string[]>(["Personal"]);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "grid";
    }
    try {
      return (localStorage.getItem("lifenest_warranties_view_mode") as "grid" | "table") || "grid";
    } catch {
      return "grid";
    }
  });

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

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    try {
      const [userAcc, w] = await Promise.all([
        getCurrentUserAccess(),
        listWarranties(),
      ]);
      setUserAccess(userAcc);
      if (!userAcc.isHead && userAcc.access.canAccessWarranties === false) {
        setIsLocked(true);
      }
      setWarranties(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warranties");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    const formElement = e.currentTarget;
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const pDate = String(form.get("purchaseDate"));
      const duration = Number(form.get("warrantyDurationMonths") || 12);
      const expiry = new Date(pDate);
      expiry.setMonth(expiry.getMonth() + duration);

      const file = form.get("receiptFile") as File | null;
      let receiptUrl = "";
      if (file && file.size > 0) {
        const reader = new FileReader();
        receiptUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const reminderEnabled = Boolean(form.get("reminderEnabled"));
      const reminderLead = Number(form.get("reminderLeadDays") || 15);
      let notes = String(form.get("notes") || "");
      if (reminderEnabled) {
        const rec = warrantyRecipients.length > 0 ? `, Recipients: ${warrantyRecipients.join(", ")}` : "";
        notes = `${notes} [Reminder: ${reminderLead} days before expiry${rec}]`.trim();
      }

      const newWarranty = await createWarranty({
        productName: String(form.get("productName")),
        category: String(form.get("category") || "Electronics"),
        purchaseDate: pDate,
        warrantyDurationMonths: duration,
        expiryDate: expiry.toISOString().split("T")[0],
        seller: String(form.get("seller") || ""),
        purchasePrice: Number(form.get("purchasePrice") || 0),
        serialNumber: String(form.get("serialNumber") || ""),
        invoiceNumber: String(form.get("invoiceNumber") || ""),
        receiptUrl: receiptUrl || undefined,
        status: "ACTIVE",
        notes,
      });

      setWarranties((prev) => [newWarranty, ...prev]);
      formElement?.reset?.();
      setIsAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create warranty");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this warranty record?")) return;
    try {
      await deleteWarranty(id);
      setWarranties((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const scopedWarranties = useMemo(() => {
    if (!userAccess || userAccess.isHead || userAccess.access.assignedWarrantyScope !== "specific") {
      return warranties;
    }
    const allowed = (userAccess.access.assignedWarrantyCategories || []).map((c: string) => c.toLowerCase());
    return warranties.filter((w) => allowed.includes((w.category || "").toLowerCase()));
  }, [warranties, userAccess]);

  const metrics = useMemo(() => {
    const total = scopedWarranties.length;
    const now = new Date();
    const active = scopedWarranties.filter(
      (w) => !w.expiryDate || new Date(w.expiryDate) >= now
    ).length;
    const expired = total - active;
    const totalValue = scopedWarranties.reduce(
      (sum, w) => sum + (w.purchasePrice || 0),
      0
    );
    return { total, active, expired, totalValue };
  }, [scopedWarranties]);

  const filtered = scopedWarranties.filter((w) => {
    const matchesSearch =
      w.productName.toLowerCase().includes(search.toLowerCase()) ||
      w.seller.toLowerCase().includes(search.toLowerCase()) ||
      w.serialNumber.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "active") {
      return !w.expiryDate || new Date(w.expiryDate) >= new Date();
    }
    if (statusFilter === "expired") {
      return w.expiryDate && new Date(w.expiryDate) < new Date();
    }
    return true;
  });

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Warranty Cards Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to access family purchase receipts and warranty cards. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Top Header Integration via Portal into MobileHeader */}
      {headerPortalEl &&
        (!userAccess || userAccess.isHead || userAccess.access.canCreateWarranties !== false) &&
        createPortal(
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Warranty</span>
            </button>
          </div>,
          headerPortalEl
        )}

      {/* Desktop Header (Enterprise Sticky Header, Zero Margin on Top/Left/Right) */}
      <UiPageHeader
        title="Warranty Cards"
        helpTooltip="Save purchase bills, receipts, and warranty cards with expiry dates."
        subtitle="Save purchase bills, receipts, and warranty cards with expiry dates."
        sticky={true}
        className="hidden lg:block"
        actions={
          (!userAccess || userAccess.isHead || userAccess.access.canCreateWarranties !== false) ? (
            <UiButton
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Warranty
            </UiButton>
          ) : null
        }
      />

      {/* Main Content Area with Page Padding */}
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 pb-28 sm:pb-8">

      {/* Metrics Row - Mobile 4-Column Compact Strip vs Desktop 4 Cards */}
      <div className="grid grid-cols-4 gap-2 lg:hidden">
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500">Total</div>
          <div className="text-base font-bold text-slate-900">{metrics.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-emerald-600">Active</div>
          <div className="text-base font-bold text-emerald-700">{metrics.active}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-rose-600">Expired</div>
          <div className="text-base font-bold text-rose-700">{metrics.expired}</div>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white px-1 py-1.5 text-center shadow-2xs">
          <div className="text-[10px] font-semibold text-slate-500">Value</div>
          <div className="text-xs font-bold text-slate-900 truncate">
            ৳{metrics.totalValue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Total Warranties</span>
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">{metrics.total}</div>
          <div className="text-[10px] text-slate-400">Recorded products</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-medium text-slate-500">Active Coverage</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-700">{metrics.active}</div>
          <div className="text-[10px] text-slate-400">Within warranty window</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-medium text-slate-500">Expired</span>
            <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="mt-1 text-lg font-bold text-rose-700">{metrics.expired}</div>
          <div className="text-[10px] text-slate-400">Past warranty date</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-medium text-slate-500">Protected Value</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">৳{metrics.totalValue.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">Purchase cost tracked</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Search Bar, Filter & View Switcher - Single Row on Mobile */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, sellers, serial numbers..."
              className="w-full rounded-xl border border-slate-200/90 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className={`inline-flex items-center justify-center h-8.5 w-8.5 rounded-xl border transition shrink-0 shadow-2xs cursor-pointer relative ${
              mobileFiltersOpen || statusFilter !== "all"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Filter warranties"
            aria-label="Filter"
          >
            <Filter className="h-3.5 w-3.5" />
            {statusFilter !== "all" && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white px-1 shadow-2xs">
                1
              </span>
            )}
          </button>

          {/* View Mode Toggle (Grid vs Table) */}
          <ViewModeToggle
            viewMode={viewMode}
            onChange={(mode) => {
              const nextMode = mode as "grid" | "table";
              setViewMode(nextMode);
              try {
                localStorage.setItem("lifenest_warranties_view_mode", nextMode);
              } catch {}
            }}
            gridLabel="Grid"
            listLabel="Table"
            listValue="table"
          />
        </div>

        {/* Expandable Status Filter Pills when Filter is active / open */}
        {(mobileFiltersOpen || statusFilter !== "all") && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "all", label: "All Warranties", count: metrics.total },
              { id: "active", label: "Active", count: metrics.active },
              { id: "expired", label: "Expired", count: metrics.expired },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as "all" | "active" | "expired")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#064e3b] text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <BrandLogoLoader
          message="Loading Warranties & Cards..."
          subtitle="Fetching appliances, coverage terms, and receipts"
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">
            No warranties recorded
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Never lose a receipt or miss a replacement window for ACs, TVs, laptops, or appliances.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-4 py-2 text-xs font-semibold text-white hover:from-[#073f30] hover:to-[#0b6e4e] transition shadow-sm shadow-emerald-950/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add first warranty
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => {
            const isExpired = w.expiryDate && new Date(w.expiryDate) < new Date();
            return (
              <div
                key={w.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                      {w.category}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                        isExpired
                          ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      }`}
                    >
                      {isExpired ? "EXPIRED" : "ACTIVE"}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-slate-900">
                    {w.productName}
                  </h3>
                  {w.seller && (
                    <div className="text-[11px] text-slate-500">Seller: {w.seller}</div>
                  )}

                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                    <div className="font-mono text-[10px] text-slate-500">Purchased: {w.purchaseDate}</div>
                    <div className="font-medium text-slate-700">
                      Warranty: {w.warrantyDurationMonths} Mos (Until {w.expiryDate})
                    </div>
                    {w.purchasePrice > 0 && (
                      <div className="font-mono text-[10px] text-slate-700">
                        Price: ৳{w.purchasePrice.toLocaleString()}
                      </div>
                    )}
                    {w.serialNumber && (
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        S/N: {w.serialNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  {w.receiptUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          name: `${w.productName} Warranty Receipt`,
                          fileUrl: w.receiptUrl,
                          fileType: "pdf",
                          category: "Warranty",
                          documentNumber: w.serialNumber,
                          expiryDate: w.expiryDate,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-600" /> View Receipt
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">No receipt file</span>
                  )}
                  <TableRowActions
                    title={w.productName}
                    subtitle={`${w.category} • ${w.warrantyDurationMonths} Mos Warranty`}
                    actions={[
                      ...(w.receiptUrl
                        ? [
                            {
                              label: "View Warranty Receipt",
                              description: "Preview scanned receipt or warranty card",
                              icon: FileText,
                              onClick: () =>
                                setViewingDoc({
                                  name: `${w.productName} Warranty Receipt`,
                                  fileUrl: w.receiptUrl,
                                  fileType: "pdf",
                                  category: "Warranty",
                                  documentNumber: w.serialNumber,
                                  expiryDate: w.expiryDate,
                                }),
                            },
                          ]
                        : []),
                      ...((!userAccess || userAccess.isHead || userAccess.access.canDeleteWarranties !== false)
                        ? [
                            {
                              label: "Delete Warranty Record",
                              description: "Permanently delete this record",
                              icon: Trash2,
                              variant: "danger" as const,
                              onClick: () => handleDelete(w.id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5">Product & Category</th>
                <th className="px-3.5 py-2.5">Seller & S/N</th>
                <th className="px-3.5 py-2.5">Purchase Date</th>
                <th className="px-3.5 py-2.5">Warranty & Expiry</th>
                <th className="px-3.5 py-2.5 font-mono text-right">Price</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
                <th className="px-3.5 py-2.5 text-center">Receipt</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((w) => {
                const isExpired = w.expiryDate && new Date(w.expiryDate) < new Date();
                return (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900 text-xs">{w.productName}</div>
                      <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        {w.category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700">
                      <div className="font-medium text-slate-800">{w.seller || "—"}</div>
                      {w.serialNumber && (
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                          S/N: {w.serialNumber}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                      {w.purchaseDate}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <div className="text-slate-800 font-medium">
                        {w.warrantyDurationMonths} Mos
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Until {w.expiryDate}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 font-mono font-bold text-slate-900 text-right">
                      {w.purchasePrice > 0 ? `৳${w.purchasePrice.toLocaleString()}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          isExpired
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        }`}
                      >
                        {isExpired ? "EXPIRED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-center">
                      {w.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingDoc({
                              name: `${w.productName} Warranty Receipt`,
                              fileUrl: w.receiptUrl,
                              fileType: "pdf",
                              category: "Warranty",
                              documentNumber: w.serialNumber,
                              expiryDate: w.expiryDate,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                          title="View Receipt"
                        >
                          <FileText className="h-3 w-3" /> View
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <TableRowActions
                        title={w.productName}
                        subtitle={`${w.category} • ${w.warrantyDurationMonths} Mos Warranty`}
                        actions={[
                          ...(w.receiptUrl
                            ? [
                                {
                                  label: "View Warranty Receipt",
                                  description: "Preview scanned receipt or warranty card",
                                  icon: FileText,
                                  onClick: () =>
                                    setViewingDoc({
                                      name: `${w.productName} Warranty Receipt`,
                                      fileUrl: w.receiptUrl,
                                      fileType: "pdf",
                                      category: "Warranty",
                                      documentNumber: w.serialNumber,
                                      expiryDate: w.expiryDate,
                                    }),
                                },
                              ]
                            : []),
                          ...((!userAccess || userAccess.isHead || userAccess.access.canDeleteWarranties !== false)
                            ? [
                                {
                                  label: "Delete Warranty Record",
                                  description: "Permanently delete this record",
                                  icon: Trash2,
                                  variant: "danger" as const,
                                  onClick: () => handleDelete(w.id),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                New Warranty & Purchase Record
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product / Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="productName"
                  required
                  placeholder="e.g. Walton Inverter AC, Rahimafrooz Battery"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                  <input
                    name="category"
                    defaultValue="Electronics"
                    placeholder="e.g. Electronics, Appliances, Parts"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seller / Store</label>
                  <input
                    name="seller"
                    placeholder="e.g. Transcom Digital, Daraz"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Purchase Date *</label>
                  <input
                    name="purchaseDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5 col-span-1 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warranty (Mos)</label>
                    <input
                      name="warrantyDurationMonths"
                      type="number"
                      defaultValue={12}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (৳)</label>
                    <input
                      name="purchasePrice"
                      type="number"
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Serial Number</label>
                  <input
                    name="serialNumber"
                    placeholder="e.g. SN-8921-X9"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice / Cash Memo</label>
                  <input
                    name="invoiceNumber"
                    placeholder="e.g. INV-90421"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Attach Receipt / Warranty Card</label>
                <input
                  name="receiptFile"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Item-Specific WhatsApp Reminder */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                    <input
                      name="reminderEnabled"
                      type="checkbox"
                      defaultChecked={false}
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Automated WhatsApp Warranty Expiry Alert</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-[11px] font-medium text-slate-700">Remind Lead Time:</span>
                  <select
                    name="reminderLeadDays"
                    defaultValue={15}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value={7}>7 days before expiry (Standard)</option>
                    <option value={15}>15 days before expiry (Recommended)</option>
                    <option value={30}>30 days before expiry (Early warning)</option>
                  </select>
                </div>

                <ItemRecipientSelector
                  selectedRecipients={warrantyRecipients}
                  onChange={setWarrantyRecipients}
                  label="Send Warranty Alert To:"
                  helperText="Choose which recipient alias(es) will receive the warranty expiry reminder."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Warranty terms, customer care number, etc."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal In-App Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
      />
      </div>
    </div>
  );
}
