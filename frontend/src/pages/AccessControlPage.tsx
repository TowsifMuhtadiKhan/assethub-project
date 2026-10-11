import { useEffect, useState, useMemo } from "react";
import {
  Car,
  Building2,
  Users,
  Search,
  Check,
  X,
  Fuel,
  Wrench,
  FileText,
  DollarSign,
  Share2,
  Copy,
  AlertCircle,
  KeyRound,
  Info,
} from "lucide-react";
import {
  listFamilyMembers,
  updateFamilyMember,
  getDefaultMemberAccess,
} from "../services/familyService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import type {
  FamilyMember,
  FamilyMemberAccess,
  Vehicle,
  Property,
} from "../types";

export function AccessControlPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tabs: 'vehicles' | 'properties' | 'members'
  const [activeTab, setActiveTab] = useState<"vehicles" | "properties" | "members">("vehicles");
  const [searchQuery, setSearchQuery] = useState("");

  // Invite modal states
  const [inviteMember, setInviteMember] = useState<FamilyMember | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [mems, vehs, props] = await Promise.all([
        listFamilyMembers(),
        listVehicles().catch(() => []),
        listProperties().catch(() => []),
      ]);
      setMembers(mems);
      setVehicles(vehs);
      setProperties(props);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access control data.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Helper to test if a member has access to a specific vehicle
  const memberHasVehicleAccess = (member: FamilyMember, vehicleId: string) => {
    const acc = member.access;
    if (!acc || !acc.canAccessVehicles) return false;
    // empty assignedVehicleIds means all vehicles
    if (!acc.assignedVehicleIds || acc.assignedVehicleIds.length === 0) return true;
    return acc.assignedVehicleIds.includes(vehicleId);
  };

  // Helper to test if a member has access to a specific property
  const memberHasPropertyAccess = (member: FamilyMember, propertyId: string) => {
    const acc = member.access;
    if (!acc || !acc.canAccessProperties) return false;
    // empty or undefined assignedPropertyIds means all properties
    if (!acc.assignedPropertyIds || acc.assignedPropertyIds.length === 0) return true;
    return acc.assignedPropertyIds.includes(propertyId);
  };

  // Toggle vehicle access for a specific member
  const toggleVehicleAccess = async (member: FamilyMember, vehicleId: string, grant: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let newAssigned: string[];
    const allVehicleIds = vehicles.map((v) => v.id);

    if (grant) {
      if (!currentAcc.canAccessVehicles) {
        currentAcc.canAccessVehicles = true;
      }
      if (!currentAcc.assignedVehicleIds || currentAcc.assignedVehicleIds.length === 0) {
        newAssigned = []; // already has all
      } else {
        newAssigned = Array.from(new Set([...currentAcc.assignedVehicleIds, vehicleId]));
        // If now includes all vehicles, we can keep full scope
        if (newAssigned.length === allVehicleIds.length) {
          newAssigned = [];
        }
      }
    } else {
      // Revoking access to vehicleId
      if (!currentAcc.assignedVehicleIds || currentAcc.assignedVehicleIds.length === 0) {
        // Was 'all', so now restrict to all EXCEPT this one
        newAssigned = allVehicleIds.filter((id) => id !== vehicleId);
      } else {
        newAssigned = currentAcc.assignedVehicleIds.filter((id) => id !== vehicleId);
      }
      if (newAssigned.length === 0 && allVehicleIds.length > 0) {
        currentAcc.canAccessVehicles = false;
      }
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVehicleIds: newAssigned,
    };

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated vehicle access for ${member.fullName}`);
    } catch (e) {
      console.error(e);
      showToast(`Failed to save access change`);
    } finally {
      setSavingId(null);
    }
  };

  // Toggle specific vehicle action permission for a member (Fuel, Maintenance, Documents)
  const toggleMemberVehicleAction = async (
    member: FamilyMember,
    field: "canWriteFuel" | "canWriteMaintenance" | "canWriteDocuments"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      [field]: !currentAcc[field],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated permission for ${member.fullName}`);
    } catch {
      showToast(`Failed to update permission`);
    } finally {
      setSavingId(null);
    }
  };

  // Toggle property access for a specific member
  const togglePropertyAccess = async (member: FamilyMember, propertyId: string, grant: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let newAssigned: string[];
    const allPropertyIds = properties.map((p) => p.id);

    if (grant) {
      if (!currentAcc.canAccessProperties) {
        currentAcc.canAccessProperties = true;
      }
      if (!currentAcc.assignedPropertyIds || currentAcc.assignedPropertyIds.length === 0) {
        newAssigned = []; // already has all
      } else {
        newAssigned = Array.from(new Set([...currentAcc.assignedPropertyIds, propertyId]));
        if (newAssigned.length === allPropertyIds.length) {
          newAssigned = [];
        }
      }
    } else {
      if (!currentAcc.assignedPropertyIds || currentAcc.assignedPropertyIds.length === 0) {
        newAssigned = allPropertyIds.filter((id) => id !== propertyId);
      } else {
        newAssigned = currentAcc.assignedPropertyIds.filter((id) => id !== propertyId);
      }
      if (newAssigned.length === 0 && allPropertyIds.length > 0) {
        currentAcc.canAccessProperties = false;
      }
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedPropertyIds: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated property access for ${member.fullName}`);
    } catch (e) {
      console.error(e);
      showToast(`Failed to save access change`);
    } finally {
      setSavingId(null);
    }
  };

  // Toggle specific property action permission for a member
  const toggleMemberPropertyAction = async (
    member: FamilyMember,
    field: "canWriteRent" | "canWritePropertyMaintenance" | "canAccessProperties"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      [field]: !currentAcc[field],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated permission for ${member.fullName}`);
    } catch {
      showToast(`Failed to update permission`);
    } finally {
      setSavingId(null);
    }
  };

  // Quick grant all or restrict all members for a single vehicle
  const batchVehicleAccess = async (vehicleId: string, grantToAll: boolean) => {
    for (const member of members) {
      await toggleVehicleAccess(member, vehicleId, grantToAll);
    }
    showToast(grantToAll ? "Granted access to all members" : "Restricted all members");
  };

  // Quick grant all or restrict all members for a single property
  const batchPropertyAccess = async (propertyId: string, grantToAll: boolean) => {
    for (const member of members) {
      await togglePropertyAccess(member, propertyId, grantToAll);
    }
    showToast(grantToAll ? "Granted access to all members" : "Restricted all members");
  };

  // Change member role
  const handleRoleChange = async (member: FamilyMember, newRole: FamilyMemberAccess["loginRole"]) => {
    const base = getDefaultMemberAccess(newRole);
    const updatedAccess: FamilyMemberAccess = {
      ...base,
      assignedVehicleIds: member.access?.assignedVehicleIds || [],
      assignedPropertyIds: member.access?.assignedPropertyIds || [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Role updated to ${newRole.replace("_", " ")} for ${member.fullName}`);
    } catch {
      showToast(`Failed to update role`);
    } finally {
      setSavingId(null);
    }
  };

  // Invite text generator
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

  // Filtered lists
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.registrationNumber.toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }, [properties, searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        m.relationship.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Access Control & Permissions
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Manage granular asset-level access for family members across vehicles and real estate
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3.5 py-2">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Family Members</div>
            <div className="text-base font-bold text-white">{members.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3.5 py-2">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Vehicles</div>
            <div className="text-base font-bold text-orange-400">{vehicles.length}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 px-3.5 py-2">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Properties</div>
            <div className="text-base font-bold text-indigo-400">{properties.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-slate-800/70 rounded-xl border border-slate-700/60 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("vehicles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "vehicles"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Car className="h-4 w-4" />
            <span>Vehicle-Wise Access ({vehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "properties"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Property-Wise Access ({properties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "members"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Member Roles & Matrix</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "vehicles"
                ? "Search vehicles..."
                : activeTab === "properties"
                ? "Search properties..."
                : "Search family members..."
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center text-slate-400 border border-slate-800 rounded-2xl bg-slate-800/20">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-2" />
          <p className="text-xs">Loading permission matrices...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-800/60 bg-red-950/40 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: VEHICLE-WISE ACCESS VIEW                                          */}
      {/* ========================================================================= */}
      {!loading && activeTab === "vehicles" && (
        <div className="space-y-6">
          {filteredVehicles.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-800/30">
              <Car className="h-10 w-10 text-slate-500 mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-white">No vehicles found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Add vehicles in the Vehicles section first to manage permissions.
              </p>
            </div>
          ) : (
            filteredVehicles.map((v) => {
              const authorizedCount = members.filter((m) =>
                memberHasVehicleAccess(m, v.id)
              ).length;

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-800 bg-slate-850/80 overflow-hidden shadow-lg"
                >
                  {/* Vehicle Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Vehicle Thumbnail / Plate */}
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                            <Car className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="text-base font-bold text-white flex items-center gap-2">
                              {v.name}
                              <span className="text-xs font-normal text-slate-400">
                                {v.brand} {v.model} ({v.year})
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {v.registrationNumber || "No Reg Number"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Batch Actions & Count */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                        {authorizedCount} of {members.length} Members Authorized
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => batchVehicleAccess(v.id, true)}
                          title="Grant access to all family members for this vehicle"
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                        >
                          Grant All
                        </button>
                        <button
                          type="button"
                          onClick={() => batchVehicleAccess(v.id, false)}
                          title="Restrict all family members from this vehicle"
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium transition cursor-pointer"
                        >
                          Restrict All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Members Permissions Table for this Vehicle */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/80">
                        <tr>
                          <th className="py-3 px-4 sm:px-6">Family Member</th>
                          <th className="py-3 px-4">Access Status</th>
                          <th className="py-3 px-4">Fuel Logging</th>
                          <th className="py-3 px-4">Maintenance</th>
                          <th className="py-3 px-4">Vehicle Docs</th>
                          <th className="py-3 px-4 text-right pr-6">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {members.map((member) => {
                          const hasAccess = memberHasVehicleAccess(member, v.id);
                          const acc = member.access || getDefaultMemberAccess();
                          const isSaving = savingId === member.id;

                          return (
                            <tr
                              key={member.id}
                              className={`transition-colors ${
                                hasAccess
                                  ? "bg-transparent hover:bg-slate-800/30"
                                  : "bg-slate-900/40 text-slate-500 hover:bg-slate-900/60"
                              }`}
                            >
                              {/* Member Identity */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                                      hasAccess
                                        ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                                        : "bg-slate-800 border-slate-700 text-slate-500"
                                    }`}
                                  >
                                    {member.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <div
                                      className={`font-semibold ${
                                        hasAccess ? "text-white" : "text-slate-400"
                                      }`}
                                    >
                                      {member.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                      <span>{member.relationship}</span>
                                      <span>•</span>
                                      <span className="font-mono">{member.email || member.phone || "No login yet"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Access Toggle */}
                              <td className="py-3.5 px-4">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasAccess}
                                    onChange={(e) =>
                                      toggleVehicleAccess(member, v.id, e.target.checked)
                                    }
                                    disabled={isSaving}
                                    className="sr-only peer"
                                  />
                                  <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                  <span
                                    className={`ms-2 text-xs font-semibold ${
                                      hasAccess ? "text-emerald-400" : "text-slate-500"
                                    }`}
                                  >
                                    {hasAccess ? "Authorized" : "Blocked"}
                                  </span>
                                </label>
                              </td>

                              {/* Action Permission 1: Fuel */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  disabled={!hasAccess || isSaving}
                                  onClick={() => toggleMemberVehicleAction(member, "canWriteFuel")}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    !hasAccess
                                      ? "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800/40"
                                      : acc.canWriteFuel
                                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                                  }`}
                                >
                                  <Fuel className="h-3.5 w-3.5" />
                                  <span>{acc.canWriteFuel ? "Can Log Fuel" : "View Only"}</span>
                                </button>
                              </td>

                              {/* Action Permission 2: Maintenance */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  disabled={!hasAccess || isSaving}
                                  onClick={() =>
                                    toggleMemberVehicleAction(member, "canWriteMaintenance")
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    !hasAccess
                                      ? "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800/40"
                                      : acc.canWriteMaintenance
                                      ? "bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25"
                                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                                  }`}
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                  <span>{acc.canWriteMaintenance ? "Can Log Service" : "View Only"}</span>
                                </button>
                              </td>

                              {/* Action Permission 3: Documents */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  disabled={!hasAccess || isSaving}
                                  onClick={() =>
                                    toggleMemberVehicleAction(member, "canWriteDocuments")
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    !hasAccess
                                      ? "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800/40"
                                      : acc.canWriteDocuments
                                      ? "bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25"
                                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>{acc.canWriteDocuments ? "Can Upload" : "View Only"}</span>
                                </button>
                              </td>

                              {/* Quick Invite / Share Link */}
                              <td className="py-3.5 px-4 text-right pr-6">
                                <button
                                  type="button"
                                  onClick={() => setInviteMember(member)}
                                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                                  title="Send invite and credentials to this member"
                                >
                                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-[11px]">Invite</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROPERTY-WISE ACCESS VIEW                                         */}
      {/* ========================================================================= */}
      {!loading && activeTab === "properties" && (
        <div className="space-y-6">
          {filteredProperties.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-800/30">
              <Building2 className="h-10 w-10 text-slate-500 mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-white">No properties found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Add properties in the Real Estate section first to manage permissions.
              </p>
            </div>
          ) : (
            filteredProperties.map((p) => {
              const authorizedCount = members.filter((m) =>
                memberHasPropertyAccess(m, p.id)
              ).length;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-800 bg-slate-850/80 overflow-hidden shadow-lg"
                >
                  {/* Property Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-base font-bold text-white flex items-center gap-2">
                          {p.name}
                          <span className="text-xs font-normal text-slate-400">
                            ({p.type || "Real Estate"})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {p.location} • {p.unitsCount} Units
                        </div>
                      </div>
                    </div>

                    {/* Batch Actions & Count */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                        {authorizedCount} of {members.length} Members Authorized
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => batchPropertyAccess(p.id, true)}
                          title="Grant access to all family members for this property"
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                        >
                          Grant All
                        </button>
                        <button
                          type="button"
                          onClick={() => batchPropertyAccess(p.id, false)}
                          title="Restrict all family members from this property"
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium transition cursor-pointer"
                        >
                          Restrict All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Members Permissions Table for this Property */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/80">
                        <tr>
                          <th className="py-3 px-4 sm:px-6">Family Member</th>
                          <th className="py-3 px-4">Access Status</th>
                          <th className="py-3 px-4">Rent Collection</th>
                          <th className="py-3 px-4">Maintenance & Expense</th>
                          <th className="py-3 px-4 text-right pr-6">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {members.map((member) => {
                          const hasAccess = memberHasPropertyAccess(member, p.id);
                          const acc = member.access || getDefaultMemberAccess();
                          const isSaving = savingId === member.id;

                          return (
                            <tr
                              key={member.id}
                              className={`transition-colors ${
                                hasAccess
                                  ? "bg-transparent hover:bg-slate-800/30"
                                  : "bg-slate-900/40 text-slate-500 hover:bg-slate-900/60"
                              }`}
                            >
                              {/* Member Identity */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                                      hasAccess
                                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                                        : "bg-slate-800 border-slate-700 text-slate-500"
                                    }`}
                                  >
                                    {member.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <div
                                      className={`font-semibold ${
                                        hasAccess ? "text-white" : "text-slate-400"
                                      }`}
                                    >
                                      {member.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                      <span>{member.relationship}</span>
                                      <span>•</span>
                                      <span className="font-mono">{member.email || member.phone || "No login yet"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Access Toggle */}
                              <td className="py-3.5 px-4">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasAccess}
                                    onChange={(e) =>
                                      togglePropertyAccess(member, p.id, e.target.checked)
                                    }
                                    disabled={isSaving}
                                    className="sr-only peer"
                                  />
                                  <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                  <span
                                    className={`ms-2 text-xs font-semibold ${
                                      hasAccess ? "text-emerald-400" : "text-slate-500"
                                    }`}
                                  >
                                    {hasAccess ? "Authorized" : "Blocked"}
                                  </span>
                                </label>
                              </td>

                              {/* Rent Collection Logging */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  disabled={!hasAccess || isSaving}
                                  onClick={() => toggleMemberPropertyAction(member, "canWriteRent")}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    !hasAccess
                                      ? "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800/40"
                                      : acc.canWriteRent
                                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                                  }`}
                                >
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>{acc.canWriteRent ? "Can Collect Rent" : "View Only"}</span>
                                </button>
                              </td>

                              {/* Maintenance & Expenses */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  disabled={!hasAccess || isSaving}
                                  onClick={() =>
                                    toggleMemberPropertyAction(member, "canWritePropertyMaintenance")
                                  }
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                                    !hasAccess
                                      ? "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800/40"
                                      : acc.canWritePropertyMaintenance
                                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                                  }`}
                                >
                                  <Wrench className="h-3.5 w-3.5" />
                                  <span>{acc.canWritePropertyMaintenance ? "Can Log Expenses" : "View Only"}</span>
                                </button>
                              </td>

                              {/* Quick Invite / Share Link */}
                              <td className="py-3.5 px-4 text-right pr-6">
                                <button
                                  type="button"
                                  onClick={() => setInviteMember(member)}
                                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                                  title="Send invite and credentials to this member"
                                >
                                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-[11px]">Invite</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEMBER MATRIX & ROLES OVERVIEW                                     */}
      {/* ========================================================================= */}
      {!loading && activeTab === "members" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-850/80 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Family Members Security & Roles Matrix</h3>
                <p className="text-xs text-slate-400">
                  Assign top-level workspace roles and review cross-asset privileges
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Member</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4">Assigned Vehicles</th>
                    <th className="py-3.5 px-4">Assigned Properties</th>
                    <th className="py-3.5 px-4">Vault Access</th>
                    <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredMembers.map((member) => {
                    const acc = member.access || getDefaultMemberAccess();
                    const isSaving = savingId === member.id;

                    const permittedVehicles =
                      !acc.canAccessVehicles
                        ? []
                        : !acc.assignedVehicleIds || acc.assignedVehicleIds.length === 0
                        ? vehicles
                        : vehicles.filter((v) => acc.assignedVehicleIds.includes(v.id));

                    const permittedProperties =
                      !acc.canAccessProperties
                        ? []
                        : !acc.assignedPropertyIds || acc.assignedPropertyIds.length === 0
                        ? properties
                        : properties.filter((p) => acc.assignedPropertyIds?.includes(p.id));

                    return (
                      <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Member identity */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{member.fullName}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span>{member.relationship}</span>
                                <span>•</span>
                                <span className="font-mono">{member.email || "No email"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role selector dropdown */}
                        <td className="py-4 px-4">
                          <select
                            value={acc.loginRole}
                            disabled={isSaving}
                            onChange={(e) =>
                              handleRoleChange(
                                member,
                                e.target.value as FamilyMemberAccess["loginRole"]
                              )
                            }
                            className="bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-orange-500"
                          >
                            <option value="Admin">Admin (Full Access)</option>
                            <option value="Vehicle_Manager">Vehicle Manager</option>
                            <option value="Viewer">Viewer (Read-Only)</option>
                            <option value="Custom">Custom Granular</option>
                          </select>
                        </td>

                        {/* Vehicles badge count */}
                        <td className="py-4 px-4">
                          {!acc.canAccessVehicles || permittedVehicles.length === 0 ? (
                            <span className="text-slate-500 text-[11px]">No access</span>
                          ) : permittedVehicles.length === vehicles.length ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
                              All Vehicles ({vehicles.length})
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {permittedVehicles.map((pv) => (
                                <span
                                  key={pv.id}
                                  className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                                >
                                  {pv.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Properties badge count */}
                        <td className="py-4 px-4">
                          {!acc.canAccessProperties || permittedProperties.length === 0 ? (
                            <span className="text-slate-500 text-[11px]">No access</span>
                          ) : permittedProperties.length === properties.length ? (
                            <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 text-[11px]">
                              All Properties ({properties.length})
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {permittedProperties.map((pp) => (
                                <span
                                  key={pp.id}
                                  className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md"
                                >
                                  {pp.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Vault toggle */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              acc.canAccessVault
                                ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                                : "bg-slate-800 text-slate-500 border border-slate-700"
                            }`}
                          >
                            {acc.canAccessVault ? "Vault Enabled" : "Restricted"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right pr-6 space-x-2">
                          <button
                            type="button"
                            onClick={() => setInviteMember(member)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5 text-orange-400" />
                            <span>Invite & Login</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEND INVITE & CREDENTIALS                                         */}
      {/* ========================================================================= */}
      {inviteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-850 p-6 text-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Invite {inviteMember.fullName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Send login instructions and access credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* How does login work note */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Info className="h-4 w-4 text-orange-400" />
                <span>How the invited member logs in:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>
                  They open LifeNest and click <span className="text-white font-semibold">Sign Up</span>.
                </li>
                <li>
                  They type their email: <span className="text-orange-400 font-mono font-semibold">{inviteMember.email || "(no email registered yet)"}</span>.
                </li>
                <li>They choose their own password.</li>
                <li>
                  Once logged in, they will automatically see the vehicles and properties you assigned here!
                </li>
              </ol>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Message Preview
              </label>
              <textarea
                readOnly
                value={getInviteText(inviteMember)}
                rows={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 font-mono focus:outline-none resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleCopyInvite(inviteMember)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Instructions</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => shareInviteWhatsApp(inviteMember)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <Share2 className="h-4 w-4" />
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
