import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
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
  Pencil,
  ExternalLink,
  Clock,
  CreditCard,
  Banknote,
  Filter,
  LineChart,
  Table,
  CalendarRange,
  CheckCircle2,
  Circle,
  Landmark,
  ChevronDown,
  ChevronRight,
  Car,
  Bike,
  Smartphone,
  Laptop,
  Zap,
  UtensilsCrossed,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Film,
  Home,
} from "lucide-react";
import { FormControl, Select, MenuItem } from "@mui/material";
import { useLanguage } from "../context/LanguageContext";
import { listFamilyMembersWithSelf, getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import {
  listDailyExpenses,
  createDailyExpense,
  updateDailyExpense,
  deleteDailyExpense,
  hasMemberPin,
  setMemberPin,
  verifyMemberPin,
  loadCloudMemberPins,
  listMemberLoans,
  createMemberLoan,
  updateMemberLoan,
  addLoanRepaymentSegment,
  updateLoanRepaymentSegment,
  deleteLoanRepaymentSegment,
  deleteMemberLoan,
  deleteMemberSavings,
  listMemberSavings,
  generateEmiInstallments,
  toggleLoanSegmentPayment,
} from "../services/dailyExpenseService";
import type {
  DailyExpense,
  DailyExpenseCategory,
  DailyExpensePaymentMethod,
  FamilyMember,
  MemberLoan,
  LoanRepaymentSegment,
  MemberSavings,
} from "../types";
import { MemberSavingsView } from "../components/expenses/MemberSavingsView";
import { ExpensesSkeleton } from "../components/common/LoadingStates";
import { CategoryTrendModal } from "../components/expenses/CategoryTrendModal";
import { Chip, type ChipColor } from "../components/common/Chip";
import { TableRowActions } from "../components/common/TableRowActions";
import { ViewModeToggle } from "../components/common";

const CATEGORIES: { label: DailyExpenseCategory; color: string; bg: string; chipColor: ChipColor }[] = [
  { label: "Food & Dining", color: "text-amber-700", bg: "bg-amber-50 border-amber-200/70", chipColor: "amber" },
  { label: "Groceries & Market", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200/70", chipColor: "emerald" },
  { label: "Transport & Commute", color: "text-blue-700", bg: "bg-blue-50 border-blue-200/70", chipColor: "blue" },
  { label: "Shopping & Personal", color: "text-purple-700", bg: "bg-purple-50 border-purple-200/70", chipColor: "purple" },
  { label: "Bills & Utilities", color: "text-rose-700", bg: "bg-rose-50 border-rose-200/70", chipColor: "rose" },
  { label: "Healthcare & Medicine", color: "text-rose-700", bg: "bg-rose-50 border-rose-200/70", chipColor: "rose" },
  { label: "Education", color: "text-blue-700", bg: "bg-blue-50 border-blue-200/70", chipColor: "blue" },
  { label: "Entertainment", color: "text-purple-700", bg: "bg-purple-50 border-purple-200/70", chipColor: "purple" },
  { label: "Family & Home", color: "text-teal-700", bg: "bg-teal-50 border-teal-200/70", chipColor: "teal" },
  { label: "Loan & EMI Repayment", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200/70", chipColor: "emerald" },
  { label: "DPS & Savings Deposit", color: "text-teal-700", bg: "bg-teal-50 border-teal-200/70", chipColor: "teal" },
  { label: "Others", color: "text-slate-700", bg: "bg-slate-100 border-slate-200/70", chipColor: "slate" },
];

const PAYMENT_METHODS: DailyExpensePaymentMethod[] = [
  "Cash",
  "bKash",
  "Nagad",
  "Bank Card",
  "Rocket",
  "Other",
];

export function BkashLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
      <rect width="24" height="24" rx="5" fill="#E2136E" />
      <path
        d="M5.5 13.5L11 7.5L18.5 9L13.5 13.5L18.5 15L9 18.5L10.5 14L5.5 13.5Z"
        fill="white"
      />
    </svg>
  );
}

export function NagadLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
      <rect width="24" height="24" rx="5" fill="#F7941D" />
      <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="2.5" strokeDasharray="32 10" />
      <circle cx="12" cy="12" r="2.5" fill="white" />
    </svg>
  );
}

export function RocketLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
      <rect width="24" height="24" rx="5" fill="#8C3494" />
      <path
        d="M12 5C12 5 15.5 7.5 15.5 11.5L17 13L15.5 13.5L14.5 16L13.5 14.5L12 15L10.5 14.5L9.5 16L8.5 13.5L7 13L8.5 11.5C8.5 7.5 12 5 12 5Z"
        fill="white"
      />
      <circle cx="12" cy="10" r="1.5" fill="#8C3494" />
    </svg>
  );
}

export function CashLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`${className} shrink-0 rounded-md bg-emerald-600 flex items-center justify-center text-white`}>
      <Banknote className="w-3.5 h-3.5" />
    </div>
  );
}

export function CardLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`${className} shrink-0 rounded-md bg-slate-800 flex items-center justify-center text-white`}>
      <CreditCard className="w-3.5 h-3.5" />
    </div>
  );
}

export function OtherPaymentLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`${className} shrink-0 rounded-md bg-slate-400 flex items-center justify-center text-white`}>
      <Wallet className="w-3.5 h-3.5" />
    </div>
  );
}

export function getPaymentMethodIcon(method: DailyExpensePaymentMethod) {
  switch (method) {
    case "bKash":
      return <BkashLogo className="w-5 h-5" />;
    case "Nagad":
      return <NagadLogo className="w-5 h-5" />;
    case "Rocket":
      return <RocketLogo className="w-5 h-5" />;
    case "Cash":
      return <CashLogo className="w-5 h-5" />;
    case "Bank Card":
      return <CardLogo className="w-5 h-5" />;
    default:
      return <OtherPaymentLogo className="w-5 h-5" />;
  }
}

function normalizeNumericInput(val: string): string {
  if (!val) return "";
  const banglaDigits = "০১২৩৪৫৬৭৮৯";
  let cleaned = val.replace(/[০-৯]/g, (d) => banglaDigits.indexOf(d).toString());
  cleaned = cleaned.replace(/[,৳\s]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned.replace(/[^0-9.]/g, "");
}

export function getExpenseCategoryIcon(category: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("food") || cat.includes("dining") || cat.includes("restaurant") || cat.includes("eat")) {
    return {
      icon: <UtensilsCrossed className="h-5 w-5 text-amber-600" />,
      bg: "bg-amber-50 border-amber-200/80 text-amber-700",
    };
  }
  if (cat.includes("grocer") || cat.includes("market") || cat.includes("bazar") || cat.includes("shop")) {
    return {
      icon: <ShoppingBag className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-200/80 text-emerald-700",
    };
  }
  if (
    cat.includes("bill") ||
    cat.includes("utilit") ||
    cat.includes("electr") ||
    cat.includes("gas") ||
    cat.includes("water") ||
    cat.includes("current")
  ) {
    return {
      icon: <Zap className="h-5 w-5 text-rose-600" />,
      bg: "bg-rose-50 border-rose-200/80 text-rose-700",
    };
  }
  if (
    cat.includes("transport") ||
    cat.includes("commute") ||
    cat.includes("ride") ||
    cat.includes("fuel") ||
    cat.includes("uber") ||
    cat.includes("pathao") ||
    cat.includes("car") ||
    cat.includes("bike")
  ) {
    return {
      icon: <Car className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-200/80 text-blue-700",
    };
  }
  if (cat.includes("loan") || cat.includes("emi") || cat.includes("repay")) {
    return {
      icon: <CreditCard className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50 border-emerald-200/80 text-emerald-700",
    };
  }
  if (cat.includes("health") || cat.includes("med") || cat.includes("doctor") || cat.includes("pharma")) {
    return {
      icon: <HeartPulse className="h-5 w-5 text-rose-600" />,
      bg: "bg-rose-50 border-rose-200/80 text-rose-700",
    };
  }
  if (cat.includes("educat") || cat.includes("school") || cat.includes("college") || cat.includes("tuition")) {
    return {
      icon: <GraduationCap className="h-5 w-5 text-blue-600" />,
      bg: "bg-blue-50 border-blue-200/80 text-blue-700",
    };
  }
  if (cat.includes("entertain") || cat.includes("movie") || cat.includes("fun") || cat.includes("cinema")) {
    return {
      icon: <Film className="h-5 w-5 text-purple-600" />,
      bg: "bg-purple-50 border-purple-200/80 text-purple-700",
    };
  }
  if (cat.includes("family") || cat.includes("home") || cat.includes("house") || cat.includes("rent")) {
    return {
      icon: <Home className="h-5 w-5 text-teal-600" />,
      bg: "bg-teal-50 border-teal-200/80 text-teal-700",
    };
  }
  if (cat.includes("dps") || cat.includes("savin") || cat.includes("deposit") || cat.includes("fdr")) {
    return {
      icon: <Landmark className="h-5 w-5 text-teal-600" />,
      bg: "bg-teal-50 border-teal-200/80 text-teal-700",
    };
  }
  return {
    icon: <Wallet className="h-5 w-5 text-slate-600" />,
    bg: "bg-slate-100 border-slate-200/80 text-slate-700",
  };
}

export function DailyExpensesPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
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
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [authUserId, setAuthUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "grid";
    }
    return "table";
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount =
    (timeFilter !== "month" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0);

  // Create / Edit Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState<DailyExpenseCategory>("Food & Dining");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("lifenest_custom_expense_categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Collect all unique categories from default list + stored custom categories + existing expenses
  const allCategoryOptions = useMemo(() => {
    const defaultLabels = new Set(CATEGORIES.map((c) => c.label));
    const extraLabels = new Set<string>();

    customCategories.forEach((cat) => {
      if (cat && !defaultLabels.has(cat) && cat !== "Others") {
        extraLabels.add(cat);
      }
    });

    expenses.forEach((exp) => {
      if (exp.category && !defaultLabels.has(exp.category) && exp.category !== "Others") {
        extraLabels.add(exp.category);
      }
    });

    return Array.from(extraLabels).sort();
  }, [customCategories, expenses]);

  const getCategoryBadge = (catName: string) => {
    const found = CATEGORIES.find((c) => c.label === catName);
    if (found) return found;
    return {
      label: catName,
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200/70",
      chipColor: "purple" as ChipColor,
    };
  };

  const getObligationIcon = (title: string, type: string) => {
    const t = (title || "").toLowerCase();
    const ty = (type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motor") || t.includes("cycle")) {
      return { icon: Bike, bg: "bg-purple-50 text-purple-600 border-purple-200/80" };
    }
    if (t.includes("car") || t.includes("auto") || t.includes("vehicle")) {
      return { icon: Car, bg: "bg-blue-50 text-blue-600 border-blue-200/80" };
    }
    if (t.includes("phone") || t.includes("mobile") || t.includes("light") || t.includes("device") || t.includes("gadget")) {
      return { icon: Smartphone, bg: "bg-sky-50 text-sky-600 border-sky-200/80" };
    }
    if (t.includes("laptop") || t.includes("mac") || t.includes("computer")) {
      return { icon: Laptop, bg: "bg-indigo-50 text-indigo-600 border-indigo-200/80" };
    }
    if (ty.includes("card") || t.includes("card")) {
      return { icon: CreditCard, bg: "bg-amber-50 text-amber-600 border-amber-200/80" };
    }
    return { icon: Landmark, bg: "bg-emerald-50 text-emerald-600 border-emerald-200/80" };
  };

  const [formPaymentMethod, setFormPaymentMethod] = useState<DailyExpensePaymentMethod>("Cash");
  const [formDescription, setFormDescription] = useState("");
  const [formMerchant, setFormMerchant] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  // Delete modal state
  const [expenseToDelete, setExpenseToDelete] = useState<DailyExpense | null>(null);

  // Category Trend Graph & Last Month Differentiation Modal State
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [trendModalCategory, setTrendModalCategory] = useState<string>("all");

  const openCategoryTrend = (category: string = "all") => {
    setTrendModalCategory(category);
    setTrendModalOpen(true);
  };

  // Active Tab: Expenses Ledger vs Banking & Financial Obligations
  const [activeTab, setActiveTab] = useState<"expenses" | "banking">("expenses");
  const [viewingExpenseDetail, setViewingExpenseDetail] = useState<DailyExpense | null>(null);

  // Banking State: Unified Obligations, Sub-tabs & Filter
  const [bankingFilter, setBankingFilter] = useState<"ALL" | "EMI" | "CARD" | "LOAN" | "SAVINGS">("ALL");
  const [savingsList, setSavingsList] = useState<MemberSavings[]>([]);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [triggerAddSavings, setTriggerAddSavings] = useState(false);

  // Loans & Segment Repayments State
  const [loans, setLoans] = useState<MemberLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  // Add Loan Modal State
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [loanTitle, setLoanTitle] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [loanType, setLoanType] = useState<MemberLoan["loanType"]>("Consumer EMI");
  const [totalPrincipal, setTotalPrincipal] = useState<string>("");
  const [interestRatePercent, setInterestRatePercent] = useState<number | "">("");
  const [tenureMonthsInput, setTenureMonthsInput] = useState<number>(12);
  const [interestType, setInterestType] = useState<"flat" | "reducing">("flat");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [targetEndDate, setTargetEndDate] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [savingLoan, setSavingLoan] = useState(false);
  const [loansViewSubTab, setLoansViewSubTab] = useState<"dashboard" | "matrix" | "savings" | "cards">("dashboard");
  const [showAddObligationDropdown, setShowAddObligationDropdown] = useState(false);

  // Mobile Header Portal & Menu State
  const [headerPortalEl, setHeaderPortalEl] = useState<HTMLElement | null>(null);
  const [showMobileOptionsMenu, setShowMobileOptionsMenu] = useState(false);

  useEffect(() => {
    const el = document.getElementById("mobile-header-right");
    if (el) {
      setHeaderPortalEl(el);
      return;
    }
    const interval = setInterval(() => {
      const found = document.getElementById("mobile-header-right");
      if (found) {
        setHeaderPortalEl(found);
        clearInterval(interval);
      }
    }, 50);
    const timeout = setTimeout(() => clearInterval(interval), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Pay Segment Modal State
  const [isPaySegmentModalOpen, setIsPaySegmentModalOpen] = useState(false);
  const [selectedLoanForSegment, setSelectedLoanForSegment] = useState<MemberLoan | null>(null);
  const [segmentAmount, setSegmentAmount] = useState<string>("");
  const [segmentDate, setSegmentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [segmentMethod, setSegmentMethod] = useState<DailyExpensePaymentMethod>("Bank Card");
  const [segmentNotes, setSegmentNotes] = useState("");
  const [segmentSyncDailyExpense, setSegmentSyncDailyExpense] = useState(true);
  const [savingSegment, setSavingSegment] = useState(false);

  // Delete Loan & Savings Modal State
  const [loanToDelete, setLoanToDelete] = useState<MemberLoan | null>(null);
  const [savingToDelete, setSavingToDelete] = useState<MemberSavings | null>(null);

  // Edit Loan Modal State
  const [editingLoan, setEditingLoan] = useState<MemberLoan | null>(null);
  const [editLoanTitle, setEditLoanTitle] = useState("");
  const [editLenderName, setEditLenderName] = useState("");
  const [editLoanType, setEditLoanType] = useState<MemberLoan["loanType"]>("Car Loan");
  const [editTotalPrincipal, setEditTotalPrincipal] = useState<string>("");
  const [editMonthlyEmiAmount, setEditMonthlyEmiAmount] = useState<number | "">("");
  const [editInterestRatePercent, setEditInterestRatePercent] = useState<number | "">("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetEndDate, setEditTargetEndDate] = useState("");
  const [editLoanStatus, setEditLoanStatus] = useState<MemberLoan["status"]>("ACTIVE");
  const [editLoanNotes, setEditLoanNotes] = useState("");
  const [savingEditLoan, setSavingEditLoan] = useState(false);

  // Dedicated Separate Segments View Modal State
  const [viewingLoanSegments, setViewingLoanSegments] = useState<MemberLoan | null>(null);

  // Edit Segment Modal State
  const [editingSegment, setEditingSegment] = useState<{
    loanId: string;
    segment: LoanRepaymentSegment;
  } | null>(null);
  const [editSegmentAmount, setEditSegmentAmount] = useState<string>("");
  const [editSegmentDate, setEditSegmentDate] = useState("");
  const [editSegmentMethod, setEditSegmentMethod] = useState<DailyExpensePaymentMethod>("Bank Card");
  const [editSegmentNotes, setEditSegmentNotes] = useState("");
  const [savingEditSegment, setSavingEditSegment] = useState(false);

  // Delete Segment State
  const [segmentToDelete, setSegmentToDelete] = useState<{
    loanId: string;
    segment: LoanRepaymentSegment;
  } | null>(null);
  const [deletingSegment, setDeletingSegment] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [_userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [currentUserAcc, famMembers] = await Promise.all([
        getCurrentUserAccess(),
        listFamilyMembersWithSelf(),
      ]);
      setUserAccess(currentUserAcc);
      if (!currentUserAcc.isHead && currentUserAcc.access.canAccessDailyExpenses === false) {
        setIsLocked(true);
      }
      setMembers(famMembers);

      // Get current authenticated user ID for owner expense resolution
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setAuthUserId(user.id);
        }
      } catch {}

      // Load cloud synced PINs first so all profiles unlock cleanly
      await loadCloudMemberPins();

      const allExpenses = await listDailyExpenses();
      setExpenses(allExpenses);

      // Auto-unlock Self profile if no PIN is configured or if already stored
      try {
        const storedId = sessionStorage.getItem("lifenest_unlocked_expense_member");
        if (!storedId) {
          const selfMember = famMembers.find((m) => m.relationship === "Self") || famMembers[0];
          if (selfMember && !hasMemberPin(selfMember.id, selfMember.fullName)) {
            setActiveMemberId(selfMember.id);
            sessionStorage.setItem("lifenest_unlocked_expense_member", selfMember.id);
          }
        }
      } catch {}
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

  // Open PIN modal or directly unlock member profile
  const handleSelectMember = (member: FamilyMember) => {
    if (member.relationship !== "Self" && member.access && member.access.canAccessDailyExpenses === false) {
      showToast(`${member.fullName} has Daily Expenses access restricted by the Family Head.`);
      return;
    }
    const hasPin = hasMemberPin(member.id, member.fullName);
    if (!hasPin) {
      // Direct unlock without forcing PIN setup for non-technical users
      setActiveMemberId(member.id);
      try {
        sessionStorage.setItem("lifenest_unlocked_expense_member", member.id);
      } catch {}
      showToast(`Welcome, ${member.fullName}!`);
      return;
    }
    setPinTargetMember(member);
    setPinInput("");
    setPinConfirmInput("");
    setPinError("");
  };

  // Submit PIN for unlock or initial setup
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinTargetMember) return;

    const hasPin = hasMemberPin(pinTargetMember.id, pinTargetMember.fullName);

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

      await setMemberPin(pinTargetMember.id, pinInput, pinTargetMember.fullName);
      setActiveMemberId(pinTargetMember.id);
      try {
        sessionStorage.setItem("lifenest_unlocked_expense_member", pinTargetMember.id);
      } catch {}
      setPinTargetMember(null);
      showToast(`PIN set successfully for ${pinTargetMember.fullName}!`);
    } else {
      // PIN verification
      const valid = verifyMemberPin(pinTargetMember.id, pinInput, pinTargetMember.fullName);
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
      const activeMem = members.find((m) => m.id === memberId);
      const data = await listMemberLoans(memberId, activeMem?.fullName);
      setLoans(data);
      setViewingLoanSegments((prev) => {
        if (!prev) return null;
        return data.find((l) => l.id === prev.id) || null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const loadSavingsSummary = async (memberId: string) => {
    setLoadingSavings(true);
    try {
      const activeMem = members.find((m) => m.id === memberId);
      const data = await listMemberSavings(memberId, activeMem?.fullName);
      setSavingsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSavings(false);
    }
  };

  useEffect(() => {
    if (activeMemberId) {
      loadLoans(activeMemberId);
      loadSavingsSummary(activeMemberId);
    } else {
      setLoans([]);
      setSavingsList([]);
      setViewingLoanSegments(null);
    }
  }, [activeMemberId]);

  // Unified Obligations Ledger (EMIs, Credit Cards, Loans, DPS & FDR)
  const unifiedObligations = useMemo(() => {
    type UnifiedItem = {
      id: string;
      title: string;
      institution: string;
      kind: "LOAN" | "SAVINGS";
      typeLabel: string;
      typeCategory: "EMI" | "CARD" | "LOAN" | "SAVINGS";
      tenureText: string;
      monthlyDue: number;
      totalTarget: number;
      cumulativePaid: number;
      remaining: number;
      pct: number;
      status: string;
      isCleared: boolean;
      targetUrl: string;
      rawLoan?: MemberLoan;
      rawSaving?: MemberSavings;
    };

    const list: UnifiedItem[] = [];

    loans.forEach((loan) => {
      const commitment = loan.totalRepayableAmount || loan.principalAmount || 0;
      const paid = (loan.repayments || [])
        .filter((r) => r.isPaid)
        .reduce((sum, r) => sum + r.amount, 0);
      const remaining = Math.max(0, commitment - paid);
      const isCleared = loan.status === "PAID_OFF" || remaining <= 0;
      const pct = commitment > 0 ? Math.min(100, Math.round((paid / commitment) * 100)) : 0;
      const isCard = loan.loanType === "Credit Card Bill" || loan.loanType === "Credit Card EMI";
      const isEmi = loan.loanType === "Consumer EMI";
      const typeCategory: "EMI" | "CARD" | "LOAN" = isCard ? "CARD" : isEmi ? "EMI" : "LOAN";

      list.push({
        id: loan.id,
        title: loan.loanTitle,
        institution: loan.lenderName || "—",
        kind: "LOAN",
        typeLabel: loan.loanType,
        typeCategory,
        tenureText: loan.tenureMonths
          ? `${loan.tenureMonths}m`
          : loan.repayments?.length
          ? `${loan.repayments.length}m`
          : "—",
        monthlyDue: loan.monthlyEmiAmount || 0,
        totalTarget: commitment,
        cumulativePaid: paid,
        remaining,
        pct,
        status: isCleared ? "Cleared" : "Active",
        isCleared,
        targetUrl: `/my-life/expenses/loans/${loan.id}`,
        rawLoan: loan,
      });
    });

    savingsList.forEach((saving) => {
      const totalTarget =
        saving.maturityAmount ||
        ((saving.monthlyInstallment || 0) * (saving.tenureMonths || (saving.tenureYears || 1) * 12)) ||
        saving.principalAmount ||
        0;
      const deposited = (saving.depositLogs || [])
        .filter((l) => l.isPaid !== false)
        .reduce((sum, l) => sum + l.amount, 0);
      const remaining = Math.max(0, totalTarget - deposited);
      const isCleared = saving.status === "MATURED" || saving.status === "CLOSED" || remaining <= 0;
      const pct = totalTarget > 0 ? Math.min(100, Math.round((deposited / totalTarget) * 100)) : 0;

      list.push({
        id: saving.id,
        title: saving.title,
        institution: saving.institutionName || "—",
        kind: "SAVINGS",
        typeLabel: saving.type,
        typeCategory: "SAVINGS",
        tenureText: saving.tenureMonths
          ? `${saving.tenureMonths}m`
          : saving.tenureYears
          ? `${saving.tenureYears}y`
          : "—",
        monthlyDue: saving.monthlyInstallment || 0,
        totalTarget,
        cumulativePaid: deposited,
        remaining,
        pct,
        status: saving.status === "ACTIVE" ? "Active" : saving.status === "MATURED" ? "Matured" : "Closed",
        isCleared,
        targetUrl: `/my-life/expenses/savings/${saving.id}`,
        rawSaving: saving,
      });
    });

    return list;
  }, [loans, savingsList]);

  const filteredObligations = useMemo(() => {
    if (bankingFilter === "ALL") return unifiedObligations;
    return unifiedObligations.filter((item) => item.typeCategory === bankingFilter);
  }, [unifiedObligations, bankingFilter]);

  const bankingMetrics = useMemo(() => {
    const totalTarget = unifiedObligations.reduce((acc, o) => acc + o.totalTarget, 0);
    const cumulativePaid = unifiedObligations.reduce((acc, o) => acc + o.cumulativePaid, 0);
    const totalRemaining = unifiedObligations.reduce((acc, o) => acc + o.remaining, 0);
    const totalMonthlyDue = unifiedObligations.filter((o) => !o.isCleared).reduce((acc, o) => acc + o.monthlyDue, 0);
    const activeCount = unifiedObligations.filter((o) => !o.isCleared).length;
    const emiCount = unifiedObligations.filter((o) => o.typeCategory === "EMI").length;
    const cardCount = unifiedObligations.filter((o) => o.typeCategory === "CARD").length;
    const loanCount = unifiedObligations.filter((o) => o.typeCategory === "LOAN").length;
    const savingsCount = unifiedObligations.filter((o) => o.typeCategory === "SAVINGS").length;
    const overallPct = totalTarget > 0 ? Math.min(100, Math.round((cumulativePaid / totalTarget) * 100)) : 0;

    return {
      totalTarget,
      cumulativePaid,
      totalRemaining,
      totalMonthlyDue,
      activeCount,
      emiCount,
      cardCount,
      loanCount,
      savingsCount,
      overallPct,
    };
  }, [unifiedObligations]);

  const calculatedAddEmi = useMemo(() => {
    const p = Number(totalPrincipal) || 0;
    const t = Number(tenureMonthsInput) || 12;
    const r = interestRatePercent !== "" ? Number(interestRatePercent) : 0;
    if (p <= 0 || t <= 0) return { monthlyEmi: 0, totalRepayable: 0, segments: [] };
    return generateEmiInstallments(p, t, startDate, r, interestType);
  }, [totalPrincipal, tenureMonthsInput, interestRatePercent, startDate, interestType]);

  const tenureSummary = useMemo(() => {
    const groups = [
      { category: "12-Month EMIs", tenureMonths: 12, count: 0, commitment: 0, paid: 0, remaining: 0 },
      { category: "6-Month EMIs", tenureMonths: 6, count: 0, commitment: 0, paid: 0, remaining: 0 },
      { category: "3-Month EMIs", tenureMonths: 3, count: 0, commitment: 0, paid: 0, remaining: 0 },
      { category: "Other Loans & EMIs", tenureMonths: null, count: 0, commitment: 0, paid: 0, remaining: 0 },
    ];

    let totalCombinedCommitment = 0;
    let totalCombinedPaid = 0;
    let totalCombinedRemaining = 0;

    for (const loan of loans) {
      const commitment = loan.totalRepayableAmount || loan.principalAmount || 0;
      const paid = (loan.repayments || []).filter((r) => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
      const remaining = Math.max(0, commitment - paid);

      totalCombinedCommitment += commitment;
      totalCombinedPaid += paid;
      totalCombinedRemaining += remaining;

      let idx = 3;
      if (loan.tenureMonths === 12 || loan.repayments?.length === 12) {
        idx = 0;
      } else if (loan.tenureMonths === 6 || loan.repayments?.length === 6) {
        idx = 1;
      } else if (loan.tenureMonths === 3 || loan.repayments?.length === 3) {
        idx = 2;
      }

      groups[idx].count++;
      groups[idx].commitment += commitment;
      groups[idx].paid += paid;
      groups[idx].remaining += remaining;
    }

    return { groups, totalCombinedCommitment, totalCombinedPaid, totalCombinedRemaining };
  }, [loans]);

  const emiMatrixData = useMemo(() => {
    const activeLoans = loans.filter((l) => l.repayments && l.repayments.length > 0);
    const monthMap = new Map<string, { date: Date; label: string }>();

    for (const loan of activeLoans) {
      for (const seg of loan.repayments || []) {
        if (seg.monthLabel) {
          if (!monthMap.has(seg.monthLabel)) {
            const dueDate = seg.dueDate ? new Date(seg.dueDate) : new Date();
            monthMap.set(seg.monthLabel, { date: dueDate, label: seg.monthLabel });
          }
        }
      }
    }

    const sortedMonths = Array.from(monthMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const rows = sortedMonths.map((m) => {
      let rowTotal = 0;
      let rowPaid = 0;
      const loanCells: Record<string, { segment?: LoanRepaymentSegment; amount: number; isPaid: boolean }> = {};

      for (const loan of activeLoans) {
        const seg = (loan.repayments || []).find((s) => s.monthLabel === m.label);
        if (seg) {
          rowTotal += seg.amount || 0;
          if (seg.isPaid) rowPaid += seg.amount || 0;
          loanCells[loan.id] = {
            segment: seg,
            amount: seg.amount || 0,
            isPaid: !!seg.isPaid,
          };
        } else {
          loanCells[loan.id] = {
            amount: 0,
            isPaid: false,
          };
        }
      }

      return {
        monthLabel: m.label,
        loanCells,
        rowTotal,
        rowPaid,
      };
    });

    return { activeLoans, sortedMonths, rows };
  }, [loans]);

  const handleToggleMatrixCell = async (loanId: string, segmentId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await toggleLoanSegmentPayment(loanId, segmentId, today, true);
      if (activeMemberId) {
        await loadLoans(activeMemberId);
        const allExpenses = await listDailyExpenses();
        setExpenses(allExpenses);
      }
      showToast("Updated installment payment status!");
    } catch (err) {
      console.error(err);
      showToast("Failed to update installment status");
    }
  };

  const openAddLoanModal = () => {
    setLoanTitle("");
    setLenderName("");
    setLoanType("Consumer EMI");
    setTotalPrincipal("");
    setInterestRatePercent("");
    setTenureMonthsInput(12);
    setInterestType("flat");
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
      const tenure = Number(tenureMonthsInput) || 12;
      const rate = interestRatePercent !== "" ? Number(interestRatePercent) : 0;
      const generated = generateEmiInstallments(
        Number(totalPrincipal),
        tenure,
        startDate,
        rate,
        interestType
      );

      const createdLoan = await createMemberLoan({
        familyMemberId: activeMemberId,
        loanTitle: loanTitle.trim(),
        lenderName: lenderName.trim(),
        loanType,
        principalAmount: Number(totalPrincipal),
        totalRepayableAmount: generated.totalRepayable,
        monthlyEmiAmount: generated.monthlyEmi,
        interestRate: rate,
        tenureMonths: tenure,
        startDate,
        targetEndDate: targetEndDate || (generated.segments[generated.segments.length - 1]?.dueDate || undefined),
        repayments: generated.segments,
        status: "ACTIVE",
        notes: loanNotes.trim() || undefined,
      });
      await loadLoans(activeMemberId);
      setIsAddLoanModalOpen(false);
      if (createdLoan.id.startsWith("loan_")) {
        showToast(`Saved locally: ${loanTitle.trim()}! Please run the SQL migration to sync to Supabase.`);
      } else {
        showToast(`Added ${loanTitle.trim()} with automated ${tenure}-month schedule!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLoan(false);
    }
  };

  const openEditLoanModal = (loan: MemberLoan) => {
    setEditingLoan(loan);
    setEditLoanTitle(loan.loanTitle);
    setEditLenderName(loan.lenderName);
    setEditLoanType(loan.loanType);
    setEditTotalPrincipal(String(loan.totalRepayableAmount || loan.principalAmount || ""));
    setEditMonthlyEmiAmount(loan.monthlyEmiAmount || "");
    setEditInterestRatePercent(loan.interestRate || "");
    setEditStartDate(loan.startDate || "");
    setEditTargetEndDate(loan.targetEndDate || "");
    setEditLoanStatus(loan.status || "ACTIVE");
    setEditLoanNotes(loan.notes || "");
  };

  const handleSaveEditLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || !editLoanTitle.trim() || !editLenderName.trim() || editTotalPrincipal === "" || Number(editTotalPrincipal) <= 0) return;
    setSavingEditLoan(true);
    try {
      const updated = await updateMemberLoan(editingLoan.id, {
        loanTitle: editLoanTitle.trim(),
        lenderName: editLenderName.trim(),
        loanType: editLoanType,
        principalAmount: Number(editTotalPrincipal),
        totalRepayableAmount: Number(editTotalPrincipal),
        monthlyEmiAmount: editMonthlyEmiAmount !== "" ? Number(editMonthlyEmiAmount) : undefined,
        interestRate: editInterestRatePercent !== "" ? Number(editInterestRatePercent) : undefined,
        startDate: editStartDate,
        targetEndDate: editTargetEndDate || undefined,
        status: editLoanStatus,
        notes: editLoanNotes.trim() || undefined,
      });
      if (activeMemberId) {
        await loadLoans(activeMemberId);
      }
      if (viewingLoanSegments?.id === editingLoan.id) {
        setViewingLoanSegments(updated);
      }
      setEditingLoan(null);
      showToast("Loan details updated successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEditLoan(false);
    }
  };

  const openPaySegmentModal = (loan: MemberLoan) => {
    setSelectedLoanForSegment(loan);
    setSegmentAmount(loan.monthlyEmiAmount ? String(loan.monthlyEmiAmount) : "");
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
      const updatedLoan = await addLoanRepaymentSegment(
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
      if (viewingLoanSegments?.id === selectedLoanForSegment.id) {
        setViewingLoanSegments(updatedLoan);
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

  const openEditSegmentModal = (loanId: string, segment: LoanRepaymentSegment) => {
    setEditingSegment({ loanId, segment });
    setEditSegmentAmount(segment.amount ? String(segment.amount) : "");
    setEditSegmentDate(segment.paymentDate || "");
    setEditSegmentMethod(segment.paymentMethod || "Bank Card");
    setEditSegmentNotes(segment.notes || "");
  };

  const handleSaveEditSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSegment || editSegmentAmount === "" || Number(editSegmentAmount) <= 0) return;
    setSavingEditSegment(true);
    try {
      const updated = await updateLoanRepaymentSegment(
        editingSegment.loanId,
        editingSegment.segment.id,
        {
          amount: Number(editSegmentAmount),
          paymentDate: editSegmentDate,
          paymentMethod: editSegmentMethod,
          notes: editSegmentNotes.trim() || undefined,
        }
      );
      if (activeMemberId) {
        await loadLoans(activeMemberId);
      }
      if (viewingLoanSegments?.id === editingSegment.loanId) {
        setViewingLoanSegments(updated);
      }
      setEditingSegment(null);
      showToast("Repayment segment updated successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEditSegment(false);
    }
  };

  const handleConfirmDeleteSegment = async () => {
    if (!segmentToDelete) return;
    setDeletingSegment(true);
    try {
      const updated = await deleteLoanRepaymentSegment(
        segmentToDelete.loanId,
        segmentToDelete.segment.id
      );
      if (activeMemberId) {
        await loadLoans(activeMemberId);
        const allExpenses = await listDailyExpenses();
        setExpenses(allExpenses);
      }
      if (viewingLoanSegments?.id === segmentToDelete.loanId) {
        setViewingLoanSegments(updated);
      }
      setSegmentToDelete(null);
      showToast("Repayment segment removed.");
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingSegment(false);
    }
  };

  const handleConfirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    const targetLoan = loanToDelete;
    // Instantly remove from local in-memory UI
    setLoans((prev) => prev.filter((l) => l.id !== targetLoan.id));
    setExpenses((prev) => prev.filter((e) => !e.description?.includes(targetLoan.loanTitle) && !e.notes?.includes(targetLoan.id)));
    if (viewingLoanSegments?.id === targetLoan.id) {
      setViewingLoanSegments(null);
    }
    setLoanToDelete(null);

    try {
      await deleteMemberLoan(targetLoan.id, targetLoan.loanTitle);
      if (activeMemberId) {
        await loadLoans(activeMemberId);
        const allExpenses = await listDailyExpenses();
        setExpenses(allExpenses);
      }
      showToast("Loan record and linked installments removed successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete loan record");
    }
  };

  const handleConfirmDeleteSaving = async () => {
    if (!savingToDelete) return;
    const targetSaving = savingToDelete;
    // Instantly remove from local in-memory UI
    setSavingsList((prev) => prev.filter((s) => s.id !== targetSaving.id));
    setExpenses((prev) => prev.filter((e) => !e.description?.includes(targetSaving.title) && !e.notes?.includes(targetSaving.id)));
    setSavingToDelete(null);

    try {
      await deleteMemberSavings(targetSaving.id, targetSaving.title);
      if (activeMemberId) {
        await loadSavingsSummary(activeMemberId);
        const allExpenses = await listDailyExpenses();
        setExpenses(allExpenses);
      }
      showToast("Savings scheme removed successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete savings scheme");
    }
  };

  // Filter expenses for current member
  const memberExpenses = useMemo(() => {
    if (!activeMemberId) return [];
    const activeName = activeMember?.fullName?.trim().toLowerCase();
    const isSelf =
      activeMember?.relationship === "Self" ||
      activeMemberId === "owner-admin-towsif" ||
      (authUserId && activeMemberId === authUserId) ||
      (activeName && (activeName.includes("towsif") || activeName.includes("self")));

    // Collect IDs of other distinct family members (e.g. spouse, child)
    const otherMemberIds = new Set(
      members
        .filter(
          (m) =>
            m.id !== activeMemberId &&
            m.relationship !== "Self" &&
            m.id !== "owner-admin-towsif" &&
            (!authUserId || m.id !== authUserId) &&
            !m.fullName.toLowerCase().includes("towsif")
        )
        .map((m) => m.id)
    );

    return expenses.filter((e) => {
      // Direct member ID match
      if (e.familyMemberId === activeMemberId) return true;
      // Direct member name match
      if (activeName && e.familyMemberName?.trim().toLowerCase() === activeName) return true;
      // If viewing Self / Account Owner:
      if (isSelf) {
        if (authUserId && e.familyMemberId === authUserId) return true;
        if (e.familyMemberId === "owner-admin-towsif") return true;
        if (!e.familyMemberId) return true;
        if (e.familyMemberName && e.familyMemberName.toLowerCase().includes("towsif")) return true;
        // Any expense not specifically tied to another distinct family member belongs to the owner
        if (!e.familyMemberName && !otherMemberIds.has(e.familyMemberId)) return true;
      }
      return false;
    });
  }, [expenses, activeMemberId, activeMember, authUserId, members]);

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
    setCustomCategoryInput("");
    setFormPaymentMethod("Cash");
    setFormDescription("");
    setFormMerchant("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (exp: DailyExpense) => {
    setEditingExpense(exp);
    setFormAmount(exp.amount ? String(exp.amount) : "");
    setFormDate(exp.date);

    const isStandard = CATEGORIES.some((c) => c.label === exp.category && c.label !== "Others");
    if (isStandard || customCategories.includes(exp.category)) {
      setFormCategory(exp.category);
      setCustomCategoryInput("");
    } else {
      setFormCategory("Others");
      setCustomCategoryInput(exp.category === "Others" ? "" : exp.category);
    }

    setFormPaymentMethod(exp.paymentMethod);
    setFormDescription(exp.description);
    setFormMerchant(exp.merchant || "");
    setIsModalOpen(true);
  };

  // Save Expense (Create or Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount);
    if (!activeMemberId || !formAmount || isNaN(numericAmount) || numericAmount <= 0) return;

    let finalCategory = formCategory;
    if (formCategory === "Others") {
      const trimmed = customCategoryInput.trim();
      if (trimmed) {
        finalCategory = trimmed;
        if (!customCategories.includes(trimmed)) {
          const updated = [...customCategories, trimmed];
          setCustomCategories(updated);
          try {
            localStorage.setItem("lifenest_custom_expense_categories", JSON.stringify(updated));
          } catch {}
        }
      } else {
        finalCategory = "Others";
      }
    }

    setSavingExpense(true);
    try {
      if (editingExpense) {
        const updated = await updateDailyExpense(editingExpense.id, {
          amount: numericAmount,
          date: formDate,
          category: finalCategory,
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
          amount: numericAmount,
          date: formDate,
          category: finalCategory,
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
      if (activeMemberId) {
        await loadLoans(activeMemberId);
        await loadSavingsSummary(activeMemberId);
      }
      showToast("Expense deleted.");
      setExpenseToDelete(null);
    } catch {
      showToast("Failed to delete expense.");
    }
  };

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {language === "bn" ? "অ্যাক্সেস সংরক্ষিত" : "Access Restricted"}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {language === "bn"
            ? "আপনার অ্যাকাউন্টে দৈনিক খরচের পাতা দেখার অনুমতি নেই। অনুগ্রহ করে পরিবারের প্রধানের সাথে যোগাযোগ করুন।"
            : "Your account does not have permission to view Daily Expenses. Please contact the Family Head to request access."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
        >
          {language === "bn" ? "হোম পেজে ফিরে যান" : "Back to Home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTIVE MEMBER STATUS                                     */}
      {/* ========================================================================= */}
      {/* Mobile Top Header Integration via Portal into MobileHeader */}
      {headerPortalEl &&
        activeMember &&
        createPortal(
          <div className="flex items-center gap-1.5 lg:hidden relative">
            <button
              type="button"
              onClick={() => setShowMobileOptionsMenu((prev) => !prev)}
              className="flex items-center gap-1.5 bg-[#dcfce7] hover:bg-emerald-200/80 active:scale-95 border border-emerald-300/90 rounded-full px-2.5 py-1 shadow-2xs transition cursor-pointer"
              title={`Active Profile: ${activeMember.fullName} (Click to manage)`}
            >
              <span className="text-xs font-bold text-[#064e3b]">
                {activeMember.fullName.charAt(0)}
              </span>
              <Lock className="h-3.5 w-3.5 text-[#064e3b]" />
            </button>

              {showMobileOptionsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMobileOptionsMenu(false)}
                  />
                  <div className="absolute right-0 top-9 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                    {activeMember && (
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {activeMember.fullName}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Ledger Unlocked
                        </div>
                      </div>
                    )}

                    {/* Switch / Choose Profile */}
                    <div className="py-1 border-b border-slate-100">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Family Profiles
                      </div>
                      {members.map((m) => {
                        const isCurrent = m.id === activeMember?.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setShowMobileOptionsMenu(false);
                              handleSelectMember(m);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-xl transition text-left cursor-pointer ${
                              isCurrent ? "bg-emerald-50 text-[#064e3b]" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                  m.relationship === "Self" ? "bg-[#064e3b]" : "bg-slate-700"
                                }`}
                              >
                                {m.fullName.charAt(0)}
                              </span>
                              <span className="truncate">{m.fullName}</span>
                              {m.relationship === "Self" && (
                                <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            {isCurrent && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {activeMember && !hasMemberPin(activeMember.id, activeMember.fullName) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileOptionsMenu(false);
                          setPinTargetMember(activeMember);
                          setPinInput("");
                          setPinConfirmInput("");
                          setPinError("");
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-xl text-emerald-800 hover:bg-emerald-50 transition text-left"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Protect with PIN</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileOptionsMenu(false);
                        openCategoryTrend("all");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 transition text-left"
                    >
                      <LineChart className="h-3.5 w-3.5 text-amber-600" />
                      <span>Trends & Comparison</span>
                    </button>
                    {activeMember && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileOptionsMenu(false);
                          handleLockProfile();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-xl text-rose-700 hover:bg-rose-50 transition text-left"
                      >
                        <Lock className="h-3.5 w-3.5 text-rose-600" />
                        <span>Lock & Switch Profile</span>
                      </button>
                    )}
                  </div>
                </>
              )}
          </div>,
          headerPortalEl
        )}

      {/* Desktop Header & Active Member Profile */}
      <div className="hidden lg:flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-4 sm:mb-6">
        {/* Left: Primary Switcher between Daily Expenses & Banking */}
        <div className="min-w-0 flex items-center gap-3">
          {activeMember ? (
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-full border border-slate-200/70 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("expenses")}
                className={`inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "expenses"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                <span>
                  <span className="hidden sm:inline">Daily </span>Expenses
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    activeTab === "expenses"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {memberExpenses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("banking")}
                className={`inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                  activeTab === "banking"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 font-medium"
                }`}
              >
                <Landmark className="h-3.5 w-3.5 text-emerald-700" />
                <span>
                  Banking<span className="hidden sm:inline"> & Obligations</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    activeTab === "banking"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {unifiedObligations.length}
                </span>
              </button>
            </div>
          ) : (
            <h1 className="text-lg font-bold tracking-tight text-slate-900 truncate">
              Daily Expenses
            </h1>
          )}
        </div>

        {/* Right: Sleek, compact profile switcher */}
        {activeMember ? (
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-full px-2.5 py-1 shadow-2xs">
            <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center font-bold text-[11px] uppercase text-[#064e3b]">
              {activeMember.fullName.charAt(0)}
            </div>
            <div className="text-left flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800 max-w-[130px] truncate">
                {activeMember.fullName}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200/60">
                <Unlock className="h-2 w-2" />
                <span className="hidden xl:inline">Unlocked</span>
              </span>
            </div>
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200/80">
              {!hasMemberPin(activeMember.id, activeMember.fullName) && (
                <button
                  type="button"
                  onClick={() => {
                    setPinTargetMember(activeMember);
                    setPinInput("");
                    setPinConfirmInput("");
                    setPinError("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-0.5 rounded-full transition cursor-pointer"
                  title="Protect this ledger with a 4-digit PIN"
                >
                  <KeyRound className="h-3 w-3" />
                  <span>Set PIN</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLockProfile}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-0.5 rounded-full transition cursor-pointer"
                title="Lock and switch profile"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Switch</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-50 border border-emerald-200/90 px-3 py-1 text-xs text-[#064e3b] font-medium flex items-center gap-1.5 shadow-2xs">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>Select profile below to unlock</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Add Obligation Bottom Sheet Popup (rendered at top level so it is visible on mobile) */}
      {showAddObligationDropdown && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs sm:hidden animate-in fade-in duration-150"
          onClick={() => setShowAddObligationDropdown(false)}
        >
          <div
            className="w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl p-4 text-slate-900 animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Add Obligation
                </h3>
                <p className="text-[11px] text-slate-400">
                  Save loans, EMIs, credit cards, or DPS savings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddObligationDropdown(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddObligationDropdown(false);
                  openAddLoanModal();
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-emerald-50/50 active:scale-[0.99] transition text-left cursor-pointer group shadow-2xs"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    Loan, EMI or Card
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Consumer EMI, credit card bill, bank loan
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddObligationDropdown(false);
                  setLoansViewSubTab("savings");
                  setTriggerAddSavings(true);
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-teal-50/50 active:scale-[0.99] transition text-left cursor-pointer group shadow-2xs"
              >
                <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900">
                    DPS / FDR Scheme
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Monthly recurring DPS, fixed deposit scheme
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LOADING STATE OR PROFILE SELECTOR / EXPENSES DASHBOARD                 */}
      {/* ========================================================================= */}
      {loading ? (
        <ExpensesSkeleton />
      ) : !activeMember ? (
        <div className="space-y-4">
          {/* Mobile Profile Selector (lg:hidden) */}
          <div className="space-y-3 lg:hidden">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs text-center space-y-1.5">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
                <KeyRound className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Select Profile to Unlock Expenses
              </h2>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Each family member maintains their own confidential spending ledger protected by personal PIN.
              </p>
            </div>

            <div className="space-y-2">
              {members.map((m) => {
                const hasPin = hasMemberPin(m.id, m.fullName);
                const isSelf = m.relationship === "Self";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition text-left cursor-pointer active:scale-[0.99] shadow-2xs ${
                      isSelf
                        ? "border-emerald-300 bg-white hover:bg-emerald-50/30"
                        : "border-slate-200/90 bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-base uppercase shadow-2xs ${
                            isSelf
                              ? "bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white"
                              : "bg-gradient-to-tr from-slate-700 to-slate-900 text-white"
                          }`}
                        >
                          {m.fullName.charAt(0)}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] border-2 border-white shadow-2xs ${
                            hasPin ? "bg-slate-800 text-white" : "bg-emerald-600 text-white"
                          }`}
                        >
                          <Lock className="h-2 w-2" />
                        </span>
                      </div>

                      {/* Member Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {m.fullName}
                          </span>
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-[#064e3b] border border-emerald-200">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isSelf ? "Account Owner (Self)" : m.relationship}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-[#064e3b] border border-emerald-200 shadow-2xs">
                      <KeyRound className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{hasPin ? "Enter PIN" : "Open"}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-600/70" />
                    </div>
                  </button>
                );
              })}

              <Link
                to="/workspace/family"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-white hover:border-emerald-400 hover:text-[#064e3b] transition text-xs font-semibold text-slate-500 shadow-2xs"
              >
                <Plus className="h-4 w-4 text-slate-400" />
                <span>Add Family Member</span>
              </Link>
            </div>
          </div>

          {/* Desktop Profile Selector (hidden lg:block) */}
          <div className="hidden lg:block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="max-w-xl mx-auto text-center space-y-2 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 mb-1 shadow-2xs">
                <KeyRound className="h-6 w-6 text-emerald-600" />
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
                const hasPin = hasMemberPin(m.id, m.fullName);
                const isSelf = m.relationship === "Self";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    className={`flex flex-col items-center p-4 rounded-xl border transition text-center cursor-pointer group relative ${
                      isSelf
                        ? "border-emerald-300 bg-emerald-50/30 hover:bg-white hover:border-emerald-500 hover:shadow-md"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-400 hover:shadow-md"
                    }`}
                  >
                    {isSelf && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-[#064e3b] border border-emerald-200">
                        You
                      </span>
                    )}

                    <div className="relative">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg uppercase shadow-sm ${
                          isSelf
                            ? "bg-gradient-to-tr from-slate-900 via-emerald-950 to-[#064e3b] text-white"
                            : "bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white"
                        }`}
                      >
                        {m.fullName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] border border-white shadow-2xs ${
                          hasPin ? "bg-slate-800 text-white" : "bg-emerald-600 text-white"
                        }`}
                        title={hasPin ? "PIN Protected" : "Setup PIN"}
                      >
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    </div>

                    <h3 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-[#064e3b]">
                      {m.fullName}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      {isSelf ? "Account Owner (Self)" : m.relationship}
                    </div>

                    <span
                      className={`mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        hasPin
                          ? "bg-slate-100 text-slate-700"
                          : "bg-emerald-50 text-[#064e3b] border border-emerald-200"
                      }`}
                    >
                      {hasPin ? "Enter PIN to Unlock" : "Click to Open"}
                    </span>
                  </button>
                );
              })}

              {/* Add Family Member quick shortcut */}
              <Link
                to="/workspace/family"
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 hover:bg-white hover:border-emerald-400 hover:text-[#064e3b] transition text-center cursor-pointer group text-slate-500 min-h-[160px]"
              >
                <div className="h-12 w-12 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center mb-2 group-hover:border-emerald-400 group-hover:bg-emerald-50 transition">
                  <Plus className="h-5 w-5 text-slate-400 group-hover:text-emerald-700" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-[#064e3b]">
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
        <div className="space-y-3 sm:space-y-5">
          {/* Mobile Only: Sub Navigation (desktop renders this cleanly in the top header) */}
          <div className="lg:hidden grid grid-cols-2 gap-1 p-1 bg-slate-100/90 rounded-full border border-slate-200/60 w-full mb-1">
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                activeTab === "expenses"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium"
              }`}
            >
              <Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>
                <span className="hidden sm:inline">Daily </span>Expenses
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                  activeTab === "expenses" ? "bg-emerald-50 text-emerald-800" : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {memberExpenses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("banking")}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                activeTab === "banking"
                  ? "bg-white text-slate-900 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 font-medium"
              }`}
            >
              <Landmark className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>
                Banking<span className="hidden sm:inline"> & Obligations</span>
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                  activeTab === "banking"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {unifiedObligations.length}
              </span>
            </button>
          </div>

          {activeTab === "expenses" && (
            <div className="space-y-2.5 sm:space-y-4">
              {/* Ultra-compact Sleek Summary Bar: Today, This Month, Daily Avg, Top Cat */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs px-3 py-2 sm:py-2.5">
                <div className="grid grid-cols-3 sm:grid-cols-4 divide-x divide-slate-100">
                  <div className="pr-2 sm:px-2 py-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      Today
                    </div>
                    <div className="mt-0.5 text-xs sm:text-base font-black font-mono text-slate-900 truncate">
                      ৳{stats.todayTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="px-2 sm:px-3 py-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      This Month
                    </div>
                    <div className="mt-0.5 text-xs sm:text-base font-black font-mono text-emerald-600 truncate">
                      ৳{stats.monthTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="pl-2 sm:px-3 py-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      Daily Avg
                    </div>
                    <div className="mt-0.5 text-xs sm:text-base font-black font-mono text-amber-600 truncate">
                      ৳{stats.dailyAvg.toLocaleString()}
                    </div>
                  </div>

                  <div className="hidden sm:block pl-3 py-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      Top Category
                    </div>
                    <div className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 truncate">
                      {stats.topCat}
                    </div>
                  </div>
                </div>
              </div>

          {/* Filter Bar & Controls - Unified in one line */}
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[100px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, merchant..."
                  className="w-full pl-7 sm:pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                />
              </div>

              {/* Time Range Pills & Category Dropdown (inline on md+) */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                {/* Time Range Pills */}
                <div className="inline-flex items-center p-0.5 rounded-full border border-slate-200 bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setTimeFilter("today")}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "today"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("week")}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "week"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("month")}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "month"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("all")}
                    className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Time
                  </button>
                </div>

                {/* Proper MUI Category Dropdown */}
                <FormControl size="small">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      "& .MuiSelect-select": {
                        py: "5px",
                        px: "10px",
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>
                      All Categories
                    </MenuItem>
                    {CATEGORIES.filter((c) => c.label !== "Others").map((c) => (
                      <MenuItem key={c.label} value={c.label} sx={{ fontSize: "0.75rem" }}>
                        {c.label}
                      </MenuItem>
                    ))}
                    {allCategoryOptions.map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ fontSize: "0.75rem" }}>
                        🏷️ {opt}
                      </MenuItem>
                    ))}
                    <MenuItem value="Others" sx={{ fontSize: "0.75rem" }}>Others</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Mobile Filter Toggle Button (< md only) */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
                className={`md:hidden inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  mobileFiltersOpen || activeFilterCount > 0
                    ? "border-emerald-500 bg-emerald-50 text-[#064e3b]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
                title="Filters"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden xs:inline text-xs">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View mode toggle */}
              <ViewModeToggle
                viewMode={viewMode}
                onChange={(mode) => setViewMode(mode as "table" | "grid")}
                gridLabel="Grid"
                listLabel="Table"
                listValue="table"
              />

              {/* Log Expense Button */}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3 sm:px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Log Expense</span>
              </button>
            </div>

            {/* Mobile Expanded Filters Panel */}
            {mobileFiltersOpen && (
              <div className="md:hidden flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Time Range Pills */}
                <div className="inline-flex items-center p-0.5 rounded-full border border-slate-200 bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setTimeFilter("today")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "today"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("week")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "week"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("month")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "month"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("all")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer text-center text-xs ${
                      timeFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Category Dropdown */}
                <FormControl size="small">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      "& .MuiSelect-select": {
                        py: "5px",
                        px: "10px",
                      },
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>
                      All Categories
                    </MenuItem>
                    {CATEGORIES.filter((c) => c.label !== "Others").map((c) => (
                      <MenuItem key={c.label} value={c.label} sx={{ fontSize: "0.75rem" }}>
                        {c.label}
                      </MenuItem>
                    ))}
                    {allCategoryOptions.map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ fontSize: "0.75rem" }}>
                        🏷️ {opt}
                      </MenuItem>
                    ))}
                    <MenuItem value="Others" sx={{ fontSize: "0.75rem" }}>Others</MenuItem>
                  </Select>
                </FormControl>
              </div>
            )}
          </div>

          {/* Expense Entries Table / Grid */}
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="p-2.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  Expenses History
                </h3>
                <p className="text-[10px] text-slate-400">
                  {filteredExpenses.length} entries
                </p>
              </div>

              <div className="text-xs font-bold font-mono text-slate-900 shrink-0">
                Total: <span className="text-emerald-600">৳{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span>
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
            ) : (
              <>
                {/* Mobile Unified Expense Cards List (sm:hidden) matching mockup */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => {
                    const catConfig = getCategoryBadge(exp.category);
                    const catIcon = getExpenseCategoryIcon(exp.category);
                    return (
                      <div
                        key={exp.id}
                        onClick={() => setViewingExpenseDetail(exp)}
                        className="p-3.5 hover:bg-slate-50/80 active:bg-slate-100/70 transition flex items-start gap-3 cursor-pointer group"
                      >
                        {/* Soft rounded icon box */}
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs ${catIcon.bg}`}
                        >
                          {catIcon.icon}
                        </div>

                        {/* Content Details */}
                        <div className="flex-1 min-w-0">
                          {/* Top Line: Category Chip + Date */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                openCategoryTrend(exp.category);
                              }}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${catConfig.color} ${catConfig.bg}`}
                              title={`Click to view trend for ${exp.category}`}
                            >
                              {exp.category}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              {exp.date}
                            </span>
                          </div>

                          {/* Title / Description */}
                          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition truncate mt-1">
                            {exp.description || "Daily Expense"}
                          </div>

                          {/* Store / Merchant */}
                          {exp.merchant && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {exp.merchant}
                            </div>
                          )}

                          {/* Bottom Line: Amount + Payment Method + TableRowActions */}
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-50">
                            <div>
                              <div className="font-mono font-black text-slate-900 text-sm">
                                ৳{exp.amount.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                {getPaymentMethodIcon(exp.paymentMethod)}
                                <span>{exp.paymentMethod}</span>
                              </div>
                            </div>

                            <div onClick={(e) => e.stopPropagation()}>
                              <TableRowActions
                                title={exp.description || exp.category}
                                subtitle={`${exp.date} • ৳${exp.amount.toLocaleString()} (${exp.paymentMethod})`}
                                actions={[
                                  {
                                    label: "View Full Details",
                                    description: "Odometer, receipt image, merchant, notes",
                                    icon: ExternalLink,
                                    variant: "emerald",
                                    onClick: () => setViewingExpenseDetail(exp),
                                  },
                                  {
                                    label: "Edit Expense Record",
                                    description: "Update amount, category, date or payment method",
                                    icon: Edit2,
                                    onClick: () => openEditModal(exp),
                                  },
                                  {
                                    label: "Delete Expense",
                                    description: "Permanently delete this entry",
                                    icon: Trash2,
                                    variant: "danger",
                                    onClick: () => setExpenseToDelete(exp),
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View (Table or Grid) */}
                <div className="hidden sm:block">
                  {viewMode === "table" ? (
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
                            const catConfig = getCategoryBadge(exp.category);
                            return (
                              <tr
                                key={exp.id}
                                onClick={() => setViewingExpenseDetail(exp)}
                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                              >
                                <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px] text-slate-700">
                                  {exp.date}
                                </td>
                                <td className="py-3 px-4">
                                  <Chip
                                    size="sm"
                                    color={catConfig.chipColor}
                                    label={exp.category}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCategoryTrend(exp.category);
                                    }}
                                    className="border border-current/15 shadow-2xs"
                                    title={`Click to view trend graph for ${exp.category}`}
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-900 text-xs group-hover:text-emerald-700 transition flex items-center gap-1.5">
                                    <span>{exp.description || "Daily Expense"}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                  </div>
                                  {exp.merchant && (
                                    <div className="text-[11px] text-slate-400">
                                      Store: {exp.merchant}
                                    </div>
                                  )}
                                </td>
                                <td className="whitespace-nowrap py-3 px-4">
                                  <Chip
                                    size="sm"
                                    color="slate"
                                    label={exp.paymentMethod}
                                    className="border border-slate-200/80 font-medium"
                                  />
                                </td>
                                <td className="whitespace-nowrap py-3 px-4 font-mono font-bold text-slate-900 text-right text-sm">
                                  ৳{exp.amount.toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap py-2 px-4 text-right pr-4">
                                  <TableRowActions
                                    title={exp.description || exp.category}
                                    subtitle={`${exp.date} • ৳${exp.amount.toLocaleString()} (${exp.paymentMethod})`}
                                    actions={[
                                      {
                                        label: "View Full Details",
                                        description: "Odometer, receipt image, merchant, notes",
                                        icon: ExternalLink,
                                        variant: "emerald",
                                        onClick: () => setViewingExpenseDetail(exp),
                                      },
                                      {
                                        label: "Edit Expense Record",
                                        description: "Update amount, category, date or payment method",
                                        icon: Edit2,
                                        onClick: () => openEditModal(exp),
                                      },
                                      {
                                        label: "Delete Expense",
                                        description: "Permanently delete this entry",
                                        icon: Trash2,
                                        variant: "danger",
                                        onClick: () => setExpenseToDelete(exp),
                                      },
                                    ]}
                                  />
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
                        const catConfig = getCategoryBadge(exp.category);
                        return (
                          <div
                            key={exp.id}
                            onClick={() => setViewingExpenseDetail(exp)}
                            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <Chip
                                  size="sm"
                                  color={catConfig.chipColor}
                                  label={exp.category}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCategoryTrend(exp.category);
                                  }}
                                  className="border border-current/15 shadow-2xs max-w-[70%]"
                                  title={`Click to view trend graph for ${exp.category}`}
                                />
                                <span className="font-mono text-[10px] text-slate-400">{exp.date}</span>
                              </div>

                              <div className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center justify-between">
                                <span>{exp.description || "Daily Expense"}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
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

                              <TableRowActions
                                title={exp.description || exp.category}
                                subtitle={`${exp.date} • ৳${exp.amount.toLocaleString()} (${exp.paymentMethod})`}
                                actions={[
                                  {
                                    label: "View Full Details",
                                    description: "Odometer, receipt image, merchant, notes",
                                    icon: ExternalLink,
                                    variant: "emerald",
                                    onClick: () => setViewingExpenseDetail(exp),
                                  },
                                  {
                                    label: "Edit Expense Record",
                                    description: "Update amount, category, date or payment method",
                                    icon: Edit2,
                                    onClick: () => openEditModal(exp),
                                  },
                                  {
                                    label: "Delete Expense",
                                    description: "Permanently delete this entry",
                                    icon: Trash2,
                                    variant: "danger",
                                    onClick: () => setExpenseToDelete(exp),
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
          )}

          {/* BANKING & FINANCIAL OBLIGATIONS VIEW */}
          {activeTab === "banking" && (
            <div className="space-y-2.5 sm:space-y-4">
              {/* Ultra-compact Sleek Summary Bar: Due This Month, Pending, Paid, Total */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs px-3 py-2 sm:py-2.5">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 gap-y-1.5 sm:gap-y-0">
                  <div className="pr-2 sm:px-2 py-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Due This Month</span>
                      <CalendarRange className="h-3 w-3 text-emerald-700" />
                    </div>
                    <div className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5 truncate">
                      ৳{bankingMetrics.totalMonthlyDue.toLocaleString()}
                    </div>
                  </div>

                  <div className="pl-2 sm:px-3 py-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Pending</span>
                      <Clock className="h-3 w-3 text-amber-500" />
                    </div>
                    <div className="text-sm sm:text-base font-black font-mono text-amber-600 mt-0.5 truncate">
                      ৳{bankingMetrics.totalRemaining.toLocaleString()}
                    </div>
                  </div>

                  <div className="pt-1.5 sm:pt-0.5 pr-2 sm:px-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Paid</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-full border border-emerald-200/60 shrink-0">
                        {bankingMetrics.overallPct}%
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-mono text-emerald-600 mt-0.5 truncate">
                      ৳{bankingMetrics.cumulativePaid.toLocaleString()}
                    </div>
                  </div>

                  <div className="pt-1.5 sm:pt-0.5 pl-2 sm:px-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Commitments</span>
                      <span className="text-[10px] text-slate-400 font-normal">({bankingMetrics.activeCount})</span>
                    </div>
                    <div className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5 truncate">
                      ৳{bankingMetrics.totalTarget.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Type-wise Filter Toolbar & Add Obligation Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* View Toggle & Add Obligation Button (At TOP on mobile, RIGHT on desktop) */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 sm:order-2">
                  {/* Cashflow Matrix Toggle */}
                  <button
                    type="button"
                    onClick={() => setLoansViewSubTab((prev) => (prev === "matrix" ? "dashboard" : "matrix"))}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      loansViewSubTab === "matrix"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                    title="Toggle spreadsheet cashflow matrix"
                  >
                    <CalendarRange className="h-3.5 w-3.5" />
                    <span>{loansViewSubTab === "matrix" ? "List View" : "Matrix"}</span>
                  </button>

                  {/* Add Obligation Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAddObligationDropdown((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-[#073f30] hover:to-[#0b6e4e] transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Obligation</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showAddObligationDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {showAddObligationDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setShowAddObligationDropdown(false)}
                        />
                        <div className="hidden sm:block absolute right-0 mt-2 w-64 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/90 z-40 text-left animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddObligationDropdown(false);
                              openAddLoanModal();
                            }}
                            className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50/70 transition text-left group cursor-pointer"
                          >
                            <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-800 group-hover:bg-emerald-200/80 transition shrink-0 mt-0.5">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                                EMI / Loan / Card
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                Consumer EMI, credit card, bank loan
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowAddObligationDropdown(false);
                              setLoansViewSubTab("savings");
                              setTriggerAddSavings(true);
                            }}
                            className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-teal-50/70 transition text-left group cursor-pointer"
                          >
                            <div className="p-2 rounded-lg bg-teal-100/70 text-teal-800 group-hover:bg-teal-200/80 transition shrink-0 mt-0.5">
                              <Landmark className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                                DPS / FDR Scheme
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                Monthly DPS, fixed deposit scheme
                              </div>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Horizontal Scrollable Type Filter Chips (At BOTTOM on mobile, LEFT on desktop) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 sm:order-1">
                  {[
                    { id: "ALL", label: "All", count: unifiedObligations.length },
                    { id: "CARD", label: "Credit Cards", count: bankingMetrics.cardCount },
                    { id: "EMI", label: "EMIs", count: bankingMetrics.emiCount },
                    { id: "LOAN", label: "Loans", count: bankingMetrics.loanCount },
                    { id: "SAVINGS", label: "DPS & Savings", count: bankingMetrics.savingsCount },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setBankingFilter(item.id as any);
                        if (loansViewSubTab !== "dashboard") setLoansViewSubTab("dashboard");
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer select-none ${
                        bankingFilter === item.id && loansViewSubTab === "dashboard"
                          ? "bg-[#064e3b] text-white shadow-xs"
                          : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          bankingFilter === item.id && loansViewSubTab === "dashboard"
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Banking & Financial Obligations Content */}
              {loadingLoans || loadingSavings ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading financial commitments and savings...
                </div>
              ) : loansViewSubTab === "savings" && activeMember ? (
                <MemberSavingsView
                  activeMember={activeMember}
                  onToast={showToast}
                  onOpenAddModalDirect={triggerAddSavings}
                  onResetOpenAddModal={() => {
                    setTriggerAddSavings(false);
                    if (activeMemberId) loadSavingsSummary(activeMemberId);
                  }}
                />
              ) : loansViewSubTab === "dashboard" ? (
                filteredObligations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto">
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">No obligations found</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        {bankingFilter !== "ALL"
                          ? "No records match this type filter."
                          : "Start by recording your first Loan, Consumer EMI, Credit Card bill or DPS savings."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddLoanModal}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#064e3b] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#073f30] transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add First Obligation</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredObligations.map((item) => {
                      const iconCfg = getObligationIcon(item.title, item.typeCategory);
                      const IconComp = iconCfg.icon;
                      const pct = item.totalTarget > 0
                        ? Math.min(100, Math.round((item.cumulativePaid / item.totalTarget) * 100))
                        : 0;

                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          onClick={() => navigate(item.targetUrl)}
                          className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-xs transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group"
                        >
                          {/* Left: Icon, Title, Institution, Type Badge */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${iconCfg.bg}`}>
                              <IconComp className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition truncate">
                                  {item.title}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600 shrink-0">
                                  {item.typeLabel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {item.institution} {item.tenureText !== "—" ? `• ${item.tenureText}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Middle: Progress Bar & Paid vs Total */}
                          <div className="md:w-60 shrink-0">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-emerald-700 font-mono">৳{item.cumulativePaid.toLocaleString()} paid</span>
                              <span className="text-slate-400 font-mono text-[11px] font-bold">{pct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                              <span>Total ৳{item.totalTarget.toLocaleString()}</span>
                              <span className="font-bold text-amber-700">৳{item.remaining.toLocaleString()} left</span>
                            </div>
                          </div>

                          {/* Right: Monthly Due, Status & Go Inside Arrow */}
                          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                            <div className="text-left md:text-right">
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                Monthly Due
                              </div>
                              <div className="text-sm font-black font-mono text-slate-900">
                                {item.monthlyDue > 0 ? `৳${item.monthlyDue.toLocaleString()}` : "—"}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                item.isCleared
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {item.status}
                              </span>

                              {/* Go Inside Details Pill */}
                              <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition">
                                <span className="hidden sm:inline">Details</span>
                                <ChevronRight className="h-3.5 w-3.5 text-emerald-700 group-hover:translate-x-0.5 transition" />
                              </div>

                              {/* Direct Delete Obligation Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.kind === "LOAN" && item.rawLoan) {
                                    setLoanToDelete(item.rawLoan);
                                  } else if (item.kind === "SAVINGS" && item.rawSaving) {
                                    setSavingToDelete(item.rawSaving);
                                  }
                                }}
                                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer shadow-2xs"
                                title="Delete Obligation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Row Actions Menu */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <TableRowActions
                                  title={item.title}
                                  subtitle={`${item.typeLabel} • ${item.institution}`}
                                  actions={[
                                    {
                                      label: "View Schedule & Ledger",
                                      description: "Open breakdown, installments & records",
                                      icon: ExternalLink,
                                      onClick: () => navigate(item.targetUrl),
                                    },
                                    ...(item.kind === "LOAN" && item.rawLoan
                                      ? [
                                          {
                                            label: "Edit Obligation Details",
                                            description: "Update principal, tenure, lender or notes",
                                            icon: Pencil,
                                            onClick: () => openEditLoanModal(item.rawLoan!),
                                          },
                                          {
                                            label: "Delete Obligation",
                                            description: "Permanently delete this loan & all segments",
                                            icon: Trash2,
                                            variant: "danger" as const,
                                            onClick: () => setLoanToDelete(item.rawLoan!),
                                          },
                                        ]
                                      : item.kind === "SAVINGS" && item.rawSaving
                                      ? [
                                          {
                                            label: "View & Edit Scheme",
                                            description: "Open savings milestones & ledger",
                                            icon: ExternalLink,
                                            onClick: () => navigate(item.targetUrl),
                                          },
                                          {
                                            label: "Delete Savings Scheme",
                                            description: "Permanently delete this savings scheme",
                                            icon: Trash2,
                                            variant: "danger" as const,
                                            onClick: () => setSavingToDelete(item.rawSaving!),
                                          },
                                        ]
                                      : []),
                                  ]}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : loansViewSubTab === "matrix" ? (
                <div className="space-y-6">
                  {/* Tenure Commitment Summary */}
                  {loans.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <Table className="w-3.5 h-3.5 text-slate-500" />
                            <span>Tenure Commitment Summary</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Aggregate breakdown of 12-month, 6-month, and 3-month commitments
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCategoryTrend("Loan & EMI Repayment")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          title="Compare EMI Trends"
                        >
                          <LineChart className="w-3.5 h-3.5 text-teal-600" />
                          <span>Trend Analysis</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="py-3 px-4">Tenure Category</th>
                              <th className="py-3 px-3 text-center">Active EMIs</th>
                              <th className="py-3 px-4 text-right">Total Commitment</th>
                              <th className="py-3 px-4 text-right">Total Paid So Far</th>
                              <th className="py-3 px-4 text-right">Remaining Balance</th>
                              <th className="py-3 px-4 text-right">Status / Cleared</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tenureSummary.groups.map((group) => {
                              if (group.count === 0 && group.commitment === 0) return null;
                              const pct = group.commitment > 0 ? Math.min(100, Math.round((group.paid / group.commitment) * 100)) : 0;
                              return (
                                <tr key={group.category} className="hover:bg-slate-50/60 transition">
                                  <td className="py-3 px-4 font-bold text-slate-800">
                                    {group.category}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                                    {group.count}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                    ৳{group.commitment.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                                    ৳{group.paid.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                                    ৳{group.remaining.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-semibold">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-emerald-500"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-600 w-9 text-right">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100/90 text-slate-900 font-bold border-t-2 border-slate-300">
                              <td className="py-3.5 px-4 uppercase tracking-wider text-[11px] text-slate-800 font-black">
                                Total Combined
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-700 font-bold">
                                {loans.length}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-slate-900 text-sm font-black">
                                ৳{tenureSummary.totalCombinedCommitment.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm font-black">
                                ৳{tenureSummary.totalCombinedPaid.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-amber-800 text-sm font-black">
                                ৳{tenureSummary.totalCombinedRemaining.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right text-emerald-700 font-mono text-xs font-bold">
                                {tenureSummary.totalCombinedCommitment > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (tenureSummary.totalCombinedPaid /
                                          tenureSummary.totalCombinedCommitment) *
                                          100
                                      )
                                    )
                                  : 0}
                                % Paid
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {emiMatrixData.rows.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
                            <span>Monthly Cashflow & Obligation Matrix</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Spreadsheet timeline of all monthly installments. Click any cell to toggle payment!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCategoryTrend("Loan & EMI Repayment")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          title="Monthly Obligation Trend Analysis"
                        >
                          <LineChart className="w-3.5 h-3.5 text-teal-600" />
                          <span>Obligation Trends</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
                            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                              <th className="py-3 px-4 sticky left-0 bg-slate-100 z-20 shadow-xs border-r border-slate-200 w-36">
                                Month / Year
                              </th>
                              {emiMatrixData.activeLoans.map((loan) => (
                                <th
                                  key={loan.id}
                                  className="py-3 px-3 text-center border-r border-slate-200 min-w-[130px]"
                                >
                                  <div
                                    onClick={() => navigate(`/my-life/expenses/loans/${loan.id}`)}
                                    className="font-bold text-slate-800 hover:text-teal-700 cursor-pointer truncate max-w-[140px]"
                                    title={loan.loanTitle}
                                  >
                                    {loan.loanTitle}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {loan.tenureMonths ? `${loan.tenureMonths}m` : ""} • ৳{(loan.monthlyEmiAmount || 0).toLocaleString()}
                                  </div>
                                </th>
                              ))}
                              <th className="py-3 px-4 text-right bg-teal-50/80 font-black text-teal-900 border-l border-teal-200 min-w-[120px]">
                                Monthly Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {emiMatrixData.rows.map((row) => (
                              <tr key={row.monthLabel} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-200 z-10 shadow-xs">
                                  {row.monthLabel}
                                </td>
                                {emiMatrixData.activeLoans.map((loan) => {
                                  const cell = row.loanCells[loan.id];
                                  if (!cell || cell.amount <= 0 || !cell.segment) {
                                    return (
                                      <td
                                        key={loan.id}
                                        className="py-3 px-3 text-center text-slate-300 font-mono border-r border-slate-100"
                                      >
                                        —
                                      </td>
                                    );
                                  }

                                  return (
                                    <td
                                      key={loan.id}
                                      className="py-2 px-2 text-center border-r border-slate-100"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          cell.segment && handleToggleMatrixCell(loan.id, cell.segment.id)
                                        }
                                        className={`w-full py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                          cell.isPaid
                                            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                                            : "bg-slate-100 hover:bg-teal-50 hover:border-teal-300 text-slate-800 border border-slate-200"
                                        }`}
                                        title={
                                          cell.isPaid
                                            ? "Paid! Click to mark as unpaid"
                                            : "Click to mark as paid"
                                        }
                                      >
                                        {cell.isPaid ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>৳{cell.amount.toLocaleString()}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>৳{cell.amount.toLocaleString()}</span>
                                          </>
                                        )}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="py-3 px-4 text-right font-mono font-black text-sm text-teal-800 bg-teal-50/50 border-l border-teal-100">
                                  ৳{row.rowTotal.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                      No active installments found for monthly cashflow matrix.
                    </div>
                  )}
                </div>
              ) : (
                /* Cards View */
                <div className="space-y-4">
                  {loans.map((loan) => {
                    const totalPrincipal = loan.totalRepayableAmount || loan.principalAmount || 0;
                    const repaidAmount = (loan.repayments || []).filter((r) => r.isPaid).reduce((acc, r) => acc + r.amount, 0);
                    const remainingAmount = Math.max(0, totalPrincipal - repaidAmount);
                    const isFullyPaid = loan.status === "PAID_OFF" || remainingAmount <= 0;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                onClick={() => navigate(`/my-life/expenses/loans/${loan.id}`)}
                                className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer flex items-center gap-1.5"
                              >
                                {loan.loanTitle}
                                <ExternalLink className="w-3 h-3 text-slate-400" />
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
                              <span>Lender: <strong>{loan.lenderName}</strong></span>
                              <span>•</span>
                              <span>Started: {loan.startDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/my-life/expenses/loans/${loan.id}`)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 px-3 py-1.5 text-xs font-bold hover:bg-teal-100 transition cursor-pointer"
                            >
                              <span>View Schedule</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditLoanModal(loan)}
                              className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                              title="Edit Loan"
                            >
                              <Pencil className="h-3.5 w-3.5" />
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Commitment</div>
                            <div className="font-mono text-sm sm:text-base font-bold text-slate-900 mt-0.5">৳{totalPrincipal.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Repaid</div>
                            <div className="font-mono text-sm sm:text-base font-bold text-emerald-600 mt-0.5">৳{repaidAmount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remaining Balance</div>
                            <div className="font-mono text-sm sm:text-base font-bold text-amber-700 mt-0.5">৳{remainingAmount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly EMI</div>
                            <div className="text-xs font-semibold text-slate-800 mt-1">৳{(loan.monthlyEmiAmount || 0).toLocaleString()}/mo</div>
                          </div>
                        </div>
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
      {/* 3.5 MODAL: VIEW EXPENSE DETAIL                                           */}
      {/* ========================================================================= */}
      {viewingExpenseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  ৳
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Expense Details</h3>
                  <p className="text-xs text-slate-500">
                    Recorded for <span className="font-semibold">{activeMember?.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpenseDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Main Amount Card */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense Amount</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
                  ৳{viewingExpenseDetail.amount.toLocaleString()}
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                  {(() => {
                    const cat = getCategoryBadge(viewingExpenseDetail.category);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cat.bg} ${cat.color}`}>
                        {viewingExpenseDetail.category}
                      </span>
                    );
                  })()}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200">
                    {viewingExpenseDetail.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 bg-white rounded-xl border border-slate-100 p-3.5">
                <div className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 pb-2.5">
                  <span className="text-slate-400 font-medium">Description</span>
                  <span className="text-slate-900 font-bold text-right">
                    {viewingExpenseDetail.description || "Daily Expense"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                  <span className="text-slate-400 font-medium">Expense Date</span>
                  <span className="font-mono text-slate-800 font-semibold">{viewingExpenseDetail.date}</span>
                </div>
                {viewingExpenseDetail.merchant && (
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                    <span className="text-slate-400 font-medium">Store / Merchant</span>
                    <span className="text-slate-800 font-semibold">{viewingExpenseDetail.merchant}</span>
                  </div>
                )}
                {viewingExpenseDetail.notes && (
                  <div className="text-xs pt-1">
                    <span className="text-slate-400 font-medium block mb-1">Notes</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {viewingExpenseDetail.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Financial Obligation Navigation */}
              {(() => {
                const linkedLoan = loans.find(
                  (l) => viewingExpenseDetail.linkedLoanId === l.id || viewingExpenseDetail.description?.includes(l.loanTitle)
                );
                if (!linkedLoan) return null;
                return (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingExpenseDetail(null);
                        navigate(`/my-life/expenses/loans/${linkedLoan.id}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4 text-teal-600" />
                      <span>View Linked EMI / Loan Schedule ({linkedLoan.loanTitle})</span>
                    </button>
                  </div>
                );
              })()}

              {(() => {
                const linkedSaving = savingsList.find(
                  (s) => viewingExpenseDetail.linkedSavingsId === s.id || viewingExpenseDetail.description?.includes(s.title)
                );
                if (!linkedSaving) return null;
                return (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingExpenseDetail(null);
                        navigate(`/my-life/expenses/savings/${linkedSaving.id}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-700" />
                      <span>View Linked DPS / Savings Schedule ({linkedSaving.title})</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4 shrink-0 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const exp = viewingExpenseDetail;
                    setViewingExpenseDetail(null);
                    openEditModal(exp);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exp = viewingExpenseDetail;
                    setViewingExpenseDetail(null);
                    setExpenseToDelete(exp);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpenseDetail(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PIN INPUT / SETUP                                              */}
      {/* ========================================================================= */}
      {pinTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs">
                <Lock className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {hasMemberPin(pinTargetMember.id, pinTargetMember.fullName)
                  ? `Enter PIN for ${pinTargetMember.fullName}`
                  : `Set New PIN for ${pinTargetMember.fullName}`}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasMemberPin(pinTargetMember.id, pinTargetMember.fullName)
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
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>

              {!hasMemberPin(pinTargetMember.id, pinTargetMember.fullName) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={pinConfirmInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, "");
                      setPinConfirmInput(clean);
                      setPinError("");
                    }}
                    className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition"
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
                  className="flex-1 rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] py-2.5 text-xs font-semibold text-white hover:from-[#073f30] hover:to-[#0b6e4e] transition shadow-xs cursor-pointer"
                >
                  {hasMemberPin(pinTargetMember.id, pinTargetMember.fullName) ? "Unlock Ledger" : "Set & Unlock"}
                </button>
              </div>

              {!hasMemberPin(pinTargetMember.id, pinTargetMember.fullName) && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMemberId(pinTargetMember.id);
                      try {
                        sessionStorage.setItem("lifenest_unlocked_expense_member", pinTargetMember.id);
                      } catch {}
                      setPinTargetMember(null);
                      showToast(`Welcome, ${pinTargetMember.fullName}!`);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    Skip & Open Without PIN
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: LOG / EDIT EXPENSE                                             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
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
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="pointer-events-none select-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(normalizeNumericInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <FormControl size="small" fullWidth>
                  <Select
                    value={formCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormCategory(val);
                      if (val !== "Others") {
                        setCustomCategoryInput("");
                      }
                    }}
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      "& .MuiSelect-select": { py: "8px" },
                    }}
                  >
                    {CATEGORIES.filter((c) => c.label !== "Others").map((c) => (
                      <MenuItem key={c.label} value={c.label} sx={{ fontSize: "0.75rem" }}>
                        {c.label}
                      </MenuItem>
                    ))}
                    {allCategoryOptions.map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ fontSize: "0.75rem" }}>
                        🏷️ {opt}
                      </MenuItem>
                    ))}
                    <MenuItem value="Others" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>
                      Others (Add Custom Category)
                    </MenuItem>
                  </Select>
                </FormControl>

                {formCategory === "Others" && (
                  <div className="mt-2.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                      Enter Custom Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Pet Care, Donation, Gym, Subscriptions"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                    <p className="mt-1 text-[10px] text-emerald-700/90">
                      This category will be saved and available in your category list for future expenses.
                    </p>
                  </div>
                )}
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={formPaymentMethod}
                      onChange={(e) =>
                        setFormPaymentMethod(e.target.value as DailyExpensePaymentMethod)
                      }
                      renderValue={(selected) => (
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(selected as DailyExpensePaymentMethod)}
                          <span className="font-semibold text-xs text-slate-900">{selected}</span>
                        </div>
                      )}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "6px", px: "8px" },
                      }}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method} value={method} sx={{ fontSize: "0.75rem" }}>
                          <div className="flex items-center gap-2.5 py-0.5">
                            {getPaymentMethodIcon(method)}
                            <span className="font-semibold text-xs text-slate-800">{method}</span>
                          </div>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="rounded-xl bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-5 py-2.5 text-xs font-bold text-white hover:from-[#073f30] hover:to-[#0b6e4e] disabled:opacity-50 transition shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
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
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">
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
                    Loan / EMI Type *
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value as MemberLoan["loanType"])}
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      <MenuItem value="Consumer EMI" sx={{ fontSize: "0.75rem" }}>Consumer EMI (Phone, Gadget, Camera)</MenuItem>
                      <MenuItem value="Credit Card Bill" sx={{ fontSize: "0.75rem" }}>Credit Card Bill (Monthly Statement)</MenuItem>
                      <MenuItem value="Credit Card EMI" sx={{ fontSize: "0.75rem" }}>Credit Card EMI (Zero or Flat)</MenuItem>
                      <MenuItem value="Car Loan" sx={{ fontSize: "0.75rem" }}>Car Loan</MenuItem>
                      <MenuItem value="Home Loan" sx={{ fontSize: "0.75rem" }}>Home Loan</MenuItem>
                      <MenuItem value="Personal Loan" sx={{ fontSize: "0.75rem" }}>Personal Loan</MenuItem>
                      <MenuItem value="Business Loan" sx={{ fontSize: "0.75rem" }}>Business Loan</MenuItem>
                      <MenuItem value="Borrowed from Family/Friend" sx={{ fontSize: "0.75rem" }}>Borrowed from Family/Friend</MenuItem>
                      <MenuItem value="Other" sx={{ fontSize: "0.75rem" }}>Other</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Total Principal Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Principal / Purchase Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="pointer-events-none select-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={totalPrincipal}
                    onChange={(e) => setTotalPrincipal(normalizeNumericInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Tenure Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenure / Duration (Months) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tenureMonthsInput}
                  onChange={(e) => setTenureMonthsInput(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  placeholder="e.g. 12"
                />
              </div>

              {/* Interest Rate & Start Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interest Rate %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0% if interest-free"
                    value={interestRatePercent}
                    onChange={(e) => setInterestRatePercent(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Month Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Real-time Calculated EMI Preview Box */}
              {totalPrincipal !== "" && Number(totalPrincipal) > 0 && (
                <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900">
                      Auto-Calculated Installment
                    </span>
                    <span className="text-xs font-bold font-mono text-teal-700">
                      {interestRatePercent ? `${interestRatePercent}% Interest` : "0% Interest EMI"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-teal-800/80 block">
                        Monthly Payment
                      </span>
                      <span className="text-lg font-black font-mono text-teal-700">
                        ৳{calculatedAddEmi.monthlyEmi.toLocaleString()}
                        <span className="text-xs font-normal text-teal-900">/mo</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-teal-800/80 block">
                        Total Repayable
                      </span>
                      <span className="text-lg font-black font-mono text-teal-900">
                        ৳{calculatedAddEmi.totalRepayable.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-700 font-medium pt-1 border-t border-teal-200/60">
                    ✓ Will automatically generate {calculatedAddEmi.segments.length} monthly segment rows with checkmark tracking
                  </p>
                </div>
              )}

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
              <div className="sticky -bottom-4 sm:-bottom-5 -mx-4 sm:-mx-5 bg-white/95 backdrop-blur-xs border-t border-slate-100 p-3 sm:p-4 flex items-center justify-end gap-2 shrink-0 mt-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
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
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">

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
                  <span className="pointer-events-none select-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={segmentAmount}
                    onChange={(e) => setSegmentAmount(normalizeNumericInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
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
                  <FormControl size="small" fullWidth>
                    <Select
                      value={segmentMethod}
                      onChange={(e) => setSegmentMethod(e.target.value as DailyExpensePaymentMethod)}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method} value={method} sx={{ fontSize: "0.75rem" }}>
                          {method}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: DELETE LOAN CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-sm my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6 text-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Obligation?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-slate-800">
                  {loanToDelete.loanTitle} (৳
                  {(
                    loanToDelete.totalRepayableAmount ||
                    loanToDelete.principalAmount ||
                    0
                  ).toLocaleString()}
                  )
                </strong>{" "}
                along with all {loanToDelete.repayments?.length || 0} repayment segments?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLoanToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoan}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Delete Obligation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SAVINGS CONFIRMATION */}
      {savingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-sm my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6 text-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Savings Scheme?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-slate-800">
                  {savingToDelete.title} ({savingToDelete.type})
                </strong>{" "}
                along with all recorded deposit history?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSavingToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSaving}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Delete Scheme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: DEDICATED SEPARATE LOAN SEGMENTS BREAKDOWN & MANAGEMENT       */}
      {/* ========================================================================= */}
      {viewingLoanSegments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {viewingLoanSegments.loanTitle}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {viewingLoanSegments.loanType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        viewingLoanSegments.status === "PAID_OFF"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {viewingLoanSegments.status === "PAID_OFF" ? "Fully Repaid" : "Active Repayment"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Lender: <strong className="text-slate-700">{viewingLoanSegments.lenderName}</strong>
                    {" · "}Started: {viewingLoanSegments.startDate}
                    {viewingLoanSegments.targetEndDate && ` · Target: ${viewingLoanSegments.targetEndDate}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditLoanModal(viewingLoanSegments)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                  title="Edit Loan Info"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewingLoanSegments(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              {/* Loan Financial Summary Bar */}
            {(() => {
              const totalP =
                viewingLoanSegments.totalRepayableAmount || viewingLoanSegments.principalAmount || 0;
              const repaid = (viewingLoanSegments.repayments || []).reduce(
                (sum, r) => sum + r.amount,
                0
              );
              const remaining = Math.max(0, totalP - repaid);
              const pct = totalP > 0 ? Math.min(100, Math.round((repaid / totalP) * 100)) : 0;
              return (
                <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 shrink-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Principal
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">
                        ৳{totalP.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Repaid
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-600 mt-0.5 block">
                        ৳{repaid.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Remaining Balance
                      </span>
                      <span className="font-mono text-sm font-bold text-amber-700 mt-0.5 block">
                        ৳{remaining.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Monthly Installment
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                        {viewingLoanSegments.monthlyEmiAmount
                          ? `৳${viewingLoanSegments.monthlyEmiAmount.toLocaleString()}/mo`
                          : "Flexible"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">Repayment Progress</span>
                      <span className="font-mono font-bold text-slate-900">
                        {pct}% ({viewingLoanSegments.repayments?.length || 0} segments)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Segments Header & Pay Button */}
            <div className="flex items-center justify-between pt-1 shrink-0">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Repayment Segments ({viewingLoanSegments.repayments?.length || 0})
              </h4>
              <button
                type="button"
                onClick={() => openPaySegmentModal(viewingLoanSegments)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Pay Another Segment</span>
              </button>
            </div>

            {/* Segments List (Scrollable) */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl divide-y divide-slate-100 min-h-[140px]">
              {!viewingLoanSegments.repayments || viewingLoanSegments.repayments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <p>No repayment segments logged yet for this loan.</p>
                  <button
                    type="button"
                    onClick={() => openPaySegmentModal(viewingLoanSegments)}
                    className="text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    + Record First Repayment Segment
                  </button>
                </div>
              ) : (
                viewingLoanSegments.repayments.map((segment: LoanRepaymentSegment, idx: number) => (
                  <div
                    key={segment.id || idx}
                    onClick={() => openEditSegmentModal(viewingLoanSegments.id, segment)}
                    className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-emerald-600">
                          ৳{segment.amount.toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {segment.paymentMethod}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-medium text-slate-700">
                          {segment.paymentDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {segment.notes || `Installment #${idx + 1}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSegmentModal(viewingLoanSegments.id, segment);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                        title="Edit Segment"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSegmentToDelete({ loanId: viewingLoanSegments.id, segment });
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Segment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-100 shrink-0 bg-white">
              <span className="text-[11px] text-slate-400">
                Click on any segment to edit or adjust details.
              </span>
              <button
                type="button"
                onClick={() => setViewingLoanSegments(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL: EDIT LOAN / BORROWING                                         */}
      {/* ========================================================================= */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Loan / Borrowing Portfolio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Editing <span className="font-semibold">{editingLoan.loanTitle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLoan(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLoan} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loan / Debt Title *
                </label>
                <input
                  type="text"
                  required
                  value={editLoanTitle}
                  onChange={(e) => setEditLoanTitle(e.target.value)}
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
                    value={editLenderName}
                    onChange={(e) => setEditLenderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loan Type *
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={editLoanType}
                      onChange={(e) => setEditLoanType(e.target.value as MemberLoan["loanType"])}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      <MenuItem value="Consumer EMI" sx={{ fontSize: "0.75rem" }}>Consumer EMI</MenuItem>
                      <MenuItem value="Credit Card Bill" sx={{ fontSize: "0.75rem" }}>Credit Card Bill (Monthly Statement)</MenuItem>
                      <MenuItem value="Credit Card EMI" sx={{ fontSize: "0.75rem" }}>Credit Card EMI</MenuItem>
                      <MenuItem value="Car Loan" sx={{ fontSize: "0.75rem" }}>Car Loan</MenuItem>
                      <MenuItem value="Home Loan" sx={{ fontSize: "0.75rem" }}>Home Loan</MenuItem>
                      <MenuItem value="Personal Loan" sx={{ fontSize: "0.75rem" }}>Personal Loan</MenuItem>
                      <MenuItem value="Business Loan" sx={{ fontSize: "0.75rem" }}>Business Loan</MenuItem>
                      <MenuItem value="Borrowed from Family/Friend" sx={{ fontSize: "0.75rem" }}>Borrowed from Family/Friend</MenuItem>
                      <MenuItem value="Other" sx={{ fontSize: "0.75rem" }}>Other</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Principal Borrowed (৳) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={editTotalPrincipal}
                    onChange={(e) => setEditTotalPrincipal(normalizeNumericInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={editLoanStatus}
                      onChange={(e) => setEditLoanStatus(e.target.value as MemberLoan["status"])}
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      <MenuItem value="ACTIVE" sx={{ fontSize: "0.75rem" }}>Active Repayment</MenuItem>
                      <MenuItem value="PAID_OFF" sx={{ fontSize: "0.75rem" }}>Fully Repaid</MenuItem>
                      <MenuItem value="DEFAULTED" sx={{ fontSize: "0.75rem" }}>Defaulted / Written Off</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly EMI / Installment (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={editMonthlyEmiAmount}
                    onChange={(e) => setEditMonthlyEmiAmount(e.target.value ? Number(e.target.value) : "")}
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
                    value={editInterestRatePercent}
                    onChange={(e) => setEditInterestRatePercent(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start / Borrow Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Payoff Date
                  </label>
                  <input
                    type="date"
                    value={editTargetEndDate}
                    onChange={(e) => setEditTargetEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editLoanNotes}
                  onChange={(e) => setEditLoanNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditLoan}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {savingEditLoan ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MODAL: EDIT REPAYMENT SEGMENT                                         */}
      {/* ========================================================================= */}
      {editingSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Repayment Segment
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Update installment record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSegment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSegment} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="pointer-events-none select-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-base text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={editSegmentAmount}
                    onChange={(e) => setEditSegmentAmount(normalizeNumericInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editSegmentDate}
                    onChange={(e) => setEditSegmentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={editSegmentMethod}
                      onChange={(e) => setEditSegmentMethod(e.target.value as DailyExpensePaymentMethod)}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method} value={method} sx={{ fontSize: "0.75rem" }}>
                          {method}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Segment Notes / Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Installment #3, Paid via mobile banking"
                  value={editSegmentNotes}
                  onChange={(e) => setEditSegmentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSegment(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditSegment}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {savingEditSegment ? "Saving..." : "Update Segment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. MODAL: DELETE REPAYMENT SEGMENT CONFIRMATION                          */}
      {/* ========================================================================= */}
      {segmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete Repayment Segment?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete this payment of{" "}
                <strong className="text-slate-900 font-mono">
                  ৳{segmentToDelete.segment.amount.toLocaleString()}
                </strong>{" "}
                from {segmentToDelete.segment.paymentDate}? The remaining loan balance will be recalculated.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSegmentToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSegment}
                onClick={handleConfirmDeleteSegment}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {deletingSegment ? "Deleting..." : "Delete Segment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 14. MODAL: CATEGORY TREND GRAPH & LAST MONTH DIFFERENTIATION             */}
      {/* ========================================================================= */}
      {trendModalOpen && (
        <CategoryTrendModal
          isOpen={trendModalOpen}
          onClose={() => setTrendModalOpen(false)}
          initialCategory={trendModalCategory}
          allExpenses={memberExpenses}
          availableCategories={
            allCategoryOptions.length > 0
              ? [...CATEGORIES.map((c) => c.label), ...allCategoryOptions]
              : CATEGORIES.map((c) => c.label)
          }
        />
      )}
    </div>
  );
}
