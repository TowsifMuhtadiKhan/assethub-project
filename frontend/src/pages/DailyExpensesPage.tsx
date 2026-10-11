import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  Lock,
  Unlock,
  KeyRound,
  Search,
  Check,
  X,
  Trash2,
  Edit2,
  LayoutGrid,
  List,
  Clock,
} from "lucide-react";
import { listFamilyMembers } from "../services/familyService";
import {
  listDailyExpenses,
  createDailyExpense,
  updateDailyExpense,
  deleteDailyExpense,
  hasMemberPin,
  setMemberPin,
  verifyMemberPin,
} from "../services/dailyExpenseService";
import type {
  DailyExpense,
  DailyExpenseCategory,
  DailyExpensePaymentMethod,
  FamilyMember,
} from "../types";

const CATEGORIES: { label: DailyExpenseCategory; color: string; bg: string }[] = [
  { label: "Food & Dining", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  { label: "Groceries & Market", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { label: "Transport & Commute", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  { label: "Shopping & Personal", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { label: "Bills & Utilities", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { label: "Healthcare & Medicine", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  { label: "Education", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { label: "Entertainment", color: "text-pink-700", bg: "bg-pink-50 border-pink-200" },
  { label: "Family & Home", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  { label: "Others", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
];

const PAYMENT_METHODS: DailyExpensePaymentMethod[] = [
  "Cash",
  "bKash",
  "Nagad",
  "Bank Card",
  "Rocket",
  "Other",
];

export function DailyExpensesPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Unlocked Member ID (stored in sessionStorage for privacy during session)
  const [activeMemberId, setActiveMemberId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("lifenest_unlocked_expense_member") || null;
    } catch {
      return null;
    }
  });

  // PIN Unlock / Setup Modal State
  const [pinTargetMember, setPinTargetMember] = useState<FamilyMember | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirmInput, setPinConfirmInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Filters & View State
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create / Edit Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState<DailyExpenseCategory>("Food & Dining");
  const [formPaymentMethod, setFormPaymentMethod] = useState<DailyExpensePaymentMethod>("Cash");
  const [formDescription, setFormDescription] = useState("");
  const [formMerchant, setFormMerchant] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  // Delete modal state
  const [expenseToDelete, setExpenseToDelete] = useState<DailyExpense | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const famMembers = await listFamilyMembers();
      setMembers(famMembers);

      // Auto-unlock the first member if no PIN is set on anyone yet (for zero friction first-time)
      const allExpenses = await listDailyExpenses();
      setExpenses(allExpenses);

      if (famMembers.length > 0 && !activeMemberId) {
        // If first member has no PIN, set them as default
        const first = famMembers[0];
        if (!hasMemberPin(first.id)) {
          setActiveMemberId(first.id);
          try {
            sessionStorage.setItem("lifenest_unlocked_expense_member", first.id);
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const activeMember = useMemo(() => {
    return members.find((m) => m.id === activeMemberId) || null;
  }, [members, activeMemberId]);

  // Lock ledger / Switch Profile
  const handleLockProfile = () => {
    setActiveMemberId(null);
    try {
      sessionStorage.removeItem("lifenest_unlocked_expense_member");
    } catch {}
  };

  // Open PIN modal when a member profile is clicked
  const handleSelectMember = (member: FamilyMember) => {
    setPinTargetMember(member);
    setPinInput("");
    setPinConfirmInput("");
    setPinError("");
  };

  // Submit PIN for unlock or initial setup
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinTargetMember) return;

    const hasPin = hasMemberPin(pinTargetMember.id);

    if (!hasPin) {
      // First-time PIN setup
      if (pinInput.length < 4) {
        setPinError("Please enter a 4-digit PIN.");
        return;
      }
      if (pinInput !== pinConfirmInput) {
        setPinError("PINs do not match. Please re-enter.");
        return;
      }

      setMemberPin(pinTargetMember.id, pinInput);
      setActiveMemberId(pinTargetMember.id);
      try {
        sessionStorage.setItem("lifenest_unlocked_expense_member", pinTargetMember.id);
      } catch {}
      setPinTargetMember(null);
      showToast(`PIN set successfully for ${pinTargetMember.fullName}!`);
    } else {
      // PIN verification
      const valid = verifyMemberPin(pinTargetMember.id, pinInput);
      if (!valid) {
        setPinError("Incorrect PIN. Please try again.");
        return;
      }

      setActiveMemberId(pinTargetMember.id);
      try {
        sessionStorage.setItem("lifenest_unlocked_expense_member", pinTargetMember.id);
      } catch {}
      setPinTargetMember(null);
      showToast(`Welcome back, ${pinTargetMember.fullName}!`);
    }
  };

  // Filter expenses for current member
  const memberExpenses = useMemo(() => {
    if (!activeMemberId) return [];
    return expenses.filter((e) => e.familyMemberId === activeMemberId);
  }, [expenses, activeMemberId]);

  // Filter by time range, category, search
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    return memberExpenses.filter((e) => {
      // Category filter
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesMerchant = (e.merchant || "").toLowerCase().includes(q);
        const matchesCat = e.category.toLowerCase().includes(q);
        if (!matchesDesc && !matchesMerchant && !matchesCat) return false;
      }

      // Time filter
      if (timeFilter === "today") {
        return e.date === todayStr;
      }
      if (timeFilter === "week") {
        const itemDate = new Date(e.date);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeFilter === "month") {
        const itemDate = new Date(e.date);
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }
      return true;
    });
  }, [memberExpenses, timeFilter, categoryFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();

    let todayTotal = 0;
    let monthTotal = 0;
    const categoryTotals: Record<string, number> = {};

    for (const e of memberExpenses) {
      if (e.date === todayStr) {
        todayTotal += e.amount;
      }
      const itemDate = new Date(e.date);
      if (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      ) {
        monthTotal += e.amount;
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      }
    }

    // Top Category
    let topCat = "—";
    let maxVal = 0;
    for (const [cat, val] of Object.entries(categoryTotals)) {
      if (val > maxVal) {
        maxVal = val;
        topCat = cat;
      }
    }

    // Days in current month so far
    const dayOfMonth = now.getDate() || 1;
    const dailyAvg = Math.round(monthTotal / dayOfMonth);

    return { todayTotal, monthTotal, dailyAvg, topCat, categoryTotals };
  }, [memberExpenses]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingExpense(null);
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCategory("Food & Dining");
    setFormPaymentMethod("Cash");
    setFormDescription("");
    setFormMerchant("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (exp: DailyExpense) => {
    setEditingExpense(exp);
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setFormCategory(exp.category);
    setFormPaymentMethod(exp.paymentMethod);
    setFormDescription(exp.description);
    setFormMerchant(exp.merchant || "");
    setIsModalOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemberId || formAmount === "" || formAmount <= 0) return;

    setSavingExpense(true);
    try {
      if (editingExpense) {
        const updated = await updateDailyExpense(editingExpense.id, {
          amount: Number(formAmount),
          date: formDate,
          category: formCategory,
          paymentMethod: formPaymentMethod,
          description: formDescription.trim(),
          merchant: formMerchant.trim(),
        });
        setExpenses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast("Expense updated successfully!");
      } else {
        const created = await createDailyExpense({
          familyMemberId: activeMemberId,
          familyMemberName: activeMember?.fullName,
          amount: Number(formAmount),
          date: formDate,
          category: formCategory,
          paymentMethod: formPaymentMethod,
          description: formDescription.trim(),
          merchant: formMerchant.trim(),
        });
        setExpenses((prev) => [created, ...prev]);
        showToast("Daily expense logged!");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save expense.");
    } finally {
      setSavingExpense(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteDailyExpense(expenseToDelete.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      showToast("Expense deleted.");
      setExpenseToDelete(null);
    } catch {
      showToast("Failed to delete expense.");
    }
  };

  return (
    <div className="space-y-6 w-full text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTIVE MEMBER STATUS                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              <span>Personal Finance</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">PIN-PROTECTED LEDGER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Daily Expenses & Money Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your daily money spent, food, transport, and personal expenses protected by your private PIN
          </p>
        </div>

        {/* Unlocked Profile Capsule / Switcher */}
        {activeMember ? (
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-xs uppercase text-amber-700">
              {activeMember.fullName.charAt(0)}
            </div>
            <div className="px-1 text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {activeMember.fullName}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <Unlock className="h-2.5 w-2.5" />
                <span>Ledger Unlocked</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLockProfile}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-slate-100"
              title="Lock and switch profile"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Lock / Switch</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-xs text-amber-800 font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Choose your family profile below to unlock</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. LOADING STATE OR PROFILE SELECTOR / EXPENSES DASHBOARD                 */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading daily expenses and member ledgers...</p>
        </div>
      ) : !activeMember ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="max-w-xl mx-auto text-center space-y-2 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-1">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Select Your Family Profile to Unlock Daily Expenses
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Each family member maintains their own confidential spending ledger protected by their personal 4-digit PIN.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {members.map((m) => {
                const hasPin = hasMemberPin(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    className="flex flex-col items-center p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-400 hover:shadow-md transition text-center cursor-pointer group"
                  >
                    <div className="relative">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                        {m.fullName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] border border-white shadow-2xs ${
                          hasPin ? "bg-slate-800 text-white" : "bg-amber-500 text-white"
                        }`}
                        title={hasPin ? "PIN Protected" : "Setup PIN"}
                      >
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    </div>

                    <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-amber-700">
                      {m.fullName}
                    </h3>
                    <div className="text-[11px] text-slate-400">{m.relationship}</div>

                    <span
                      className={`mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        hasPin
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {hasPin ? "Enter PIN to Unlock" : "Set New PIN"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. ACTIVE MEMBER'S EXPENSE DASHBOARD                                      */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Today's Spent
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900">
                ৳{stats.todayTotal.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                This Month's Total
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-amber-600">
                ৳{stats.monthTotal.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Daily Average
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900">
                ৳{stats.dailyAvg.toLocaleString()}
                <span className="text-xs font-normal text-slate-400">/day</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Based on past {new Date().getDate()} days</div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Top Expense
              </div>
              <div className="mt-1 text-sm sm:text-base font-bold text-slate-900 truncate">
                {stats.topCat}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {stats.categoryTotals[stats.topCat]
                  ? `৳${stats.categoryTotals[stats.topCat].toLocaleString()} this month`
                  : "No entries yet"}
              </div>
            </div>
          </div>

          {/* Filter Bar & Quick Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Time Range Pills */}
              <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100/90 text-xs">
                <button
                  type="button"
                  onClick={() => setTimeFilter("today")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    timeFilter === "today"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("week")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    timeFilter === "week"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("month")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    timeFilter === "month"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    timeFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 shadow-2xs font-medium"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, merchant..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 shadow-2xs"
                />
              </div>

              {/* View mode toggle */}
              <div className="flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                  }`}
                  title="Table view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Add Expense Button */}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Expense</span>
              </button>
            </div>
          </div>

          {/* Expense Entries Table / Grid */}
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeMember.fullName}'s Expenses History
                </h3>
                <p className="text-[11px] text-slate-500">
                  {filteredExpenses.length} entries found
                </p>
              </div>

              <div className="text-xs font-bold font-mono text-slate-900">
                Total: ৳{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No daily expenses logged</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click "+ Log Expense" above to record food, groceries, transport, or shopping.
                </p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3 w-3" /> Log First Expense
                </button>
              </div>
            ) : viewMode === "table" ? (
              /* TABLE VIEW */
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Description / Merchant</th>
                      <th className="py-2.5 px-4">Payment Method</th>
                      <th className="py-2.5 px-4 font-mono text-right">Amount</th>
                      <th className="py-2.5 px-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => {
                      const catConfig = CATEGORIES.find((c) => c.label === exp.category) || CATEGORIES[9];
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px] text-slate-700">
                            {exp.date}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${catConfig.bg} ${catConfig.color}`}
                            >
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-xs">
                              {exp.description || "Daily Expense"}
                            </div>
                            {exp.merchant && (
                              <div className="text-[11px] text-slate-400">
                                Store: {exp.merchant}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {exp.paymentMethod}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-3 px-4 font-mono font-bold text-slate-900 text-right text-sm">
                            ৳{exp.amount.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap py-3 px-4 text-right pr-6 space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(exp)}
                              className="rounded p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(exp)}
                              className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Delete expense"
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
            ) : (
              /* GRID CARDS VIEW */
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredExpenses.map((exp) => {
                  const catConfig = CATEGORIES.find((c) => c.label === exp.category) || CATEGORIES[9];
                  return (
                    <div
                      key={exp.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.bg} ${catConfig.color}`}
                          >
                            {exp.category}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{exp.date}</span>
                        </div>

                        <div className="mt-2 text-xs font-bold text-slate-900">
                          {exp.description || "Daily Expense"}
                        </div>
                        {exp.merchant && (
                          <div className="text-[11px] text-slate-400">{exp.merchant}</div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            ৳{exp.amount.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-400">{exp.paymentMethod}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            className="p-1 text-slate-400 hover:text-slate-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1 text-slate-300 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PIN INPUT / SETUP                                              */}
      {/* ========================================================================= */}
      {pinTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {hasMemberPin(pinTargetMember.id)
                  ? `Enter PIN for ${pinTargetMember.fullName}`
                  : `Set New PIN for ${pinTargetMember.fullName}`}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasMemberPin(pinTargetMember.id)
                  ? "Enter your 4-digit security PIN to access your personal expenses ledger."
                  : "Create a confidential 4-digit PIN to keep your daily expenses private."}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "");
                    setPinInput(clean);
                    setPinError("");
                  }}
                  className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {!hasMemberPin(pinTargetMember.id) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={pinConfirmInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, "");
                      setPinConfirmInput(clean);
                      setPinError("");
                    }}
                    className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              )}

              {pinError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-center text-xs text-rose-700 font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinTargetMember(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  {hasMemberPin(pinTargetMember.id) ? "Unlock Ledger" : "Set & Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: LOG / EDIT EXPENSE                                             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                  ৳
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingExpense ? "Edit Daily Expense" : "Log Daily Expense"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recording for <span className="font-semibold">{activeMember?.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="e.g. 500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as DailyExpenseCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-medium"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) =>
                      setFormPaymentMethod(e.target.value as DailyExpensePaymentMethod)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description & Store */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch with colleagues, Rice & Cooking Oil"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant / Shop (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shwapno, Meena Bazar, Rickshaw, Star Kabab"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {savingExpense ? "Saving..." : editingExpense ? "Save Changes" : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: DELETE CONFIRMATION                                            */}
      {/* ========================================================================= */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Expense Entry?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">৳{expenseToDelete.amount} ({expenseToDelete.description})</span>? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
