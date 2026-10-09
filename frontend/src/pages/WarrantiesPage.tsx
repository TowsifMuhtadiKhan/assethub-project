import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Search, FileText, Trash2 } from "lucide-react";
import {
  listWarranties,
  createWarranty,
  deleteWarranty,
} from "../services/warrantyService";
import type { WarrantyItem } from "../types";

export function WarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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
        notes: String(form.get("notes") || ""),
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, sellers, serial numbers..."
          className="w-full rounded-lg border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-xs shadow-2xs outline-none focus:border-slate-400"
        />
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
      ) : (
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
                    className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Add Warranty
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-WARRANTY</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  New Purchase & Warranty Record
                </h2>
              </div>
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
