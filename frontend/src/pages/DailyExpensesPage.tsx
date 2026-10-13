import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
  CreditCard,
  ChevronDown,
  ChevronUp,
  Banknote,
  Percent,
  Filter,
} from "lucide-react";
import { listFamilyMembersWithSelf } from "../services/familyService";
import {
  listDailyExpenses,
  createDailyExpense,
  updateDailyExpense,
  deleteDailyExpense,
  hasMemberPin,
  setMemberPin,
  verifyMemberPin,
  listMemberLoans,
  createMemberLoan,
  addLoanRepaymentSegment,
  deleteMemberLoan,
} from "../services/dailyExpenseService";
import type {
  DailyExpense,
  DailyExpenseCategory,
  DailyExpensePaymentMethod,
  FamilyMember,
  MemberLoan,
  LoanRepaymentSegment,
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
  { label: "Loan & EMI Repayment", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount =
    (timeFilter !== "month" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0);

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

  // Active Tab: Expenses Ledger vs Loans & Repayments
  const [activeTab, setActiveTab] = useState<"expenses" | "loans">("expenses");

  // Loans & Segment Repayments State
  const [loans, setLoans] = useState<MemberLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [expandedLoanIds, setExpandedLoanIds] = useState<Set<string>>(new Set());

  // Add Loan Modal State
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [loanTitle, setLoanTitle] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [loanType, setLoanType] = useState<MemberLoan["loanType"]>("Car Loan");
  const [totalPrincipal, setTotalPrincipal] = useState<number | "">("");
  const [monthlyEmiAmount, setMonthlyEmiAmount] = useState<number | "">("");
  const [interestRatePercent, setInterestRatePercent] = useState<number | "">("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [targetEndDate, setTargetEndDate] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [savingLoan, setSavingLoan] = useState(false);

  // Pay Segment Modal State
  const [isPaySegmentModalOpen, setIsPaySegmentModalOpen] = useState(false);
  const [selectedLoanForSegment, setSelectedLoanForSegment] = useState<MemberLoan | null>(null);
  const [segmentAmount, setSegmentAmount] = useState<number | "">("");
  const [segmentDate, setSegmentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [segmentMethod, setSegmentMethod] = useState<DailyExpensePaymentMethod>("Bank Card");
  const [segmentNotes, setSegmentNotes] = useState("");
  const [segmentSyncDailyExpense, setSegmentSyncDailyExpense] = useState(true);
  const [savingSegment, setSavingSegment] = useState(false);

  // Delete Loan Modal State
  const [loanToDelete, setLoanToDelete] = useState<MemberLoan | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const famMembers = await listFamilyMembersWithSelf();
      setMembers(famMembers);

      const allExpenses = await listDailyExpenses();
      setExpenses(allExpenses);
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

  const loadLoans = async (memberId: string) => {
    setLoadingLoans(true);
    try {
      const data = await listMemberLoans(memberId);
      setLoans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    if (activeMemberId) {
      loadLoans(activeMemberId);
    } else {
      setLoans([]);
    }
  }, [activeMemberId]);

  const loanStats = useMemo(() => {
    const totalBorrowed = loans.reduce(
      (acc, l) => acc + (l.totalRepayableAmount || l.principalAmount || 0),
      0
    );
    const totalRepaid = loans.reduce(
      (acc, l) => acc + (l.repayments || []).reduce((s, r) => s + r.amount, 0),
      0
    );
    const totalRemaining = Math.max(0, totalBorrowed - totalRepaid);
    const activeCount = loans.filter((l) => l.status === "ACTIVE").length;
    const settledCount = loans.filter((l) => l.status === "PAID_OFF").length;
    const totalSegments = loans.reduce((acc, l) => acc + (l.repayments?.length || 0), 0);
    const overallRepaidPct =
      totalBorrowed > 0 ? Math.min(100, Math.round((totalRepaid / totalBorrowed) * 100)) : 0;

    return { totalBorrowed, totalRepaid, totalRemaining, activeCount, settledCount, totalSegments, overallRepaidPct };
  }, [loans]);

  const toggleLoanExpanded = (loanId: string) => {
    setExpandedLoanIds((prev) => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const openAddLoanModal = () => {
    setLoanTitle("");
    setLenderName("");
    setLoanType("Car Loan");
    setTotalPrincipal("");
    setMonthlyEmiAmount("");
    setInterestRatePercent("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setTargetEndDate("");
    setLoanNotes("");
    setIsAddLoanModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemberId || !loanTitle.trim() || !lenderName.trim() || totalPrincipal === "" || Number(totalPrincipal) <= 0) return;
    setSavingLoan(true);
    try {
      await createMemberLoan({
        familyMemberId: activeMemberId,
        loanTitle: loanTitle.trim(),
        lenderName: lenderName.trim(),
        loanType,
        principalAmount: Number(totalPrincipal),
        totalRepayableAmount: Number(totalPrincipal),
        monthlyEmiAmount: monthlyEmiAmount !== "" ? Number(monthlyEmiAmount) : undefined,
        interestRate: interestRatePercent !== "" ? Number(interestRatePercent) : undefined,
        startDate,
        targetEndDate: targetEndDate || undefined,
        status: "ACTIVE",
        notes: loanNotes.trim() || undefined,
      });
      await loadLoans(activeMemberId);
      setIsAddLoanModalOpen(false);
      showToast("Loan / Borrowing entry created successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLoan(false);
    }
  };

  const openPaySegmentModal = (loan: MemberLoan) => {
    setSelectedLoanForSegment(loan);
    setSegmentAmount(loan.monthlyEmiAmount || "");
    setSegmentDate(new Date().toISOString().split("T")[0]);
    setSegmentMethod("Bank Card");
    setSegmentNotes("");
    setSegmentSyncDailyExpense(true);
    setIsPaySegmentModalOpen(true);
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForSegment || segmentAmount === "" || Number(segmentAmount) <= 0) return;
    setSavingSegment(true);
    try {
      await addLoanRepaymentSegment(
        selectedLoanForSegment.id,
        {
          loanId: selectedLoanForSegment.id,
          amount: Number(segmentAmount),
          paymentDate: segmentDate,
          paymentMethod: segmentMethod,
          notes: segmentNotes.trim() || undefined,
        },
        segmentSyncDailyExpense
      );
      if (activeMemberId) {
        await loadLoans(activeMemberId);
        const allExpenses = await listDailyExpenses();
        setExpenses(allExpenses);
      }
      setIsPaySegmentModalOpen(false);
      setSelectedLoanForSegment(null);
      showToast("Repayment segment recorded successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSegment(false);
    }
  };

  const handleConfirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    try {
      await deleteMemberLoan(loanToDelete.id);
      if (activeMemberId) await loadLoans(activeMemberId);
      setLoanToDelete(null);
      showToast("Loan record removed successfully!");
    } catch (err) {
      console.error(err);
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Daily Expenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and track daily personal expenses, food, and transport with your PIN.
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
                const isSelf = m.relationship === "Self";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    className={`flex flex-col items-center p-4 rounded-xl border transition text-center cursor-pointer group relative ${
                      isSelf
                        ? "border-amber-300 bg-amber-50/30 hover:bg-white hover:border-amber-500 hover:shadow-md"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-400 hover:shadow-md"
                    }`}
                  >
                    {isSelf && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                        You
                      </span>
                    )}

                    <div className="relative">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg uppercase shadow-sm ${
                          isSelf
                            ? "bg-gradient-to-tr from-slate-900 via-slate-800 to-amber-600 text-white"
                            : "bg-gradient-to-tr from-amber-500 to-orange-400 text-white"
                        }`}
                      >
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
                    <div className="text-[11px] text-slate-400">
                      {isSelf ? "Account Owner (Self)" : m.relationship}
                    </div>

                    <span
                      className={`mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        hasPin
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {hasPin ? "Enter PIN to Unlock" : "Set New PIN"}
                    </span>
                  </button>
                );
              })}

              {/* Add Family Member quick shortcut */}
              <Link
                to="/workspace/family"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 hover:bg-white hover:border-amber-400 hover:text-amber-700 transition text-center cursor-pointer group text-slate-500 min-h-[160px]"
              >
                <div className="h-12 w-12 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center mb-2 group-hover:border-amber-400 group-hover:bg-amber-50 transition">
                  <Plus className="h-5 w-5 text-slate-400 group-hover:text-amber-600" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700">
                  Add Family Member
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Invite spouse, child, sibling
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. ACTIVE MEMBER'S EXPENSE DASHBOARD                                      */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Sub Navigation: Daily Expenses vs Loans & Segment Repayments */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Daily Expenses</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  activeTab === "expenses" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
                }`}
              >
                {memberExpenses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("loans")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "loans"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Loans & Borrowed Money</span>
              {loanStats.activeCount > 0 ? (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    activeTab === "loans" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {loanStats.activeCount} Active
                </span>
              ) : (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    activeTab === "loans" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"
                  }`}
                >
                  {loans.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "expenses" ? (
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
              {/* Search Box + Mobile Filter Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search item, merchant..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 shadow-2xs"
                  />
                </div>

                {/* Mobile Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((prev) => !prev)}
                  className={`lg:hidden inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                    mobileFiltersOpen || activeFilterCount > 0
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Time Range & Category Filters - Collapsible on mobile, inline on lg */}
              <div className={`w-full sm:w-auto flex-wrap items-center gap-2 ${mobileFiltersOpen ? "flex" : "hidden lg:flex"}`}>
                {/* Time Range Pills */}
                <div className="inline-flex flex-wrap items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100/90 text-xs w-full sm:w-auto justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setTimeFilter("today")}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-center ${
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
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-center ${
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
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-center ${
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
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-center ${
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-800 shadow-2xs font-medium w-full sm:w-auto"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-between sm:justify-end">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer flex-1 sm:flex-initial"
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
          ) : (
            /* LOANS & SEGMENT REPAYMENTS VIEW */
            <div className="space-y-6">
              {/* Top Loan Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Borrowed
                  </div>
                  <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900">
                    ৳{loanStats.totalBorrowed.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5 text-slate-400" />
                    <span>Principal amount ({loans.length} loans)</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Repaid So Far
                  </div>
                  <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-emerald-600">
                    ৳{loanStats.totalRepaid.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    <span>{loanStats.overallRepaidPct}% Cleared ({loanStats.totalSegments} segments)</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Remaining Debt
                  </div>
                  <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-amber-700">
                    ৳{loanStats.totalRemaining.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Outstanding balance to clear
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Portfolios
                  </div>
                  <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900">
                    {loanStats.activeCount}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                      / {loans.length} total
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {loanStats.settledCount} fully paid & closed
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-2xs">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    <span>Loans & Flexible Segment Repayments</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage car loans, bank borrowings, or private debts with partial segment repayments at different dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddLoanModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Loan / Borrowing</span>
                </button>
              </div>

              {/* Loans List */}
              {loadingLoans ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading loans and repayment segments...
                </div>
              ) : loans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">No Loans or Borrowings Recorded</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Keep track of car loans, personal EMIs, bank borrowings, or loans taken from relatives. Add your repayments in flexible segments whenever you pay.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddLoanModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add First Loan (e.g. Car Loan)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => {
                    const isExpanded = expandedLoanIds.has(loan.id);
                    const totalPrincipal = loan.totalRepayableAmount || loan.principalAmount || 0;
                    const repaidAmount = (loan.repayments || []).reduce(
                      (acc, r) => acc + r.amount,
                      0
                    );
                    const remainingAmount = Math.max(0, totalPrincipal - repaidAmount);
                    const pct =
                      totalPrincipal > 0
                        ? Math.min(100, Math.round((repaidAmount / totalPrincipal) * 100))
                        : 0;
                    const isFullyPaid = loan.status === "PAID_OFF" || remainingAmount <= 0;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
                      >
                        {/* Top row: Title, type, lender, status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">
                                {loan.loanTitle}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {loan.loanType}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isFullyPaid
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {isFullyPaid ? "Fully Repaid" : "Active Repayment"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>
                                Lender / Bank:{" "}
                                <strong className="text-slate-800 font-semibold">{loan.lenderName}</strong>
                              </span>
                              <span>·</span>
                              <span>Started: {loan.startDate}</span>
                              {loan.targetEndDate && (
                                <>
                                  <span>·</span>
                                  <span>Target: {loan.targetEndDate}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {!isFullyPaid && (
                              <button
                                type="button"
                                onClick={() => openPaySegmentModal(loan)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Pay Segment</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleLoanExpanded(loan.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
                            >
                              <span>Segments ({loan.repayments?.length || 0})</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setLoanToDelete(loan)}
                              className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Loan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Financial Figures Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Total Principal
                            </div>
                            <div className="font-mono text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                              ৳{totalPrincipal.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Total Repaid
                            </div>
                            <div className="font-mono text-sm sm:text-base font-bold text-emerald-600 mt-0.5">
                              ৳{repaidAmount.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Remaining Balance
                            </div>
                            <div className="font-mono text-sm sm:text-base font-bold text-amber-700 mt-0.5">
                              ৳{remainingAmount.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Monthly EMI / Rate
                            </div>
                            <div className="text-xs font-semibold text-slate-800 mt-1">
                              {loan.monthlyEmiAmount
                                ? `৳${loan.monthlyEmiAmount.toLocaleString()}/mo`
                                : "Flexible"}
                              {loan.interestRate ? ` (${loan.interestRate}%)` : ""}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              Repayment Progress
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {pct}% ({loan.repayments?.length || 0} segments paid)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isFullyPaid
                                  ? "bg-emerald-500"
                                  : "bg-gradient-to-r from-amber-500 to-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {loan.notes && (
                          <div className="text-xs text-slate-500 italic bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/60">
                            "{loan.notes}"
                          </div>
                        )}

                        {/* Expanded Segments Table */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 pt-3 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Segment Repayment Records
                              </h4>
                              {!isFullyPaid && (
                                <button
                                  type="button"
                                  onClick={() => openPaySegmentModal(loan)}
                                  className="text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                                >
                                  + Record Another Repayment
                                </button>
                              )}
                            </div>

                            {!loan.repayments || loan.repayments.length === 0 ? (
                              <div className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                                No repayment segments logged yet. Click "Pay Segment" to add installment payments.
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                                    <tr>
                                      <th className="px-3.5 py-2">Payment Date</th>
                                      <th className="px-3.5 py-2 font-mono">Amount Repaid</th>
                                      <th className="px-3.5 py-2">Method</th>
                                      <th className="px-3.5 py-2">Notes / Details</th>
                                      <th className="px-3.5 py-2 text-right">Logged At</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {loan.repayments.map((segment: LoanRepaymentSegment, idx: number) => (
                                      <tr key={segment.id || idx} className="hover:bg-slate-50/60">
                                        <td className="px-3.5 py-2 font-medium text-slate-900">
                                          {segment.paymentDate}
                                        </td>
                                        <td className="px-3.5 py-2 font-mono font-bold text-emerald-600">
                                          ৳{segment.amount.toLocaleString()}
                                        </td>
                                        <td className="px-3.5 py-2">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                            {segment.paymentMethod}
                                          </span>
                                        </td>
                                        <td className="px-3.5 py-2 text-slate-600">
                                          {segment.notes || `Installment #${idx + 1}`}
                                        </td>
                                        <td className="px-3.5 py-2 text-right text-[11px] text-slate-400 font-mono">
                                          {segment.createdAt
                                            ? new Date(segment.createdAt).toLocaleDateString()
                                            : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

      {/* ========================================================================= */}
      {/* 7. MODAL: ADD LOAN / BORROWING                                            */}
      {/* ========================================================================= */}
      {isAddLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add Loan / Borrowing Portfolio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recording for <span className="font-semibold">{activeMember?.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLoanModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loan / Debt Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Car Loan (Honda Civic 2020), BRAC Personal Loan"
                  value={loanTitle}
                  onChange={(e) => setLoanTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lender / Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Bank, Uncle Rahim"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loan Type *
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as MemberLoan["loanType"])}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  >
                    <option value="Car Loan">Car Loan</option>
                    <option value="Home Loan">Home Loan</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Business Loan">Business Loan</option>
                    <option value="Borrowed from Family/Friend">Borrowed from Family/Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Total Principal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Principal Borrowed (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500000"
                    value={totalPrincipal}
                    onChange={(e) => setTotalPrincipal(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Monthly EMI & Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly EMI / Installment (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 25000 (Optional)"
                    value={monthlyEmiAmount}
                    onChange={(e) => setMonthlyEmiAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interest Rate % (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 9.5"
                    value={interestRatePercent}
                    onChange={(e) => setInterestRatePercent(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start / Borrow Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Payoff Date
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 36-month loan duration, 10th of every month payment deadline"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLoanModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLoan}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {savingLoan ? "Saving..." : "Create Loan Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: PAY REPAYMENT SEGMENT                                           */}
      {/* ========================================================================= */}
      {isPaySegmentModalOpen && selectedLoanForSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                  ৳
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Record Repayment Segment
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedLoanForSegment.loanTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaySegmentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Loan Balance Summary */}
            {(() => {
              const totalP =
                selectedLoanForSegment.totalRepayableAmount ||
                selectedLoanForSegment.principalAmount ||
                0;
              const totalR = (selectedLoanForSegment.repayments || []).reduce(
                (sum, r) => sum + r.amount,
                0
              );
              const totalRem = Math.max(0, totalP - totalR);
              return (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                      Remaining Debt
                    </span>
                    <span className="font-mono font-bold text-amber-700 text-sm">
                      ৳{totalRem.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">
                      Total Repaid So Far
                    </span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">
                      ৳{totalR.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSaveSegment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Segment Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    autoFocus
                    min="1"
                    placeholder="e.g. 25000"
                    value={segmentAmount}
                    onChange={(e) => setSegmentAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Repayment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={segmentDate}
                    onChange={(e) => setSegmentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={segmentMethod}
                    onChange={(e) => setSegmentMethod(e.target.value as DailyExpensePaymentMethod)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Segment Note / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Installment #4, Partial settlement from Eid bonus"
                  value={segmentNotes}
                  onChange={(e) => setSegmentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              {/* Sync to Daily Expenses checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={segmentSyncDailyExpense}
                  onChange={(e) => setSegmentSyncDailyExpense(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Sync to Daily Expenses Ledger
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Automatically logs this repayment into your monthly expense breakdown under "Loan & EMI Repayment".
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaySegmentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSegment}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {savingSegment ? "Recording..." : "Confirm Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: DELETE LOAN CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Loan Record?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-800">
                    {loanToDelete.loanTitle} (৳
                    {(
                      loanToDelete.totalRepayableAmount ||
                      loanToDelete.principalAmount ||
                      0
                    ).toLocaleString()}
                    )
                  </span>{" "}
                  along with all {loanToDelete.repayments?.length || 0} repayment segments?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoanToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoan}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete Loan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
