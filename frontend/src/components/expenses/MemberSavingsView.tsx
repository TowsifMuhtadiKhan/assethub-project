import { useState, useEffect, useMemo } from "react";
import {
  PiggyBank,
  Plus,
  Search,
  Check,
  X,
  Trash2,
  Edit2,
  TrendingUp,
  Landmark,
  Coins,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import {
  listMemberSavings,
  createMemberSavings,
  updateMemberSavings,
  deleteMemberSavings,
  addSavingsDepositLog,
  deleteSavingsDepositLog,
} from "../../services/dailyExpenseService";
import type {
  FamilyMember,
  MemberSavings,
  MemberSavingsType,
  MemberSavingsStatus,
  DailyExpensePaymentMethod,
} from "../../types";

type MemberSavingsViewProps = {
  activeMember: FamilyMember;
  onToast: (msg: string) => void;
  onOpenAddModalDirect?: boolean;
  onResetOpenAddModal?: () => void;
};

const PAYMENT_METHODS: DailyExpensePaymentMethod[] = [
  "Bank Card",
  "bKash",
  "Nagad",
  "Cash",
  "Rocket",
  "Other",
];

const POPULAR_BANKS = [
  "BRAC Bank",
  "City Bank",
  "Eastern Bank Ltd (EBL)",
  "Dutch-Bangla Bank (DBBL)",
  "Islami Bank Bangladesh",
  "Shahjalal Islami Bank",
  "Mutual Trust Bank (MTB)",
  "Standard Chartered (SCB)",
  "HSBC Bangladesh",
  "Sonali Bank",
  "IDLC Finance",
  "IPDC Finance",
  "National Savings Bureau (Sanchayapatra)",
  "bKash Savings (IDLC/City Bank/BRAC)",
];

export function MemberSavingsView({
  activeMember,
  onToast,
  onOpenAddModalDirect,
  onResetOpenAddModal,
}: MemberSavingsViewProps) {
  const [savingsList, setSavingsList] = useState<MemberSavings[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | MemberSavingsType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | MemberSavingsStatus>("ACTIVE");

  // Add / Edit Scheme Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSavings, setEditingSavings] = useState<MemberSavings | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<MemberSavingsType>("DPS");
  const [formInstitution, setFormInstitution] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formMonthlyInstallment, setFormMonthlyInstallment] = useState<number | "">("");
  const [formPrincipalAmount, setFormPrincipalAmount] = useState<number | "">("");
  const [formTenureYears, setFormTenureYears] = useState<number | "">(3);
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formMaturityDate, setFormMaturityDate] = useState("");
  const [formInterestRate, setFormInterestRate] = useState<number | "">(8.5);
  const [formMaturityAmount, setFormMaturityAmount] = useState<number | "">("");
  const [formDepositDayOfMonth, setFormDepositDayOfMonth] = useState<number | "">(10);
  const [formProfitPayout, setFormProfitPayout] = useState<"On Maturity" | "Monthly" | "Quarterly" | "Half-Yearly">("On Maturity");
  const [formNomineeName, setFormNomineeName] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formInitialDepositDone, setFormInitialDepositDone] = useState(true);

  // Deposit Installment Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedSavingsForDeposit, setSelectedSavingsForDeposit] = useState<MemberSavings | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [depositMethod, setDepositMethod] = useState<DailyExpensePaymentMethod>("Bank Card");
  const [depositNotes, setDepositNotes] = useState("");
  const [depositSyncExpenses, setDepositSyncExpenses] = useState(true);
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Installment History Drawer / Modal
  const [viewingHistorySavings, setViewingHistorySavings] = useState<MemberSavings | null>(null);

  // Delete Confirmation State
  const [savingsToDelete, setSavingsToDelete] = useState<MemberSavings | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load savings for active member
  useEffect(() => {
    loadSavingsData();
  }, [activeMember.id]);

  useEffect(() => {
    if (onOpenAddModalDirect) {
      openAddModal();
      onResetOpenAddModal?.();
    }
  }, [onOpenAddModalDirect]);

  const loadSavingsData = async () => {
    try {
      setLoading(true);
      const data = await listMemberSavings(activeMember.id, activeMember.fullName);
      setSavingsList(data);
    } catch (err) {
      console.warn("Failed to load savings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const openAddModal = (presetType?: MemberSavingsType) => {
    setEditingSavings(null);
    setFormTitle("");
    const t = presetType || "DPS";
    setFormType(t);
    setFormInstitution("");
    setFormAccountNumber("");
    setFormMonthlyInstallment(t === "DPS" ? 5000 : "");
    setFormPrincipalAmount(t === "FDR" ? 100000 : "");
    setFormTenureYears(t === "DPS" ? 3 : 1);
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormMaturityDate("");
    setFormInterestRate(t === "DPS" ? 8.5 : 9.0);
    setFormMaturityAmount("");
    setFormDepositDayOfMonth(10);
    setFormProfitPayout("On Maturity");
    setFormNomineeName("");
    setFormNotes("");
    setFormInitialDepositDone(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: MemberSavings) => {
    setEditingSavings(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormInstitution(item.institutionName);
    setFormAccountNumber(item.accountNumber || "");
    setFormMonthlyInstallment(item.monthlyInstallment || "");
    setFormPrincipalAmount(item.principalAmount || "");
    setFormTenureYears(item.tenureYears || "");
    setFormStartDate(item.startDate);
    setFormMaturityDate(item.maturityDate || "");
    setFormInterestRate(item.interestRate || "");
    setFormMaturityAmount(item.maturityAmount || "");
    setFormDepositDayOfMonth(item.depositDayOfMonth || "");
    setFormProfitPayout(item.profitPayoutFrequency || "On Maturity");
    setFormNomineeName(item.nomineeName || "");
    setFormNotes(item.notes || "");
    setIsModalOpen(true);
  };

  // Auto-calculate maturity date when tenure or start date changes
  useEffect(() => {
    if (formStartDate && formTenureYears && typeof formTenureYears === "number") {
      try {
        const start = new Date(formStartDate);
        if (!isNaN(start.getTime())) {
          start.setFullYear(start.getFullYear() + formTenureYears);
          setFormMaturityDate(start.toISOString().split("T")[0]);
        }
      } catch {}
    }
  }, [formStartDate, formTenureYears]);

  // Auto-estimate maturity amount for DPS if left blank
  useEffect(() => {
    if (formType === "DPS" && typeof formMonthlyInstallment === "number" && typeof formTenureYears === "number") {
      const totalMonths = formTenureYears * 12;
      const totalPrincipal = formMonthlyInstallment * totalMonths;
      const rate = typeof formInterestRate === "number" ? formInterestRate / 100 : 0.08;
      // Approximate simple interest for monthly recurring deposit: P * n + P * n(n+1)/24 * r
      const interestEst = formMonthlyInstallment * ((totalMonths * (totalMonths + 1)) / 24) * rate;
      const approxTotal = Math.round(totalPrincipal + interestEst);
      if (!editingSavings && !formMaturityAmount) {
        setFormMaturityAmount(approxTotal);
      }
    } else if (formType === "FDR" && typeof formPrincipalAmount === "number" && typeof formTenureYears === "number") {
      const rate = typeof formInterestRate === "number" ? formInterestRate / 100 : 0.09;
      const approxTotal = Math.round(formPrincipalAmount * (1 + rate * formTenureYears));
      if (!editingSavings && !formMaturityAmount) {
        setFormMaturityAmount(approxTotal);
      }
    }
  }, [formType, formMonthlyInstallment, formPrincipalAmount, formTenureYears, formInterestRate]);

  // Save Add / Edit
  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Please enter a title or scheme name");
      return;
    }
    if (!formInstitution.trim()) {
      alert("Please enter or select a bank or financial institution");
      return;
    }

    try {
      setSavingForm(true);
      if (editingSavings) {
        const updated = await updateMemberSavings(editingSavings.id, {
          title: formTitle.trim(),
          type: formType,
          institutionName: formInstitution.trim(),
          accountNumber: formAccountNumber.trim() || undefined,
          monthlyInstallment: typeof formMonthlyInstallment === "number" ? formMonthlyInstallment : undefined,
          principalAmount: typeof formPrincipalAmount === "number" ? formPrincipalAmount : undefined,
          tenureYears: typeof formTenureYears === "number" ? formTenureYears : undefined,
          tenureMonths: typeof formTenureYears === "number" ? formTenureYears * 12 : undefined,
          startDate: formStartDate,
          maturityDate: formMaturityDate || undefined,
          interestRate: typeof formInterestRate === "number" ? formInterestRate : undefined,
          maturityAmount: typeof formMaturityAmount === "number" ? formMaturityAmount : undefined,
          depositDayOfMonth: typeof formDepositDayOfMonth === "number" ? formDepositDayOfMonth : undefined,
          profitPayoutFrequency: formProfitPayout,
          nomineeName: formNomineeName.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });

        setSavingsList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        onToast(`Updated "${formTitle}" successfully!`);
      } else {
        const created = await createMemberSavings(
          {
            familyMemberId: activeMember.id,
            familyMemberName: activeMember.fullName,
            title: formTitle.trim(),
            type: formType,
            institutionName: formInstitution.trim(),
            accountNumber: formAccountNumber.trim() || undefined,
            monthlyInstallment: typeof formMonthlyInstallment === "number" ? formMonthlyInstallment : undefined,
            principalAmount: typeof formPrincipalAmount === "number" ? formPrincipalAmount : undefined,
            tenureYears: typeof formTenureYears === "number" ? formTenureYears : undefined,
            tenureMonths: typeof formTenureYears === "number" ? formTenureYears * 12 : undefined,
            startDate: formStartDate,
            maturityDate: formMaturityDate || undefined,
            interestRate: typeof formInterestRate === "number" ? formInterestRate : undefined,
            maturityAmount: typeof formMaturityAmount === "number" ? formMaturityAmount : undefined,
            depositDayOfMonth: typeof formDepositDayOfMonth === "number" ? formDepositDayOfMonth : undefined,
            profitPayoutFrequency: formProfitPayout,
            status: "ACTIVE",
            nomineeName: formNomineeName.trim() || undefined,
            notes: formNotes.trim() || undefined,
          },
          formType === "DPS" && formInitialDepositDone
        );

        setSavingsList((prev) => [created, ...prev]);
        onToast(`Added new ${formType}: "${formTitle}"!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error saving scheme: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingForm(false);
    }
  };

  // Open Deposit Modal for DPS
  const openDepositModal = (scheme: MemberSavings) => {
    setSelectedSavingsForDeposit(scheme);
    setDepositAmount(scheme.monthlyInstallment || "");
    setDepositDate(new Date().toISOString().split("T")[0]);
    setDepositMethod("Bank Card");
    const nextNo = (scheme.depositLogs?.length || 0) + 1;
    setDepositNotes(`Installment #${nextNo}`);
    setDepositSyncExpenses(true);
    setIsDepositModalOpen(true);
  };

  // Submit Deposit
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSavingsForDeposit || typeof depositAmount !== "number" || depositAmount <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    try {
      setSavingDeposit(true);
      const nextNo = (selectedSavingsForDeposit.depositLogs?.length || 0) + 1;
      const updated = await addSavingsDepositLog(
        selectedSavingsForDeposit.id,
        {
          installmentNo: nextNo,
          amount: depositAmount,
          depositDate: depositDate || new Date().toISOString().split("T")[0],
          paymentMethod: depositMethod,
          notes: depositNotes.trim() || `Installment #${nextNo}`,
        },
        depositSyncExpenses,
        activeMember.fullName
      );

      setSavingsList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingHistorySavings?.id === updated.id) {
        setViewingHistorySavings(updated);
      }

      setIsDepositModalOpen(false);
      onToast(`Logged installment #${nextNo} (৳${depositAmount.toLocaleString()}) for ${selectedSavingsForDeposit.title}!`);
    } catch (err: any) {
      alert(`Error recording installment: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingDeposit(false);
    }
  };

  // Delete Scheme
  const handleDeleteScheme = async () => {
    if (!savingsToDelete) return;
    try {
      setDeleting(true);
      await deleteMemberSavings(savingsToDelete.id);
      setSavingsList((prev) => prev.filter((s) => s.id !== savingsToDelete.id));
      if (viewingHistorySavings?.id === savingsToDelete.id) {
        setViewingHistorySavings(null);
      }
      setSavingsToDelete(null);
      onToast(`Deleted scheme "${savingsToDelete.title}"`);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  // Delete Individual Installment from History
  const handleDeleteDepositLog = async (savingsId: string, logId: string) => {
    if (!confirm("Delete this deposit installment entry?")) return;
    try {
      const updated = await deleteSavingsDepositLog(savingsId, logId);
      setSavingsList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingHistorySavings?.id === updated.id) {
        setViewingHistorySavings(updated);
      }
      onToast("Deposit installment deleted");
    } catch (err: any) {
      alert(`Could not delete: ${err?.message || "Unknown error"}`);
    }
  };

  // Toggle status (Active / Matured / Closed)
  const handleToggleStatus = async (item: MemberSavings, newStatus: MemberSavingsStatus) => {
    try {
      const updated = await updateMemberSavings(item.id, { status: newStatus });
      setSavingsList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      onToast(`Marked "${item.title}" as ${newStatus}`);
    } catch (err: any) {
      alert(`Could not update status: ${err?.message}`);
    }
  };

  // Calculated Portfolio Statistics
  const portfolioStats = useMemo(() => {
    let totalDeposited = 0;
    let totalExpectedMaturity = 0;
    let monthlyDPSCommitment = 0;
    let activeDPSCount = 0;
    let activeFDRCount = 0;
    let soonestMaturity: { title: string; date: string; daysLeft: number } | null = null;

    const today = new Date();

    for (const s of savingsList) {
      if (s.status === "ACTIVE") {
        if (s.type === "DPS") {
          activeDPSCount++;
          if (s.monthlyInstallment) monthlyDPSCommitment += s.monthlyInstallment;
          const installmentsPaid = (s.depositLogs || []).reduce((sum, d) => sum + d.amount, 0);
          totalDeposited += installmentsPaid;
        } else {
          activeFDRCount++;
          if (s.principalAmount) totalDeposited += s.principalAmount;
        }

        if (s.maturityAmount) {
          totalExpectedMaturity += s.maturityAmount;
        } else if (s.principalAmount) {
          totalExpectedMaturity += s.principalAmount;
        }

        if (s.maturityDate) {
          const matDate = new Date(s.maturityDate);
          const diffDays = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (!soonestMaturity || (diffDays > 0 && diffDays < soonestMaturity.daysLeft)) {
            soonestMaturity = {
              title: s.title,
              date: s.maturityDate,
              daysLeft: diffDays,
            };
          }
        }
      }
    }

    return {
      totalDeposited,
      totalExpectedMaturity,
      monthlyDPSCommitment,
      activeDPSCount,
      activeFDRCount,
      soonestMaturity,
    };
  }, [savingsList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return savingsList.filter((item) => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchBank = item.institutionName.toLowerCase().includes(q);
        const matchAccount = (item.accountNumber || "").toLowerCase().includes(q);
        if (!matchTitle && !matchBank && !matchAccount) return false;
      }
      return true;
    });
  }, [savingsList, typeFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ===================================================================== */}
      {/* 1. TOP PORTFOLIO STATS STRIP                                          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Deposited / Capital */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Total Deposited
            </span>
            <PiggyBank className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 truncate">
            ৳{portfolioStats.totalDeposited.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            Capital invested across active schemes
          </div>
        </div>

        {/* Expected Maturity Value */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Expected Maturity
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-indigo-700 truncate">
            ৳{portfolioStats.totalExpectedMaturity.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            Total returns at full maturity
          </div>
        </div>

        {/* Monthly DPS Commitments */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Monthly DPS
            </span>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 truncate">
            ৳{portfolioStats.monthlyDPSCommitment.toLocaleString()}
            <span className="text-xs font-medium text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            {portfolioStats.activeDPSCount} active monthly installment{portfolioStats.activeDPSCount === 1 ? "" : "s"}
          </div>
        </div>

        {/* Active Portfolios & Next Maturity */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Active Schemes
            </span>
            <Landmark className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900">
            {portfolioStats.activeDPSCount + portfolioStats.activeFDRCount}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              ({portfolioStats.activeDPSCount} DPS, {portfolioStats.activeFDRCount} FDR)
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
            {portfolioStats.soonestMaturity ? (
              <span>Next: {portfolioStats.soonestMaturity.daysLeft > 0 ? `in ${portfolioStats.soonestMaturity.daysLeft}d` : "Matured"}</span>
            ) : (
              "No upcoming maturities"
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. FILTER BAR & QUICK ADD BUTTONS                                     */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheme, bank, account #..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Scheme Type Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs">
            {(["ALL", "DPS", "FDR", "Sanchayapatra"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs whitespace-nowrap ${
                  typeFilter === t
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                }`}
              >
                {t === "ALL" ? "All Schemes" : t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            {(["ACTIVE", "ALL", "MATURED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st === "ACTIVE" ? "Active" : st === "ALL" ? "All" : "Matured"}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Add DPS / FDR */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => openAddModal("DPS")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add DPS / FDR</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SCHEMES LISTING                                                    */}
      {/* ===================================================================== */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading DPS & Fixed Deposit schemes...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {savingsList.length === 0 ? "No DPS or FDR Added Yet" : "No Schemes Match Your Filters"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {savingsList.length === 0
                ? "Track monthly DPS recurring deposits, bank FDRs, and National Savings Certificates (Sanchayapatra) with automated maturity returns and installment logs."
                : "Try clearing your search query or selecting 'All' in the filters above."}
            </p>
          </div>
          {savingsList.length === 0 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => openAddModal("DPS")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First DPS</span>
              </button>
              <button
                type="button"
                onClick={() => openAddModal("FDR")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First FDR</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredList.map((item) => {
            const isDPS = item.type === "DPS";
            const totalLogs = item.depositLogs || [];
            const installmentsPaidCount = totalLogs.length;
            const totalDeposited = isDPS
              ? totalLogs.reduce((sum, d) => sum + d.amount, 0)
              : item.principalAmount || 0;

            const totalTenureMonths = item.tenureMonths || (item.tenureYears ? item.tenureYears * 12 : 0);
            const progressPercent = isDPS && totalTenureMonths > 0
              ? Math.min(100, Math.round((installmentsPaidCount / totalTenureMonths) * 100))
              : 100;

            // Remaining Days calculation for FDR
            let daysRemaining: number | null = null;
            if (item.maturityDate) {
              const diffMs = new Date(item.maturityDate).getTime() - new Date().getTime();
              daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition space-y-3.5"
              >
                {/* Header Row: Title, Type Badge, Bank & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.type === "DPS"
                            ? "bg-indigo-100 text-indigo-800"
                            : item.type === "FDR"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {item.type}
                      </span>

                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        {item.title}
                      </h3>

                      {item.status === "MATURED" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item, "CLOSED")}
                          title="Click to mark as Encashed / Closed"
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Matured
                        </button>
                      ) : item.status === "CLOSED" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item, "ACTIVE")}
                          title="Click to reopen as Active"
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                        >
                          Closed / Encashed
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item, "MATURED")}
                          title="Click to mark as Matured"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                        >
                          Active
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Landmark className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.institutionName}</span>
                      </div>
                      {item.accountNumber && (
                        <span className="font-mono text-[11px] text-slate-400">
                          A/C: {item.accountNumber}
                        </span>
                      )}
                      {item.nomineeName && (
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Nominee: {item.nomineeName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {isDPS && item.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => openDepositModal(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Deposit Installment</span>
                      </button>
                    )}

                    {isDPS && (
                      <button
                        type="button"
                        onClick={() => setViewingHistorySavings(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        title="View Installment History"
                      >
                        <Receipt className="h-3.5 w-3.5 text-slate-500" />
                        <span className="hidden sm:inline">History ({installmentsPaidCount})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit Scheme"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSavingsToDelete(item)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Scheme"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Metric 1 */}
                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      {isDPS ? "Monthly Installment" : "Principal Deposit"}
                    </div>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                      {isDPS
                        ? `৳${(item.monthlyInstallment || 0).toLocaleString()}/mo`
                        : `৳${(item.principalAmount || 0).toLocaleString()}`}
                    </div>
                    {isDPS && item.depositDayOfMonth && (
                      <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                        Due: {item.depositDayOfMonth}th of month
                      </div>
                    )}
                  </div>

                  {/* Metric 2: Total Deposited So Far */}
                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Total Deposited So Far
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                      ৳{totalDeposited.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {isDPS
                        ? `${installmentsPaidCount} of ${totalTenureMonths} months paid`
                        : "Lump sum deposited"}
                    </div>
                  </div>

                  {/* Metric 3: Maturity Value & Profit */}
                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Expected Maturity
                    </div>
                    <div className="text-sm font-bold font-mono text-indigo-700 mt-0.5">
                      {item.maturityAmount ? `৳${item.maturityAmount.toLocaleString()}` : "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {item.interestRate ? `@ ${item.interestRate}% profit/interest` : "Fixed term"}
                    </div>
                  </div>

                  {/* Metric 4: Tenure & Maturity Date */}
                  <div className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Maturity Timeline
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {item.maturityDate || `${item.tenureYears || 0} Years`}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {daysRemaining !== null ? (
                        daysRemaining > 0 ? (
                          <span className="text-indigo-600 font-medium">{daysRemaining} days left</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Matured on {item.maturityDate}</span>
                        )
                      ) : (
                        `Started ${item.startDate}`
                      )}
                    </div>
                  </div>
                </div>

                {/* DPS Progress Bar */}
                {isDPS && totalTenureMonths > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">
                        DPS Progress: {installmentsPaidCount} / {totalTenureMonths} Months
                      </span>
                      <span className="font-bold text-slate-800 text-[11px] font-mono">
                        {progressPercent}% Complete
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes or instructions */}
                {item.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl">
                    "{item.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. MODAL: ADD / EDIT DPS & FDR SCHEME                                 */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingSavings ? `Edit ${editingSavings.title}` : "Add Savings / Term Deposit"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    DPS monthly recurring, fixed FDR, or Sanchayapatra for {activeMember.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScheme} className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheme Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["DPS", "FDR", "Sanchayapatra"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
                        formType === t
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {t === "DPS" ? "DPS (Monthly)" : t === "FDR" ? "FDR (Fixed)" : "Sanchayapatra"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheme Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={formType === "DPS" ? "Child Education DPS" : "Emergency Fund FDR"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    list="popular-banks"
                    value={formInstitution}
                    onChange={(e) => setFormInstitution(e.target.value)}
                    placeholder="e.g. BRAC Bank, City Bank"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <datalist id="popular-banks">
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Account / Certificate Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account or Certificate # (Optional)
                </label>
                <input
                  type="text"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                  placeholder="e.g. DPS-019284 / FDR-84920"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white font-mono"
                />
              </div>

              {/* Amounts & Tenure based on Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {formType === "DPS" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Installment (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={100}
                      value={formMonthlyInstallment}
                      onChange={(e) => setFormMonthlyInstallment(e.target.value ? Number(e.target.value) : "")}
                      placeholder="5000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Principal Deposit (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={1000}
                      value={formPrincipalAmount}
                      onChange={(e) => setFormPrincipalAmount(e.target.value ? Number(e.target.value) : "")}
                      placeholder="100000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tenure (Years)
                  </label>
                  <select
                    value={formTenureYears}
                    onChange={(e) => setFormTenureYears(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value={1}>1 Year (12 mo)</option>
                    <option value={2}>2 Years (24 mo)</option>
                    <option value={3}>3 Years (36 mo)</option>
                    <option value={5}>5 Years (60 mo)</option>
                    <option value={7}>7 Years (84 mo)</option>
                    <option value={10}>10 Years (120 mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profit / Interest %
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={formInterestRate}
                    onChange={(e) => setFormInterestRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="8.5"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Start & Maturity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening / Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Maturity Return (৳)
                  </label>
                  <input
                    type="number"
                    value={formMaturityAmount}
                    onChange={(e) => setFormMaturityAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="225000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>

              {/* DPS Due Day or FDR Payout */}
              {formType === "DPS" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Installment Due Day of Month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formDepositDayOfMonth}
                    onChange={(e) => setFormDepositDayOfMonth(e.target.value ? Number(e.target.value) : "")}
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Helps you remember to deposit before late fees or penalties occur.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profit Payout Frequency
                  </label>
                  <select
                    value={formProfitPayout}
                    onChange={(e) => setFormProfitPayout(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="On Maturity">On Maturity (Cumulative)</option>
                    <option value="Monthly">Monthly Payout</option>
                    <option value="Quarterly">Quarterly Payout (3 Months)</option>
                    <option value="Half-Yearly">Half-Yearly Payout (6 Months)</option>
                  </select>
                </div>
              )}

              {/* Initial Installment Checkbox for New DPS */}
              {!editingSavings && formType === "DPS" && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formInitialDepositDone}
                    onChange={(e) => setFormInitialDepositDone(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs text-emerald-950">
                    <span className="font-bold">Mark First Installment (#1) as Paid</span>
                    <span className="block text-[10px] text-emerald-800">
                      Logs the initial deposit upon opening the DPS account.
                    </span>
                  </div>
                </label>
              )}

              {/* Nominee & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominee Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formNomineeName}
                    onChange={(e) => setFormNomineeName(e.target.value)}
                    placeholder="e.g. Spouse / Mother"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Auto-debit from salary A/C"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingForm ? "Saving..." : editingSavings ? "Save Changes" : "Save Scheme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. MODAL: LOG MONTHLY DPS INSTALLMENT                                 */}
      {/* ===================================================================== */}
      {isDepositModalOpen && selectedSavingsForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Deposit Monthly Installment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedSavingsForDeposit.title} • Installment #{(selectedSavingsForDeposit.depositLogs?.length || 0) + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Installment Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="5000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-bold font-mono text-emerald-700 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deposit Notes (Optional)
                </label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder={`e.g. Installment #${(selectedSavingsForDeposit.depositLogs?.length || 0) + 1} paid via bank transfer`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Sync into Daily Expenses checkbox */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={depositSyncExpenses}
                  onChange={(e) => setDepositSyncExpenses(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs text-indigo-950">
                  <span className="font-bold">Log as Expense in Daily Expenses</span>
                  <span className="block text-[10px] text-indigo-800">
                    Automatically records this deposit under "DPS & Savings Deposit" so monthly expenses match bank outlays.
                  </span>
                </div>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDeposit}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                >
                  {savingDeposit ? "Saving..." : "Confirm Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. MODAL: INSTALLMENT HISTORY DRAWER                                  */}
      {/* ===================================================================== */}
      {viewingHistorySavings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Installment Deposit History
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {viewingHistorySavings.title} ({viewingHistorySavings.institutionName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistorySavings(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {(viewingHistorySavings.depositLogs || []).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No installment deposits logged yet. Tap "Deposit Installment" to record one.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200/80 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200/80">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingHistorySavings.depositLogs || []).map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">
                            #{log.installmentNo || idx + 1}
                          </td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                            {log.depositDate}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-700">
                            ৳{log.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {log.paymentMethod}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[11px] truncate max-w-[150px]">
                            {log.notes || "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteDepositLog(viewingHistorySavings.id, log.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <div className="text-slate-500">
                Total Deposited:{" "}
                <strong className="text-emerald-700 font-mono">
                  ৳{(viewingHistorySavings.depositLogs || [])
                    .reduce((sum, d) => sum + d.amount, 0)
                    .toLocaleString()}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistorySavings(null)}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. MODAL: DELETE CONFIRMATION                                         */}
      {/* ===================================================================== */}
      {savingsToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Scheme?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong>"{savingsToDelete.title}"</strong> ({savingsToDelete.institutionName})?
                This will remove the scheme and its entire deposit history.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSavingsToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteScheme}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Scheme"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
