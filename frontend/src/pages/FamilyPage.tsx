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
                  <span className="text-[10px] text-slate-400">
                    {acc.canLogin ? "Login enabled" : "Profile only"}
                  </span>
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
    </div>
  );
}
