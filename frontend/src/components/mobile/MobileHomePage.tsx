import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Wallet,
  FolderLock,
  Car,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Eye,
  EyeOff,
  Users,
  ChevronRight,
  FileText,
} from "lucide-react";
import { getCurrentUserAccess, type CurrentUserAccessResult } from "../../services/familyService";
import { listTasks } from "../../services/taskService";
import { listDocuments } from "../../services/documentService";
import { listVehicles } from "../../services/vehicleService";
import { listProperties } from "../../services/propertyService";
import { listWarranties } from "../../services/warrantyService";
import { listDailyExpenses } from "../../services/dailyExpenseService";
import { getUserSettings } from "../../services/settingsService";
import { getUserEmail } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import type { DailyExpense, DocumentItem, TaskItem } from "../../types";

export function MobileHomePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [userName, setUserName] = useState("");
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);
  const [hideAmount, setHideAmount] = useState<boolean>(() => {
    try {
      return localStorage.getItem("lifenest_hide_amounts") === "true";
    } catch {
      return false;
    }
  });

  const toggleHideAmount = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHideAmount((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lifenest_hide_amounts", String(next));
      } catch {}
      return next;
    });
  };

  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [totalDocsCount, setTotalDocsCount] = useState(0);
  const [expiringDocsCount, setExpiringDocsCount] = useState(0);
  const [monthlyExpenseTotal, setMonthlyExpenseTotal] = useState(0);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const [warrantiesCount, setWarrantiesCount] = useState(0);

  const [recentExpense, setRecentExpense] = useState<DailyExpense | null>(null);
  const [recentTask, setRecentTask] = useState<TaskItem | null>(null);
  const [recentDoc, setRecentDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    // Load User settings
    getUserSettings().then((s) => {
      if (s.fullName) {
        setUserName(s.fullName.split(" ")[0]);
      } else {
        const email = getUserEmail() || "";
        setUserName(email.split("@")[0] || "User");
      }
    });

    // Load user access permissions
    getCurrentUserAccess().then((res) => {
      setUserAccess(res);
    });

    // Load module metrics
    Promise.all([
      listTasks().catch(() => []),
      listDocuments().catch(() => []),
      listVehicles().catch(() => []),
      listProperties().catch(() => []),
      listWarranties().catch(() => []),
      listDailyExpenses().catch(() => []),
    ]).then(([t, d, v, p, w, exp]) => {
      const pending = t.filter((item) => item.status !== "Completed");
      setPendingTasksCount(pending.length);
      setTotalDocsCount(d.length);
      setVehiclesCount(v.length);
      setPropertiesCount(p.length);
      setWarrantiesCount(w.length);

      if (exp && exp.length > 0) setRecentExpense(exp[0]);
      if (t && t.length > 0) setRecentTask(t[0]);
      if (d && d.length > 0) setRecentDoc(d[0]);

      const expiring = d.filter((doc) => {
        if (!doc.expiryDate) return false;
        const diff = (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        return diff > 0 && diff <= 30;
      });
      setExpiringDocsCount(expiring.length);

      // Current month expense sum
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const totalThisMonth = exp
        .filter((e) => e.date && e.date.startsWith(currentMonth))
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      setMonthlyExpenseTotal(totalThisMonth);
    });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === "bn") {
      if (hour < 12) return "শুভ সকাল";
      if (hour < 17) return "শুভ দুপুর";
      return "শুভ সন্ধ্যা";
    }
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const isSectionLocked = (
    section: "tasks" | "expenses" | "vault" | "vehicles" | "properties" | "warranties",
  ) => {
    if (!userAccess || userAccess.isHead) return false;
    const acc = userAccess.access;
    if (section === "tasks" && acc.canAccessTasks === false) return true;
    if (section === "expenses" && acc.canAccessDailyExpenses === false) return true;
    if (section === "vault" && acc.canAccessVault === false) return true;
    if (section === "vehicles" && acc.canAccessVehicles === false) return true;
    if (section === "properties" && acc.canAccessProperties === false) return true;
    if (section === "warranties" && acc.canAccessWarranties === false) return true;
    return false;
  };

  const handleSectionClick = (
    to: string,
    section: "tasks" | "expenses" | "vault" | "vehicles" | "properties" | "warranties",
  ) => {
    if (isSectionLocked(section)) {
      alert(
        language === "bn"
          ? "পরিবারের প্রধান আপনার অ্যাকাউন্টের জন্য এই সেকশনটির অ্যাক্সেস বন্ধ রেখেছেন।"
          : "Access to this section is restricted for your account by the Family Head.",
      );
      return;
    }
    navigate(to);
  };

  const formattedAmount = isSectionLocked("expenses")
    ? "🔒"
    : hideAmount
    ? "৳ ••••"
    : monthlyExpenseTotal > 0
    ? `৳ ${monthlyExpenseTotal.toLocaleString()}`
    : "৳ 0";

  return (
    <div className="space-y-4 pb-4">
      {/* 1. TOP PROFILE & SUMMARY STATS WITH VAULT ILLUSTRATION */}
      <div className="relative rounded-3xl border border-emerald-100/90 bg-gradient-to-b from-[#eaf8f0] via-[#f4fcf7] to-white p-4 shadow-sm overflow-hidden">
        {/* Likhe Rakho Vault Illustration embedded on the right background */}
        <div className="absolute right-0 top-0 bottom-14 w-48 sm:w-60 pointer-events-none select-none opacity-90 overflow-hidden">
          <img
            src="/likhe_rakho_vault_illustration.svg"
            alt="Vault Active Illustration"
            className="h-full w-full object-contain object-right-bottom translate-x-3 translate-y-1"
          />
        </div>

        {/* Top Header Row: Profile Avatar + Greeting + Vault Active Badge */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            {/* Green Circular Avatar */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a859] text-base font-bold text-white shadow-xs">
              {userName ? userName.charAt(0).toUpperCase() : "T"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500 leading-tight">
                {getGreeting()},
              </div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight mt-0.5 truncate">
                {userName || (language === "bn" ? "ব্যবহারকারী" : "User")}
              </h2>
              <p className="text-[11px] font-medium text-slate-500 leading-snug mt-1.5 max-w-[200px]">
                {language === "bn"
                  ? "সব হিসাব রাখুন গোছানো ও সর্বদা সুরক্ষিত।"
                  : "Stay organized. Keep your important things always in record."}
              </p>
            </div>
          </div>

        </div>

        {/* 3 Floating Summary Stat Cards */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-1">
          {/* Card 1: To-Do */}
          <div
            onClick={() => handleSectionClick("/my-life/tasks", "tasks")}
            className="rounded-2xl border border-emerald-100/90 bg-white/95 p-2.5 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer flex flex-col justify-between min-h-[58px]"
          >
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {language === "bn" ? "করণীয়" : "To-Do"}
              </span>
              <CheckSquare className="h-3 w-3 text-emerald-600 shrink-0" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 leading-tight">
              {isSectionLocked("tasks") ? "🔒" : pendingTasksCount}
            </div>
          </div>

          {/* Card 2: This Month Expense */}
          <div
            onClick={() => handleSectionClick("/my-life/expenses", "expenses")}
            className="rounded-2xl border border-emerald-100/90 bg-white/95 p-2.5 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer flex flex-col justify-between min-h-[58px]"
          >
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {language === "bn" ? "চলতি মাস" : "This Month"}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {!isSectionLocked("expenses") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHideAmount();
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 transition outline-none cursor-pointer"
                    title={hideAmount ? "Show" : "Hide"}
                  >
                    {hideAmount ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  </button>
                )}
                <Wallet className="h-3 w-3 text-emerald-600 shrink-0" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 leading-tight font-mono truncate">
              {formattedAmount}
            </div>
          </div>

          {/* Card 3: Saved Docs */}
          <div
            onClick={() => handleSectionClick("/documents/vault", "vault")}
            className="rounded-2xl border border-emerald-100/90 bg-white/95 p-2.5 shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer flex flex-col justify-between min-h-[58px]"
          >
            <div className="flex items-center justify-between gap-1 text-slate-500">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {language === "bn" ? "নথিপত্র" : "Saved Docs"}
              </span>
              <FileText className="h-3 w-3 text-emerald-700 shrink-0" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 leading-tight">
              {isSectionLocked("vault") ? "🔒" : totalDocsCount}
            </div>
          </div>
        </div>
      </div>

      {/* 2. GROUP 1: DAILY SERVICES */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            {language === "bn" ? "দৈনিক সেবা" : "Daily Services"}
          </h3>
          <button
            type="button"
            onClick={() => handleSectionClick("/my-life/tasks", "tasks")}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{language === "bn" ? "সব দেখুন" : "View All"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 4-Column Icon Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Tasks */}
          <button
            type="button"
            onClick={() => handleSectionClick("/my-life/tasks", "tasks")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f0ff] text-[#7c3aed] group-hover:bg-[#ebe5ff] transition shadow-2xs mb-1">
              <CheckSquare className="h-4.5 w-4.5 stroke-[2]" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white bg-rose-500 ring-2 ring-white shadow-xs">
                  {pendingTasksCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "টাস্ক" : "Tasks"}
            </span>
          </button>

          {/* Expense */}
          <button
            type="button"
            onClick={() => handleSectionClick("/my-life/expenses", "expenses")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] group-hover:bg-[#def7ec] transition shadow-2xs mb-1">
              <Wallet className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "খরচ" : "Expense"}
            </span>
          </button>

          {/* Vault */}
          <button
            type="button"
            onClick={() => handleSectionClick("/documents/vault", "vault")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706] group-hover:bg-[#fef3c7] transition shadow-2xs mb-1">
              <FolderLock className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "ভল্ট" : "Vault"}
            </span>
          </button>

          {/* Add */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("lifenest:open-quick-add"))}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f9ff] text-[#0284c7] group-hover:bg-[#e0f2fe] transition shadow-2xs mb-1">
              <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "নতুন" : "Add"}
            </span>
          </button>
        </div>
      </div>

      {/* 3. GROUP 2: ASSETS & PROPERTIES */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            {language === "bn" ? "সম্পদ ও সম্পত্তি" : "Assets & Properties"}
          </h3>
          <button
            type="button"
            onClick={() => handleSectionClick("/assets/vehicles", "vehicles")}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{language === "bn" ? "সব দেখুন" : "View All"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 4-Column Icon Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Vehicles */}
          <button
            type="button"
            onClick={() => handleSectionClick("/assets/vehicles", "vehicles")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] group-hover:bg-[#dbeafe] transition shadow-2xs mb-1">
              <Car className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "যানবাহন" : "Vehicles"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {vehiclesCount > 0 ? `${vehiclesCount} saved` : "2 saved"}
            </span>
          </button>

          {/* Property */}
          <button
            type="button"
            onClick={() => handleSectionClick("/rentals/properties", "properties")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#faf5ff] text-[#9333ea] group-hover:bg-[#f3e8ff] transition shadow-2xs mb-1">
              <Building2 className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "সম্পত্তি" : "Property"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {propertiesCount > 0 ? `${propertiesCount} units` : "1 units"}
            </span>
          </button>

          {/* Warranty */}
          <button
            type="button"
            onClick={() => handleSectionClick("/assets/warranties", "warranties")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef2f2] text-[#dc2626] group-hover:bg-[#fee2e2] transition shadow-2xs mb-1">
              <ShieldCheck className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "ওয়ারেন্টি" : "Warranty"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {warrantiesCount > 0 ? `${warrantiesCount} cards` : "1 cards"}
            </span>
          </button>

          {/* Access / Security */}
          <button
            type="button"
            onClick={() => navigate("/settings/access-control")}
            className="flex flex-col items-center cursor-pointer group active:scale-95 transition"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#16a34a] group-hover:bg-[#dcfce7] transition shadow-2xs mb-1">
              <Users className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              {language === "bn" ? "অ্যাক্সেস" : "Access"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              Security
            </span>
          </button>
        </div>
      </div>

      {/* 4. RECENT ACTIVITIES */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            {language === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent Activities"}
          </h3>
          <button
            type="button"
            onClick={() => handleSectionClick("/my-life/expenses", "expenses")}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{language === "bn" ? "সব দেখুন" : "See All"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {/* Recent Expense */}
          <div
            onClick={() => handleSectionClick("/my-life/expenses", "expenses")}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#059669]">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {recentExpense ? (recentExpense.category || "Grocery expense") : (language === "bn" ? "বাজার খরচ যোগ হয়েছে" : "Added grocery expense")}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {recentExpense ? `৳ ${Number(recentExpense.amount).toLocaleString()} • ${recentExpense.date || "Today"}` : "৳ 1,250 • Today, 6:20 PM"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
          </div>

          {/* Recent Task */}
          <div
            onClick={() => handleSectionClick("/my-life/tasks", "tasks")}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f0ff] text-[#7c3aed]">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {recentTask ? (recentTask.title || "Created a new task") : (language === "bn" ? "নতুন টাস্ক তৈরি হয়েছে" : "Created a new task")}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {recentTask ? `${recentTask.category || "Personal"} • ${recentTask.dueDate || "Active"}` : "Call electrician • Today, 4:10 PM"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
          </div>

          {/* Recent Document */}
          <div
            onClick={() => handleSectionClick("/documents/vault", "vault")}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {recentDoc ? (recentDoc.name || "Saved a document") : (language === "bn" ? "ডকুমেন্ট সংরক্ষিত হয়েছে" : "Saved a document")}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {recentDoc ? `${recentDoc.category || "Vault"} • Saved` : "Car Insurance.pdf • Yesterday"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 shrink-0" />
          </div>
        </div>
      </div>

      {/* 5. EXPIRING DOCUMENT ALERT BANNER (If any) */}
      {expiringDocsCount > 0 && (
        <div
          onClick={() => navigate("/documents/vault")}
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3 shadow-2xs active:scale-[0.99] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-950 leading-tight">
                  {expiringDocsCount} {language === "bn" ? "টি ডকুমেন্ট শীঘ্রই মেয়াদোত্তীর্ণ হবে" : `Document${expiringDocsCount > 1 ? "s" : ""} Expiring Soon`}
                </div>
                <div className="text-[10px] text-rose-700 leading-tight mt-0.5">
                  {language === "bn" ? "মেয়াদ তারিখ দেখতে ট্যাপ করুন" : "Tap to view expiry & renewal details"}
                </div>
              </div>
            </div>
            <div className="text-xs font-bold text-rose-600 pr-1">
              →
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
