import { useEffect, useState } from "react";
import { Award, Plus, Search, Clock, Trash2, User } from "lucide-react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  listLicenses,
  createLicense,
  deleteLicense,
} from "../services/licenseService";
import { listFamilyMembers } from "../services/familyService";
import type { LicenseItem, FamilyMember } from "../types";

export function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [l, m] = await Promise.all([
        listLicenses(),
        listFamilyMembers(),
      ]);
      setLicenses(l);
      setFamilyMembers(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load licenses");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const newLicense = await createLicense({
        licenseName: String(form.get("licenseName")),
        licenseNumber: String(form.get("licenseNumber") || ""),
        holderName: String(form.get("holderName") || ""),
        familyMemberId: String(form.get("familyMemberId") || "") || undefined,
        issuingAuthority: String(form.get("issuingAuthority") || ""),
        issueDate: String(form.get("issueDate") || "") || undefined,
        expiryDate: String(form.get("expiryDate") || "") || undefined,
        renewalPeriod: String(form.get("renewalPeriod") || "Annual"),
        renewalCost: Number(form.get("renewalCost") || 0),
        notes: String(form.get("notes") || ""),
      });

      setLicenses((prev) => [newLicense, ...prev]);
      setIsAddOpen(false);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create license");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this license record?")) return;
    try {
      await deleteLicense(id);
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const filtered = licenses.filter(
    (l) =>
      l.licenseName.toLowerCase().includes(search.toLowerCase()) ||
      l.licenseNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.holderName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Personal Licenses & Registrations
          </h1>
          <p className="text-xs text-slate-500">
            Track Driving Licenses, Trade Licenses, TIN certificates, and Professional Memberships.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add License
        </button>
      </div>

      {/* Database Setup Banner */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Modern Search Bar */}
      <div>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search licenses by title, number, or holder..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="h-4 w-4 text-slate-400" />
                </InputAdornment>
              ),
              sx: {
                fontSize: "0.8125rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.5rem",
                backgroundColor: "#ffffff",
              },
            },
          }}
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500">
          Loading licenses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          <Award className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">
            No licenses recorded
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Add driving licenses, trade registrations, or professional permits.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-3 w-3" /> Add first license
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lic) => {
            const isExpiring =
              lic.expiryDate &&
              (new Date(lic.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30;
            return (
              <div
                key={lic.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                      {lic.renewalPeriod} Renewal
                    </span>
                    <button
                      onClick={() => handleDelete(lic.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                      title="Delete license"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-slate-900">
                    {lic.licenseName}
                  </h3>
                  {lic.licenseNumber && (
                    <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                      No: {lic.licenseNumber}
                    </div>
                  )}

                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                    {lic.holderName && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="truncate">Holder: {lic.holderName}</span>
                      </div>
                    )}
                    {lic.issuingAuthority && (
                      <div className="text-slate-500 truncate">Authority: {lic.issuingAuthority}</div>
                    )}
                    {lic.expiryDate && (
                      <div
                        className={`flex items-center gap-1.5 font-mono text-[10px] ${
                          isExpiring ? "font-bold text-rose-600" : "text-slate-500"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        Expires: {lic.expiryDate} {isExpiring && "(Soon)"}
                      </div>
                    )}
                    {lic.renewalCost > 0 && (
                      <div className="font-mono text-[10px] text-slate-600">
                        Est. Fee: ৳{lic.renewalCost.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {lic.notes && (
                  <div className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-[10px] text-slate-500 border border-slate-100">
                    {lic.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Add License / Registration
            </h2>
            <form onSubmit={handleCreate} className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">License Title *</label>
                <input
                  name="licenseName"
                  required
                  placeholder="e.g. BRTA Professional Driving License, Trade License"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">License Number</label>
                  <input
                    name="licenseNumber"
                    placeholder="e.g. DL-18939210"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Holder Name</label>
                  <input
                    name="holderName"
                    placeholder="e.g. Self or family member name"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Issuing Authority</label>
                  <input
                    name="issuingAuthority"
                    placeholder="e.g. BRTA, City Corporation"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
                <FormControl size="small" fullWidth>
                  <InputLabel id="license-member-label" sx={{ fontSize: "0.8125rem" }}>
                    Family Member
                  </InputLabel>
                  <Select
                    labelId="license-member-label"
                    name="familyMemberId"
                    defaultValue=""
                    label="Family Member"
                    sx={{
                      fontSize: "0.8125rem",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.5rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: "0.8125rem" }}>
                      Personal / Self
                    </MenuItem>
                    {familyMembers.map((m) => (
                      <MenuItem key={m.id} value={m.id} sx={{ fontSize: "0.8125rem" }}>
                        {m.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Issue Date</label>
                  <input
                    name="issueDate"
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Expiry Date</label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <FormControl size="small" fullWidth>
                  <InputLabel id="renewal-period-label" sx={{ fontSize: "0.8125rem" }}>
                    Renewal Cycle
                  </InputLabel>
                  <Select
                    labelId="renewal-period-label"
                    name="renewalPeriod"
                    defaultValue="Annual"
                    label="Renewal Cycle"
                    sx={{
                      fontSize: "0.8125rem",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.5rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <MenuItem value="Annual" sx={{ fontSize: "0.8125rem" }}>Annual (Every Year)</MenuItem>
                    <MenuItem value="5 Years" sx={{ fontSize: "0.8125rem" }}>5 Years</MenuItem>
                    <MenuItem value="10 Years" sx={{ fontSize: "0.8125rem" }}>10 Years</MenuItem>
                    <MenuItem value="Lifetime" sx={{ fontSize: "0.8125rem" }}>Lifetime / No Expiry</MenuItem>
                  </Select>
                </FormControl>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Est. Renewal Fee (৳)</label>
                  <input
                    name="renewalCost"
                    type="number"
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Renewal requirements, police verification, etc."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save License"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
