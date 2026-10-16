import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AccessControlPage } from "./AccessControlPage";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Trash2,
  Shield,
  Car,
  Fuel,
  Wrench,
  Edit3,
  Share2,
  Copy,
  Check,
  X,
  KeyRound,
} from "lucide-react";
import { FormControl, Select, MenuItem } from "@mui/material";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import {
  listFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getDefaultMemberAccess,
} from "../services/familyService";
import { listVehicles } from "../services/vehicleService";
import type { FamilyMember, FamilyMemberAccess, RelationshipType, Vehicle } from "../types";

const RELATIONSHIPS: RelationshipType[] = [
  "Sibling",
  "Spouse",
  "Child",
  "Parent",
  "Self",
  "Other",
];

export function FamilyPage({ embedMode = false }: { embedMode?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"profiles" | "permissions">(() => {
    if (embedMode) return "profiles";
    return tabParam === "permissions" ? "permissions" : "profiles";
  });

  useEffect(() => {
    if (embedMode) return;
    if (tabParam === "permissions") setActiveTab("permissions");
    else if (tabParam === "profiles") setActiveTab("profiles");
  }, [tabParam, embedMode]);

  const switchTab = (tab: "profiles" | "permissions") => {
    if (embedMode) return;
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("Sibling");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Granular Access states
  const [canLogin, setCanLogin] = useState(true);
  const [loginRole, setLoginRole] = useState<FamilyMemberAccess["loginRole"]>("Vehicle_Manager");
  const [canAccessVehicles, setCanAccessVehicles] = useState(true);
  const [assignedVehicleScope, setAssignedVehicleScope] = useState<"all" | "specific">("specific");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [canWriteFuel, setCanWriteFuel] = useState(true);
  const [canWriteMaintenance, setCanWriteMaintenance] = useState(true);
  const [canWriteDocuments, setCanWriteDocuments] = useState(false);
  const [canAccessVault, setCanAccessVault] = useState(false);
  const [canAccessProperties, setCanAccessProperties] = useState(false);
  const [canAccessWarranties, setCanAccessWarranties] = useState(true);

  // Invite modal states
  const [inviteMember, setInviteMember] = useState<FamilyMember | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const getInviteText = (m: FamilyMember) => {
    const roleName = (m.access?.loginRole || "Vehicle_Manager").replace("_", " ");
    const origin =
      typeof window !== "undefined" &&
      !window.location.origin.includes("localhost") &&
      !window.location.origin.includes("capacitor")
        ? window.location.origin
        : "https://likherakho.vercel.app";
    return `Hi ${m.fullName},\n\nYou have been invited to join our family workspace on Likhe Rakho (${roleName})!\n\n🔑 How to sign in:\n1. Open Likhe Rakho: ${origin}\n2. If it's your first time, click "Sign Up" (Create Free Account).\n3. Enter your email: ${m.email} and set your own password.\n4. You will automatically have access to our family vehicles and records!\n\nNeed help? Let me know!`;
  };

  const handleCopyInvite = (m: FamilyMember) => {
    navigator.clipboard.writeText(getInviteText(m));
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const shareInviteWhatsApp = (m: FamilyMember) => {
    const cleanPhone = (m.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `88${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(getInviteText(m));
    const url = cleanPhone ? `https://wa.me/${formattedPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mems, vehs] = await Promise.all([
        listFamilyMembers(),
        listVehicles().catch(() => []),
      ]);
      setMembers(mems);
      setVehicles(vehs);
      if (vehs.length > 0 && selectedVehicleIds.length === 0) {
        setSelectedVehicleIds([vehs[0].id]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load family records.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFullName("");
    setRelationship("Sibling");
    setPhone("");
    setEmail("");
    setDateOfBirth("");
    setAddress("");
    setNotes("");
    setCanLogin(true);
    setLoginRole("Vehicle_Manager");
    setCanAccessVehicles(true);
    setAssignedVehicleScope("specific");
    setSelectedVehicleIds(vehicles.length > 0 ? [vehicles[0].id] : []);
    setCanWriteFuel(true);
    setCanWriteMaintenance(true);
    setCanWriteDocuments(false);
    setCanAccessVault(false);
    setCanAccessProperties(false);
    setCanAccessWarranties(true);
    setIsModalOpen(true);
  };

  const openEditModal = (m: FamilyMember) => {
    setEditingMember(m);
    setFullName(m.fullName);
    setRelationship(m.relationship);
    setPhone(m.phone || "");
    setEmail(m.email || "");
    setDateOfBirth(m.dateOfBirth || "");
    setAddress(m.address || "");
    setNotes(m.notes || "");

    const acc = m.access || getDefaultMemberAccess();
    setCanLogin(acc.canLogin);
    setLoginRole(acc.loginRole);
    setCanAccessVehicles(acc.canAccessVehicles);
    setAssignedVehicleScope(acc.assignedVehicleIds.length === 0 ? "all" : "specific");
    setSelectedVehicleIds(acc.assignedVehicleIds.length === 0 ? (vehicles.map((v) => v.id)) : acc.assignedVehicleIds);
    setCanWriteFuel(acc.canWriteFuel);
    setCanWriteMaintenance(acc.canWriteMaintenance);
    setCanWriteDocuments(acc.canWriteDocuments);
    setCanAccessVault(acc.canAccessVault);
    setCanAccessProperties(acc.canAccessProperties);
    setCanAccessWarranties(acc.canAccessWarranties);

    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please specify family member's full name.");
      return;
    }

    setSaving(true);
    setError("");

    const accessData: FamilyMemberAccess = {
      ...(editingMember?.access || getDefaultMemberAccess(loginRole)),
      canLogin,
      loginRole,
      canAccessVehicles,
      assignedVehicleIds: assignedVehicleScope === "all" ? [] : selectedVehicleIds,
      canWriteFuel,
      canWriteMaintenance,
      canWriteDocuments,
      canAccessVault,
      canAccessProperties,
      canAccessWarranties,
    };

    try {
      if (editingMember) {
        const updated = await updateFamilyMember(editingMember.id, {
          fullName: fullName.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth || undefined,
          address: address.trim(),
          notes: notes.trim(),
          access: accessData,
        });
        setMembers((cur) => cur.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await createFamilyMember({
          fullName: fullName.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth || undefined,
          address: address.trim(),
          nationality: "Bangladeshi",
          identificationInfo: "",
          notes: notes.trim(),
          access: accessData,
        });
        setMembers((cur) => [...cur, created]);
      }
      setIsModalOpen(false);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save family member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}'s family profile and login access?`)) return;
    try {
      await deleteFamilyMember(id);
      setMembers((cur) => cur.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete member.");
    }
  };

  const toggleVehicleSelection = (vehId: string) => {
    setSelectedVehicleIds((cur) =>
      cur.includes(vehId) ? cur.filter((id) => id !== vehId) : [...cur, vehId],
    );
  };

  return (
    <div className="space-y-4 w-full">
      {!embedMode ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                Family Members
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Add your spouse, children, and parents, and choose what they can view.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeTab === "profiles" && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-95 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Tab Navigation */}
          <div className="border-b border-slate-200/80">
            <div className="flex gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchTab("profiles")}
                className={`inline-flex items-center gap-2 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
                  activeTab === "profiles"
                    ? "border-rose-600 text-rose-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Family Members</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200">
                  {members.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("permissions")}
                className={`inline-flex items-center gap-2 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
                  activeTab === "permissions"
                    ? "border-orange-600 text-orange-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>Permissions & Access</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Family Members & Profiles</h2>
            <p className="text-xs text-slate-500">
              Manage family directory profiles, contact details, and vehicle access.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Family Member</span>
          </button>
        </div>
      )}

      {/* Permissions Tab Content (Embedded Seamlessly) */}
      {activeTab === "permissions" && (
        <div className="pt-1">
          <AccessControlPage embedMode />
        </div>
      )}

      {/* Profiles Tab Content */}
      {activeTab === "profiles" && (
        <div className="space-y-4">

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}


      {/* Family Directory Grid */}
      {loading ? (
        <BrandLogoLoader
          message="Loading Family & Profiles..."
          subtitle="Syncing access permissions and member ledgers"
        />
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Users className="h-9 w-9 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Family Members Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Add members like your brother, spouse, or son to give them restricted access so they can log fuel purchases and maintenance for your family vehicles without seeing confidential records.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add First Family Member
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const acc = member.access || getDefaultMemberAccess();
            const assignedVehs =
              acc.assignedVehicleIds.length === 0
                ? vehicles
                : vehicles.filter((v) => acc.assignedVehicleIds.includes(v.id));

            return (
              <div
                key={member.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Avatar & Relationship */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-[#064e3b] text-sm font-bold text-white shadow-2xs">
                        {member.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {member.fullName}
                        </h3>
                        <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 mt-0.5">
                          {member.relationship}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        className="rounded p-1 text-slate-400 hover:text-slate-800 transition"
                        title="Edit Permissions"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id, member.fullName)}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-[11px]">{member.phone}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-[11px] text-slate-700">{member.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Access & Vehicle Permissions Badge */}
                  <div className="mt-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-emerald-600" /> System Role:
                      </span>
                      <span
                        className={`font-semibold rounded px-1.5 py-0.2 text-[10px] ${
                          acc.loginRole === "Admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {acc.loginRole.replace("_", " ")}
                      </span>
                    </div>

                    {/* Assigned Vehicles */}
                    <div className="text-[11px]">
                      <div className="text-slate-500 font-medium flex items-center gap-1 mb-1">
                        <Car className="h-3 w-3 text-slate-400" /> Assigned Vehicle Scope:
                      </div>
                      {acc.canAccessVehicles ? (
                        <div className="flex flex-wrap gap-1">
                          {acc.assignedVehicleIds.length === 0 ? (
                            <span className="rounded bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              All Fleet Vehicles
                            </span>
                          ) : assignedVehs.length > 0 ? (
                            assignedVehs.map((v) => (
                              <span
                                key={v.id}
                                className="rounded bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                              >
                                {v.name} ({v.brand} {v.model})
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">Specific vehicle deleted</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No vehicle access</span>
                      )}
                    </div>

                    {/* Permissions list */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap gap-1 text-[10px] font-medium text-slate-600">
                      {acc.canWriteFuel && (
                        <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 flex items-center gap-0.5">
                          <Fuel className="h-2.5 w-2.5 text-blue-500" /> Fuel Writer
                        </span>
                      )}
                      {acc.canWriteMaintenance && (
                        <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 flex items-center gap-0.5">
                          <Wrench className="h-2.5 w-2.5 text-emerald-500" /> Maintenance
                        </span>
                      )}
                      {!acc.canAccessVault && (
                        <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 text-slate-400">
                          Vault Restricted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {acc.canLogin ? "Login enabled" : "Profile only"}
                    </span>
                    {acc.canLogin && member.email && (
                      <button
                        type="button"
                        onClick={() => setInviteMember(member)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold transition cursor-pointer"
                        title="View password & invitation instructions"
                      >
                        <Share2 className="h-2.5 w-2.5" />
                        <span>Send Invite</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    Configure Access &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT FAMILY MEMBER WITH SPECIFIC VEHICLE ACCESS             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                {editingMember ? `Edit ${editingMember.fullName}` : "Add Family Member"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              {/* Member Details */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Khan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      {RELATIONSHIPS.map((rel) => (
                        <MenuItem key={rel} value={rel} sx={{ fontSize: "0.75rem" }}>
                          {rel}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email (for restricted login)
                  </label>
                  <input
                    type="email"
                    placeholder="tanvir@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Granular Access Control Section */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Access Control & Section Visibility
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-700 font-semibold">Enable Login:</span>
                    <input
                      type="checkbox"
                      checked={canLogin}
                      onChange={(e) => setCanLogin(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                  </label>
                </div>

                {canLogin && (
                  <div className="space-y-3">
                    {/* Information about setting password & sign in */}
                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3 text-[11px] text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                        <KeyRound className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>How will this member get their password?</span>
                      </div>
                      <p className="text-emerald-800/90 leading-relaxed">
                        1. The member uses their email: <strong>{email || "(enter email above)"}</strong>.
                      </p>
                      <p className="text-emerald-800/90 leading-relaxed">
                        2. On their first visit, they simply click <strong>"Sign Up"</strong> on the login screen using this exact email and choose their password.
                      </p>
                      <p className="text-emerald-800/90 leading-relaxed">
                        3. You can click <strong>"Send Invite"</strong> on their profile card anytime to share a pre-formatted invite link via WhatsApp or copy instructions!
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Assigned Role
                      </label>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={loginRole}
                          onChange={(e) => {
                            const r = e.target.value as FamilyMemberAccess["loginRole"];
                            setLoginRole(r);
                            if (r === "Vehicle_Manager") {
                              setCanAccessVehicles(true);
                              setCanWriteFuel(true);
                              setCanWriteMaintenance(true);
                              setCanAccessVault(false);
                              setCanAccessProperties(false);
                            } else if (r === "Admin") {
                              setCanAccessVehicles(true);
                              setCanWriteFuel(true);
                              setCanWriteMaintenance(true);
                              setCanAccessVault(true);
                              setCanAccessProperties(true);
                            }
                          }}
                          sx={{
                            fontSize: "0.75rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            borderRadius: "0.75rem",
                            backgroundColor: "#ffffff",
                            "& .MuiSelect-select": { py: "8px" },
                          }}
                        >
                          <MenuItem value="Vehicle_Manager" sx={{ fontSize: "0.75rem" }}>
                            🚗 Vehicle Manager (Can view assigned cars & log fuel/maintenance)
                          </MenuItem>
                          <MenuItem value="Viewer" sx={{ fontSize: "0.75rem" }}>
                            👁️ Viewer (Read-only access to assigned assets)
                          </MenuItem>
                          <MenuItem value="Admin" sx={{ fontSize: "0.75rem" }}>
                            👑 Administrator (Full access to all modules)
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </div>

                    {/* Specific Vehicle Assignment */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <label className="block text-xs font-bold text-slate-900">
                        🚗 Assigned Vehicles (Which car/bike can this member manage?)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Select specific vehicles so this member will only see and write details for those vehicles:
                      </p>

                      <div className="flex gap-4 text-xs font-medium pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={assignedVehicleScope === "specific"}
                            onChange={() => setAssignedVehicleScope("specific")}
                          />
                          Specific Vehicles
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="scope"
                            checked={assignedVehicleScope === "all"}
                            onChange={() => setAssignedVehicleScope("all")}
                          />
                          All Fleet Vehicles
                        </label>
                      </div>

                      {assignedVehicleScope === "specific" && (
                        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                          {vehicles.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">
                              No vehicles added yet. Add a vehicle first to assign.
                            </div>
                          ) : (
                            vehicles.map((v) => {
                              const isChecked = selectedVehicleIds.includes(v.id);
                              return (
                                <label
                                  key={v.id}
                                  className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 cursor-pointer border border-slate-100"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-slate-900">
                                      {v.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {v.brand} {v.model} · {v.registrationNumber || "Unregistered"} · {v.type}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleVehicleSelection(v.id)}
                                    className="h-4 w-4 rounded text-emerald-600"
                                  />
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Permissions */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canWriteFuel}
                          onChange={(e) => setCanWriteFuel(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">Can Record Fuel</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canWriteMaintenance}
                          onChange={(e) => setCanWriteMaintenance(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">Can Log Maintenance</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canWriteDocuments}
                          onChange={(e) => setCanWriteDocuments(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">Upload BRTA Docs</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canAccessWarranties}
                          onChange={(e) => setCanAccessWarranties(e.target.checked)}
                          className="h-4 w-4 rounded text-emerald-600"
                        />
                        <span className="font-semibold text-slate-800">View Warranties</span>
                      </label>
                    </div>

                    {/* Section Restrictions */}
                    <div className="border-t border-emerald-100 pt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Confidential Vault & Rental sections:</span>
                      <span className="font-bold text-slate-700">
                        {canAccessVault ? "Visible" : "Hidden (Restricted)"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : editingMember ? "Update Permissions" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SHARE LOGIN INVITATION & PASSWORD SETUP INSTRUCTIONS              */}
      {/* ========================================================================= */}
      {inviteMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setInviteMember(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Send Login Invite to {inviteMember.fullName}
              </h2>
              <button
                type="button"
                onClick={() => setInviteMember(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-semibold text-slate-900">{inviteMember.fullName} ({inviteMember.relationship})</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Authorized Email:</span>
                  <span className="font-mono font-semibold text-emerald-700">{inviteMember.email}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">System Role:</span>
                  <span className="font-semibold text-purple-700">{inviteMember.access?.loginRole?.replace("_", " ") || "Vehicle Manager"}</span>
                </div>
                {inviteMember.phone && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-800">{inviteMember.phone}</span>
                  </div>
                )}
              </div>

              {/* Password Explanation */}
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-900 space-y-1 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <KeyRound className="h-3.5 w-3.5 text-amber-700" />
                  <span>How will {inviteMember.fullName} get their password?</span>
                </div>
                <p>
                  1. Likhe Rakho uses self-serve password setup. Send them the invitation below.
                </p>
                <p>
                  2. They open the Likhe Rakho link, click <strong>"Sign Up"</strong>, enter <strong>{inviteMember.email}</strong>, and choose their own password.
                </p>
                <p>
                  3. If an account is already created, they simply log in with their password (or click "Forgot Password").
                </p>
              </div>

              {/* Ready-to-send Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invitation Message (Ready to send)
                </label>
                <textarea
                  readOnly
                  rows={6}
                  value={getInviteText(inviteMember)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-mono text-slate-800 outline-none select-all"
                />
              </div>

              {copiedInvite && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Invitation text copied to clipboard!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setInviteMember(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyInvite(inviteMember)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedInvite ? "Copied!" : "Copy Text"}
                </button>
                <button
                  type="button"
                  onClick={() => shareInviteWhatsApp(inviteMember)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
