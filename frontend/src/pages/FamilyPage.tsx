import { useEffect, useState } from "react";
import { Users, Plus, Phone, Mail, MapPin, Trash2, Calendar, FileText } from "lucide-react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  listFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
} from "../services/familyService";
import type { FamilyMember, RelationshipType } from "../types";

const relationships: RelationshipType[] = [
  "Self",
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Other",
];

export function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setMembers(await listFamilyMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load family members");
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
      const newMember = await createFamilyMember({
        fullName: String(form.get("fullName")),
        relationship: String(form.get("relationship")) as RelationshipType,
        dateOfBirth: String(form.get("dateOfBirth") || "") || undefined,
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        address: String(form.get("address") || ""),
        nationality: String(form.get("nationality") || "Bangladeshi"),
        identificationInfo: String(form.get("identificationInfo") || ""),
        notes: String(form.get("notes") || ""),
      });

      setMembers((prev) => [...prev, newMember]);
      setIsAddOpen(false);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create family member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove this profile.")) return;
    try {
      await deleteFamilyMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Family & Member Profiles
          </h1>
          <p className="text-xs text-slate-500">
            Organize personal records and documents for yourself, spouse, children, and parents separately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add Member
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500">
          Loading family profiles...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">
            No family profiles yet
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Create profiles for yourself, spouse, or kids to keep medical records, passports, and IDs structured.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-3 w-3" /> Add profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const isSelf = m.relationship === "Self";
            const isSpouse = m.relationship === "Spouse";
            const isChild = m.relationship === "Child";
            const avatarBg = isSelf
              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
              : isSpouse
                ? "bg-rose-100 text-rose-800 border-rose-200"
                : isChild
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-slate-100 text-slate-800 border-slate-200";

              return (
                <div
                  key={m.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${avatarBg}`}>
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">
                            {m.fullName}
                          </h3>
                          <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {m.relationship}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                        title="Delete member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                      {m.dateOfBirth && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>DOB: <strong className="font-medium text-slate-700">{m.dateOfBirth}</strong></span>
                        </div>
                      )}
                      {m.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{m.phone}</span>
                        </div>
                      )}
                      {m.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{m.email}</span>
                        </div>
                      )}
                      {m.identificationInfo && (
                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="truncate">ID: {m.identificationInfo}</span>
                        </div>
                      )}
                      {m.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{m.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.notes && (
                    <div className="mt-3 rounded-lg bg-slate-50/80 p-2 text-[10px] text-slate-500 border border-slate-100">
                      {m.notes}
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
              Add Family Member Profile
            </h2>
            <form onSubmit={handleCreate} className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">Full Name *</label>
                <input
                  name="fullName"
                  required
                  placeholder="e.g. Dewan Mahmud, Ayesha Khan"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <FormControl size="small" fullWidth>
                  <InputLabel id="family-relationship-label" sx={{ fontSize: "0.8125rem" }}>
                    Relationship *
                  </InputLabel>
                  <Select
                    labelId="family-relationship-label"
                    name="relationship"
                    required
                    defaultValue="Spouse"
                    label="Relationship *"
                    sx={{
                      fontSize: "0.8125rem",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.5rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {relationships.map((r) => (
                      <MenuItem key={r} value={r} sx={{ fontSize: "0.8125rem" }}>
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Date of Birth</label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Phone</label>
                  <input
                    name="phone"
                    placeholder="+880 1..."
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  National ID / Passport / Birth Reg No
                </label>
                <input
                  name="identificationInfo"
                  placeholder="e.g. NID 5938491029..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Address</label>
                <input
                  name="address"
                  placeholder="e.g. Uttara, Dhaka"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Blood group, emergency contacts, or notes"
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
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
