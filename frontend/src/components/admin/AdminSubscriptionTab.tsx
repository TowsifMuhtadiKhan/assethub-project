import { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Sparkles,
  Search,
  Check,
  Edit2,
  X,
  Save,
  RefreshCw,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  getAllUserSubscriptions,
  saveUserSubscription,
  grantUserFullAccess,
  type UserSubscriptionRecord,
  type PlanTier,
  PLAN_LIMITS,
} from "../../services/subscriptionService";

export function AdminSubscriptionTab() {
  const [users, setUsers] = useState<UserSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Add / Grant State
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newTier, setNewTier] = useState<PlanTier>("Family");
  const [newCycle, setNewCycle] = useState<"monthly" | "yearly" | "lifetime">("yearly");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Custom Limits Modal State
  const [editingRecord, setEditingRecord] = useState<UserSubscriptionRecord | null>(null);
  const [customMaxVehicles, setCustomMaxVehicles] = useState<number>(10);
  const [customMaxProperties, setCustomMaxProperties] = useState<number>(10);
  const [customMaxDocs, setCustomMaxDocs] = useState<number>(500);
  const [customMaxMembers, setCustomMaxMembers] = useState<number>(5);
  const [customMaxUnits, setCustomMaxUnits] = useState<number>(10);
  const [customStorageMb, setCustomStorageMb] = useState<number>(5120);
  const [customHasDpsEmi, setCustomHasDpsEmi] = useState<boolean>(true);
  const [customHasAnalytics, setCustomHasAnalytics] = useState<boolean>(true);
  const [customHasFamily, setCustomHasFamily] = useState<boolean>(true);
  const [customHasPropertyPro, setCustomHasPropertyPro] = useState<boolean>(false);
  const [customHasWhatsapp, setCustomHasWhatsapp] = useState<boolean>(true);
  const [customNotes, setCustomNotes] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllUserSubscriptions();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load user subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.userName && u.userName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTier =
        selectedTierFilter === "ALL" || u.planTier === selectedTierFilter;
      return matchesSearch && matchesTier;
    });
  }, [users, searchQuery, selectedTierFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const free = users.filter((u) => u.planTier === "Free").length;
    const paid = users.filter(
      (u) =>
        u.planTier === "Personal" ||
        u.planTier === "Family" ||
        u.planTier === "Premium" ||
        u.planTier === "Property_Pro"
    ).length;
    const vip = users.filter((u) => u.planTier === "Unlimited_Admin").length;
    return { total, free, paid, vip };
  }, [users]);

  // 1-Click VIP Grant
  const handleGrantVip = async (user: UserSubscriptionRecord) => {
    if (
      !window.confirm(
        `Grant 1-Click Lifetime Unlimited VIP access to ${user.userName || user.userEmail}?`
      )
    )
      return;
    try {
      await grantUserFullAccess(user.userEmail, user.userName);
      showToast(`⭐ Lifetime VIP granted to ${user.userEmail}!`);
      await loadData();
    } catch {
      showToast("Error granting VIP access.");
    }
  };

  // Quick Plan Change Dropdown
  const handleQuickPlanChange = async (
    user: UserSubscriptionRecord,
    nextTier: PlanTier
  ) => {
    const baseLimits = PLAN_LIMITS[nextTier] || PLAN_LIMITS.Free;
    const updated: UserSubscriptionRecord = {
      ...user,
      planTier: nextTier,
      grantedByAdmin: true,
      customLimits: {
        ...baseLimits,
      },
      notes: `Plan changed to ${nextTier} by Admin on ${new Date().toLocaleDateString()}`,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserSubscription(updated);
      showToast(`Plan updated to ${nextTier} for ${user.userEmail}`);
      await loadData();
    } catch {
      showToast("Failed to update plan.");
    }
  };

  // Quick Add or Grant Access
  const handleCreateNewAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      alert("Please enter a valid user email.");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const baseLimits = PLAN_LIMITS[newTier] || PLAN_LIMITS.Free;
      const rec: UserSubscriptionRecord = {
        id: `sub_${Date.now()}`,
        userEmail: newEmail.trim().toLowerCase(),
        userName: newName.trim() || undefined,
        planTier: newTier,
        billingCycle: newCycle,
        status: "active",
        grantedByAdmin: true,
        notes: `Access granted by Admin (${newTier} - ${newCycle})`,
        customLimits: {
          ...baseLimits,
        },
        updatedAt: new Date().toISOString(),
      };

      await saveUserSubscription(rec);
      showToast(`Access granted: ${newEmail.trim()} is now on ${newTier} plan!`);
      setNewEmail("");
      setNewName("");
      await loadData();
    } catch {
      showToast("Failed to grant access.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Open Edit Limits Modal
  const openEditModal = (rec: UserSubscriptionRecord) => {
    setEditingRecord(rec);
    const limits = {
      ...(PLAN_LIMITS[rec.planTier] || PLAN_LIMITS.Free),
      ...(rec.customLimits || {}),
    };
    setCustomMaxVehicles(limits.maxVehicles);
    setCustomMaxProperties(limits.maxProperties);
    setCustomMaxDocs(limits.maxDocuments);
    setCustomMaxMembers(limits.maxMembers);
    setCustomMaxUnits(limits.maxUnits);
    setCustomStorageMb(limits.storageMb);
    setCustomHasDpsEmi(limits.hasDpsEmi);
    setCustomHasAnalytics(limits.hasAdvancedAnalytics);
    setCustomHasFamily(limits.hasFamilySharing);
    setCustomHasPropertyPro(limits.hasPropertyPro);
    setCustomHasWhatsapp(limits.hasWhatsappAlerts);
    setCustomNotes(rec.notes || "");
  };

  // Save Custom Limits
  const handleSaveCustomLimits = async () => {
    if (!editingRecord) return;

    const updated: UserSubscriptionRecord = {
      ...editingRecord,
      grantedByAdmin: true,
      notes: customNotes.trim() || editingRecord.notes,
      customLimits: {
        maxVehicles: Number(customMaxVehicles),
        maxProperties: Number(customMaxProperties),
        maxDocuments: Number(customMaxDocs),
        maxMembers: Number(customMaxMembers),
        maxUnits: Number(customMaxUnits),
        storageMb: Number(customStorageMb),
        hasDpsEmi: customHasDpsEmi,
        hasAdvancedAnalytics: customHasAnalytics,
        hasFamilySharing: customHasFamily,
        hasPropertyPro: customHasPropertyPro,
        hasWhatsappAlerts: customHasWhatsapp,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserSubscription(updated);
      showToast(`Custom limits saved for ${editingRecord.userEmail}`);
      setEditingRecord(null);
      await loadData();
    } catch {
      showToast("Failed to save custom limits.");
    }
  };

  const getTierBadge = (tier: PlanTier) => {
    switch (tier) {
      case "Unlimited_Admin":
        return "bg-amber-100 text-amber-900 border-amber-300 font-black";
      case "Property_Pro":
        return "bg-indigo-50 text-indigo-800 border-indigo-200 font-bold";
      case "Premium":
        return "bg-purple-50 text-purple-800 border-purple-200 font-bold";
      case "Family":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
      case "Personal":
        return "bg-blue-50 text-blue-800 border-blue-200 font-semibold";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 font-medium";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">মোট ইউজার (Total)</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-400">নিবন্ধিত অ্যাকাউন্ট</div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700">পেইড সাবস্ক্রিপশন</div>
          <div className="mt-1 text-2xl font-black text-emerald-800">{stats.paid}</div>
          <div className="text-[10px] text-slate-400">Personal / Family / Pro</div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-700">আনলিমিটেড VIP</div>
          <div className="mt-1 text-2xl font-black text-amber-800">{stats.vip}</div>
          <div className="text-[10px] text-slate-400">লাইফটাইম ফুল অ্যাক্সেস</div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">ফ্রি টায়ার ইউজার</div>
          <div className="mt-1 text-2xl font-black text-slate-600">{stats.free}</div>
          <div className="text-[10px] text-slate-400">বেসিক ট্রায়াল ইউজার</div>
        </div>
      </div>

      {/* 2. Quick Grant / Upgrade Box */}
      <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-tr from-white via-emerald-50/20 to-teal-50/30 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900">
            ইউজারকে সরাসরি প্ল্যান অ্যাক্সেস প্রদান করুন (Grant or Upgrade Plan)
          </h3>
        </div>
        <form onSubmit={handleCreateNewAccess} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ইউজার ইমেইল (User Email) *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. user@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ইউজার নাম (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="e.g. Rahim Ahmed"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              প্ল্যান টায়ার (Plan Tier)
            </label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value as PlanTier)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="Free">Free (১ গাড়ি, ১০ ডক)</option>
              <option value="Personal">Personal (৳৯৯/মাস)</option>
              <option value="Family">Family (৳১৯৯/মাস - ৫ জন)</option>
              <option value="Premium">Premium (৳৩৯৯/মাস - ১০ জন)</option>
              <option value="Property_Pro">Property Pro (৳৫৯৯/মাস)</option>
              <option value="Unlimited_Admin">⭐ Unlimited Admin (VIP)</option>
            </select>
          </div>
          <div className="sm:col-span-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              বিলিং সাইকেল
            </label>
            <select
              value={newCycle}
              onChange={(e) => setNewCycle(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div className="sm:col-span-1.5">
            <button
              type="submit"
              disabled={isSubmittingNew}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-xs font-bold text-white shadow-xs hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{isSubmittingNew ? "Saving..." : "অ্যাক্সেস দিন"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ইমেইল বা নাম দিয়ে খুঁজুন…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {["ALL", "Free", "Personal", "Family", "Premium", "Property_Pro", "Unlimited_Admin"].map(
            (tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTierFilter(tier)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedTierFilter === tier
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50"
                }`}
              >
                {tier === "ALL" ? "সবগুলো" : tier.replace("_", " ")}
              </button>
            )
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="py-3 px-4">ইউজার (User Account)</th>
                <th className="py-3 px-3">বর্তমান প্ল্যান (Active Tier)</th>
                <th className="py-3 px-3">বিলিং সাইকেল</th>
                <th className="py-3 px-3">স্ট্যাটাস</th>
                <th className="py-3 px-3">প্ল্যান পরিবর্তন (Quick Change)</th>
                <th className="py-3 px-4 text-right">অ্যাকশন (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    লোড হচ্ছে…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    কোনো ইউজার অ্যাকাউন্ট পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.userEmail} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.userName || u.userEmail.split("@")[0]}</span>
                        {u.planTier === "Unlimited_Admin" && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.userEmail}</div>
                      {u.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{u.notes}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${getTierBadge(
                          u.planTier
                        )}`}
                      >
                        {u.planTier.replace("_", " ")}
                      </span>
                      {u.grantedByAdmin && (
                        <span className="ml-1 text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Admin VIP
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-600 capitalize">
                      {u.billingCycle}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.planTier}
                        onChange={(e) => handleQuickPlanChange(u, e.target.value as PlanTier)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:border-slate-400 focus:outline-none cursor-pointer"
                      >
                        <option value="Free">Free</option>
                        <option value="Personal">Personal (৳৯৯)</option>
                        <option value="Family">Family (৳১৯৯)</option>
                        <option value="Premium">Premium (৳৩৯৯)</option>
                        <option value="Property_Pro">Property Pro (৳৫৯৯)</option>
                        <option value="Unlimited_Admin">⭐ Unlimited Admin</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.planTier !== "Unlimited_Admin" && (
                          <button
                            type="button"
                            onClick={() => handleGrantVip(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                            title="১-ক্লিকে লাইফটাইম ফুল অ্যাক্সেস দিন"
                          >
                            <Zap className="h-3 w-3 text-amber-600 fill-amber-500" />
                            <span>1-Click VIP</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="কাস্টম লিমিট পরিবর্তন করুন"
                        >
                          <Edit2 className="h-3 w-3 text-slate-500" />
                          <span>কাস্টম লিমিট</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Custom Limits Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    কাস্টম লিমিট ও পারমিশন কনফিগারেশন
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editingRecord.userEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    সর্বোচ্চ গাড়ি (Max Vehicles)
                  </label>
                  <input
                    type="number"
                    value={customMaxVehicles}
                    onChange={(e) => setCustomMaxVehicles(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    সর্বোচ্চ বাড়ি/ফ্ল্যাট (Max Properties)
                  </label>
                  <input
                    type="number"
                    value={customMaxProperties}
                    onChange={(e) => setCustomMaxProperties(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    সর্বোচ্চ ডকুমেন্ট (Max Documents)
                  </label>
                  <input
                    type="number"
                    value={customMaxDocs}
                    onChange={(e) => setCustomMaxDocs(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ফ্যামিলি মেম্বার সংখ্যা (Max Members)
                  </label>
                  <input
                    type="number"
                    value={customMaxMembers}
                    onChange={(e) => setCustomMaxMembers(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ভাড়াযোগ্য ইউনিট (Property Units)
                  </label>
                  <input
                    type="number"
                    value={customMaxUnits}
                    onChange={(e) => setCustomMaxUnits(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্লাউড স্পেস (Storage in MB)
                  </label>
                  <input
                    type="number"
                    value={customStorageMb}
                    onChange={(e) => setCustomStorageMb(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  নির্দিষ্ট ফিচার পারমিশন (Feature Toggles):
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customHasDpsEmi}
                    onChange={(e) => setCustomHasDpsEmi(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>DPS, FDR এবং ব্যাংক লোন EMI ট্র্যাকিং অন রাখুন</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customHasAnalytics}
                    onChange={(e) => setCustomHasAnalytics(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>অ্যাডভান্সড খরচের ট্রেন্ড ও চার্ট এনালিটিক্স সক্রিয়</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customHasFamily}
                    onChange={(e) => setCustomHasFamily(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>ফ্যামিলি শেয়ারিং ও অ্যাক্সেস কন্ট্রোল অনুমতি দিন</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customHasPropertyPro}
                    onChange={(e) => setCustomHasPropertyPro(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>বাড়িওয়ালা Property Pro মডিউল সক্রিয় করুন</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customHasWhatsapp}
                    onChange={(e) => setCustomHasWhatsapp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>অটোমেটেড হোয়াটসঅ্যাপ রিমাইন্ডার পাঠানোর সুবিধা</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  এডমিন নোটস (Admin Notes)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved manually via bKash TrxID #89324"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveCustomLimits}
                className="px-4 py-2 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-xs font-bold text-white shadow-xs hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>সংরক্ষণ করুন (Save Changes)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
