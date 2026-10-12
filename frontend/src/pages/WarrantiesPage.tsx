import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Search, FileText, Trash2, LayoutGrid, List } from "lucide-react";
import {
  listWarranties,
  createWarranty,
  deleteWarranty,
} from "../services/warrantyService";
import type { WarrantyItem } from "../types";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";

export function WarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [warrantyRecipients, setWarrantyRecipients] = useState<string[]>(["Personal"]);
  const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
    try {
      return (localStorage.getItem("lifenest_warranties_view_mode") as "grid" | "table") || "grid";
    } catch {
      return "grid";
    }
  });

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    try {
      setWarranties(await listWarranties());
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

  const filtered = warranties.filter(
    (w) =>
      w.productName.toLowerCase().includes(search.toLowerCase()) ||
      w.seller.toLowerCase().includes(search.toLowerCase()) ||
      w.serialNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Purchases, Receipts & Warranties
          </h1>
          <p className="text-xs text-slate-500">
            Keep serial numbers, purchase proofs, and warranty expiry dates tracked.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add Warranty
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Search & View Mode Switcher */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, sellers, serial numbers..."
            className="w-full rounded-lg border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs outline-none focus:border-slate-400"
          />
        </div>

        {/* View Switcher: Grid vs Table */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setViewMode("grid");
              try {
                localStorage.setItem("lifenest_warranties_view_mode", "grid");
              } catch {}
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Grid card view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("table");
              try {
                localStorage.setItem("lifenest_warranties_view_mode", "table");
              } catch {}
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Table list view"
          >
            <List className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500">
          Loading warranties...
        </div>
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
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-3 w-3" /> Add first warranty
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
                    <a
                      href={w.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-800 hover:text-slate-900 underline"
                    >
                      <FileText className="h-3 w-3 text-slate-500" /> View Receipt
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400">No receipt file</span>
                  )}
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
                        <a
                          href={w.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                          title="View Receipt"
                        >
                          <FileText className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
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

            <form onSubmit={handleCreate} className="p-6 space-y-3.5">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-3 gap-2.5">
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

              <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}
