import { useEffect, useState } from "react";
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
  ExternalLink,
  X,
  KeyRound,
  Database,
} from "lucide-react";
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

export function FamilyPage() {
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

  // Invite & Sharing modal states
  const [inviteMember, setInviteMember] = useState<FamilyMember | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showRlsHelper, setShowRlsHelper] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);

  const getInviteText = (m: FamilyMember) => {
    const roleName = (m.access?.loginRole || "Vehicle_Manager").replace("_", " ");
    const origin = window.location.origin;
    return `Hi ${m.fullName},\n\nYou have been invited to join our family workspace on LifeNest (${roleName})!\n\n🔑 How to sign in:\n1. Open LifeNest: ${origin}\n2. If it's your first time, click "Create your LifeNest account" (Sign Up).\n3. Enter your email: ${m.email} and set your own password.\n4. You will automatically have access to our family vehicles and records!\n\nNeed help? Let me know!`;
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
              Workspace • Family
            </span>
            <span className="text-xs text-slate-400 font-mono">ACCESS CONTROL</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
            Family Profiles & Member Permissions
          </h1>
          <p className="text-xs text-slate-500">
            Add multiple family members, grant restricted logins, and assign specific vehicle management (e.g. brother maintaining a specific car).
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Add Family Member
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Shared Family Fleet Access Setup Alert */}
      <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-indigo-50/90 p-3.5 text-xs text-indigo-950 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-700 shrink-0 mt-0.5">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>Multi-User Family Sharing & Database Access</span>
                <span className="rounded-full bg-indigo-200/80 px-2 py-0.2 text-[10px] font-semibold text-indigo-900">
                  Shared Fleet
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-indigo-800/80 leading-relaxed">
                When invited family members sign in, Supabase Row-Level Security (RLS) requires the family access policy so they can see your shared vehicles and records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRlsHelper(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/80 bg-white hover:bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-900 shadow-2xs transition cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 text-indigo-600" />
            <span>Enable Database Sharing</span>
          </button>
        </div>
      </div>

      {/* Family Directory Grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-2xs">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 mb-3" />
          <p className="text-xs">Loading family profiles & permissions...</p>
        </div>
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-2xs">
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
                        <Shield className="h-3 w-3 text-indigo-600" /> System Role:
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
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Configure Access &rarr;
                  </button>
                </div>
              </div>
            );
          })}
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
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Member Access
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-FAMILY</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  {editingMember ? `Edit ${editingMember.fullName}` : "Add Family Member & Access"}
                </h2>
              </div>
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
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
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
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    Access Control & Section Visibility
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-slate-700 font-semibold">Enable Login:</span>
                    <input
                      type="checkbox"
                      checked={canLogin}
                      onChange={(e) => setCanLogin(e.target.checked)}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                  </label>
                </div>

                {canLogin && (
                  <div className="space-y-3">
                    {/* Information about setting password & sign in */}
                    <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 p-3 text-[11px] text-indigo-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                        <KeyRound className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>How will this member get their password?</span>
                      </div>
                      <p className="text-indigo-800/90 leading-relaxed">
                        1. The member uses their email: <strong>{email || "(enter email above)"}</strong>.
                      </p>
                      <p className="text-indigo-800/90 leading-relaxed">
                        2. On their first visit, they simply click <strong>"Create your LifeNest account"</strong> (Sign up) on the login screen using this exact email and choose their password.
                      </p>
                      <p className="text-indigo-800/90 leading-relaxed">
                        3. You can click <strong>"Send Invite"</strong> on their profile card anytime to share a pre-formatted invite link via WhatsApp or copy instructions!
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Assigned Role
                      </label>
                      <select
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
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      >
                        <option value="Vehicle_Manager">
                          🚗 Vehicle Manager (Can view assigned cars & log fuel/maintenance)
                        </option>
                        <option value="Viewer">
                          👁️ Viewer (Read-only access to assigned assets)
                        </option>
                        <option value="Admin">
                          👑 Administrator (Full access to all modules)
                        </option>
                      </select>
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
                                    className="h-4 w-4 rounded text-indigo-600"
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
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">Can Record Fuel</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canWriteMaintenance}
                          onChange={(e) => setCanWriteMaintenance(e.target.checked)}
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">Can Log Maintenance</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canWriteDocuments}
                          onChange={(e) => setCanWriteDocuments(e.target.checked)}
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">Upload BRTA Docs</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canAccessWarranties}
                          onChange={(e) => setCanAccessWarranties(e.target.checked)}
                          className="h-4 w-4 rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-800">View Warranties</span>
                      </label>
                    </div>

                    {/* Section Restrictions */}
                    <div className="border-t border-indigo-100 pt-2 text-[11px] text-slate-500 flex items-center justify-between">
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
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Login Access
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-INVITE</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Send Login Invite to {inviteMember.fullName}
                </h2>
              </div>
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
                  <span className="font-mono font-semibold text-indigo-700">{inviteMember.email}</span>
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
                  1. LifeNest uses self-serve password setup. Send them the invitation below.
                </p>
                <p>
                  2. They open the LifeNest link, click <strong>"Create your LifeNest account"</strong> (Sign up), enter <strong>{inviteMember.email}</strong>, and choose their own password.
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

      {/* ========================================================================= */}
      {/* MODAL: DATABASE MULTI-USER ACCESS & RLS HELPER                            */}
      {/* ========================================================================= */}
      {showRlsHelper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setShowRlsHelper(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900">
                    Enable Database Sharing for Family Members
                  </h2>
                  <p className="text-xs text-slate-500">1-Minute Supabase SQL Setup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRlsHelper(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                By default, Supabase isolates every user so they only see rows they created (<code>auth.uid() = owner_id</code>). To allow invited family members (like <strong>Etisha Habib</strong>) to view your vehicles and records when they log in with their own account, run this SQL script in your Supabase SQL Editor.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <div className="font-bold text-slate-800">Quick 2-Step Instructions:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>
                    Open your Supabase SQL Editor:{" "}
                    <a
                      href="https://supabase.com/dashboard/project/rbrseemfyiqcdezxhssx/sql"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      <span>Supabase SQL Dashboard</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </li>
                  <li>Click <strong>New Query</strong>, paste the script below, and click <strong>Run</strong>.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    SQL Script (family_access_rls.sql)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`create or replace function public.get_accessible_owner_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select auth.uid()
  union
  select owner_id
  from public.lifenest_family_members
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     or (phone <> '' and phone = coalesce(auth.jwt() ->> 'phone', ''));
$$;

grant execute on function public.get_accessible_owner_ids() to authenticated;

drop policy if exists "lifenest_vehicles_policy" on public.lifenest_vehicles;
create policy "lifenest_vehicles_policy"
  on public.lifenest_vehicles for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_vehicle_expenses_policy" on public.lifenest_vehicle_expenses;
create policy "lifenest_vehicle_expenses_policy"
  on public.lifenest_vehicle_expenses for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_vehicle_services_policy" on public.lifenest_vehicle_services;
create policy "lifenest_vehicle_services_policy"
  on public.lifenest_vehicle_services for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_family_members_policy" on public.lifenest_family_members;
create policy "lifenest_family_members_policy"
  on public.lifenest_family_members for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_documents_policy" on public.lifenest_documents;
create policy "lifenest_documents_policy"
  on public.lifenest_documents for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_tasks_policy" on public.lifenest_tasks;
create policy "lifenest_tasks_policy"
  on public.lifenest_tasks for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));`);
                      setCopiedRls(true);
                      setTimeout(() => setCopiedRls(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-semibold cursor-pointer transition"
                  >
                    {copiedRls ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedRls ? "Copied!" : "Copy SQL Script"}</span>
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-slate-200">
                  <pre className="whitespace-pre-wrap">{`create or replace function public.get_accessible_owner_ids()
returns setof uuid language sql security definer stable as $$
  select auth.uid() union
  select owner_id from public.lifenest_family_members
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     or (phone <> '' and phone = coalesce(auth.jwt() ->> 'phone', ''));
$$;
grant execute on function public.get_accessible_owner_ids() to authenticated;

-- Policies for vehicles, expenses, services, family & docs
create policy "lifenest_vehicles_policy" on public.lifenest_vehicles
  for all to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()));`}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowRlsHelper(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
