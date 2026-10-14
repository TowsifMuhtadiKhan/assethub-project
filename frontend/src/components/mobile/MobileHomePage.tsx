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
  Globe,
} from "lucide-react";
import { listTasks } from "../../services/taskService";
import { listDocuments } from "../../services/documentService";
import { listVehicles } from "../../services/vehicleService";
import { listProperties } from "../../services/propertyService";
import { listWarranties } from "../../services/warrantyService";
import { listDailyExpenses } from "../../services/dailyExpenseService";
import { getUserSettings } from "../../services/settingsService";
import { getUserEmail } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export function MobileHomePage() {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [userName, setUserName] = useState("");
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

  const formattedAmount = hideAmount
    ? "৳ ••••"
    : monthlyExpenseTotal > 0
    ? `৳ ${monthlyExpenseTotal.toLocaleString()}`
    : "৳ 0";

  return (
    <div className="space-y-3 pb-3">
      {/* 1. TOP PROFILE & SUMMARY STATS (Clean, no nested boxes) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 leading-tight">
                {getGreeting()}
              </div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {userName || (language === "bn" ? "পরিবার প্রধান" : "Family Head")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-language English / Bangla Pill Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 active:scale-95 transition cursor-pointer"
              title="Change Language / ভাষা পরিবর্তন"
            >
              <Globe className="h-3 w-3 text-slate-500" />
              <span>{language === "en" ? "বাংলা" : "ENG"}</span>
            </button>

            {/* Status Pill */}
            <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{language === "bn" ? "ভল্ট সক্রিয়" : "Vault Active"}</span>
            </div>
          </div>
        </div>

        {/* Flat 3-Metric Summary Bar (Divided by subtle lines instead of nested border boxes) */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div
            onClick={() => navigate("/my-life/tasks")}
            className="cursor-pointer active:scale-95 transition hover:opacity-80 px-1"
          >
            <div className="text-sm font-bold font-mono text-slate-900 leading-tight">
              {pendingTasksCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {language === "bn" ? "করণীয় টাস্ক" : "To-Do Tasks"}
            </div>
          </div>

          <div
            onClick={() => navigate("/my-life/expenses")}
            className="cursor-pointer active:scale-95 transition hover:opacity-80 px-1"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-bold font-mono text-slate-900 truncate leading-tight">
                {formattedAmount}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={toggleHideAmount}
                className="text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer outline-none shrink-0"
                title={hideAmount ? "Show amount" : "Hide amount"}
              >
                {hideAmount ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {language === "bn" ? "চলতি মাস" : "This Month"}
            </div>
          </div>

          <div
            onClick={() => navigate("/documents/vault")}
            className="cursor-pointer active:scale-95 transition hover:opacity-80 px-1"
          >
            <div className="text-sm font-bold font-mono text-slate-900 leading-tight">
              {expiringDocsCount > 0 ? `${expiringDocsCount} Due` : `${totalDocsCount} Saved`}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {language === "bn" ? "ডকুমেন্টস" : "Documents"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. GROUP 1: DAILY SERVICES (Clean borderless grid matching bKash style) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {language === "bn" ? "সার্ভিসসমূহ" : "Daily Services"}
          </h3>
          <span className="text-[10px] font-medium text-slate-400">
            {language === "bn" ? "টাস্ক, খরচ ও ভল্ট" : "To-Do, Expenses & Vault"}
          </span>
        </div>

        {/* 4-Column Icon Grid: Clean, open, NO nested grey boxes */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Tasks */}
          <button
            type="button"
            onClick={() => navigate("/my-life/tasks")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition shadow-2xs mb-1.5">
              <CheckSquare className="h-5 w-5 stroke-[2]" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-rose-500 ring-2 ring-white shadow-xs">
                  {pendingTasksCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "টাস্ক" : "Tasks"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              {pendingTasksCount > 0 ? `${pendingTasksCount} to-do` : "Done"}
            </span>
          </button>

          {/* Daily Expense */}
          <button
            type="button"
            onClick={() => navigate("/my-life/expenses")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition shadow-2xs mb-1.5">
              <Wallet className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "দৈনিক খরচ" : "Expense"}
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none">
              {formattedAmount}
            </span>
          </button>

          {/* Document Vault */}
          <button
            type="button"
            onClick={() => navigate("/documents/vault")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition shadow-2xs mb-1.5">
              <FolderLock className="h-5 w-5 stroke-[2]" />
              {expiringDocsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-rose-500 ring-2 ring-white shadow-xs">
                  {expiringDocsCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "ভল্ট" : "Vault"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              {totalDocsCount} saved
            </span>
          </button>

          {/* Quick Add */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("lifenest:open-quick-add"))}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition shadow-2xs mb-1.5">
              <Plus className="h-5 w-5 stroke-[2.25]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "নতুন যোগ" : "Quick Add"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              + Record
            </span>
          </button>
        </div>
      </div>

      {/* 3. GROUP 2: ASSETS & PROPERTIES (Matching bKash other services style) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {language === "bn" ? "সম্পদ ও সম্পত্তি" : "Assets & Properties"}
          </h3>
          <span className="text-[10px] font-medium text-slate-400">
            {language === "bn" ? "গাড়ি, ফ্ল্যাট ও ওয়ারেন্টি" : "Vehicles, Units & Cards"}
          </span>
        </div>

        {/* 4-Column Icon Grid: Clean, open, NO nested grey boxes */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Vehicles */}
          <button
            type="button"
            onClick={() => navigate("/assets/vehicles")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition shadow-2xs mb-1.5">
              <Car className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "যানবাহন" : "Vehicles"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              {vehiclesCount > 0 ? `${vehiclesCount} saved` : "Cars"}
            </span>
          </button>

          {/* Properties */}
          <button
            type="button"
            onClick={() => navigate("/rentals/properties")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition shadow-2xs mb-1.5">
              <Building2 className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "সম্পত্তি" : "Property"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              {propertiesCount > 0 ? `${propertiesCount} units` : "Rent"}
            </span>
          </button>

          {/* Warranties */}
          <button
            type="button"
            onClick={() => navigate("/assets/warranties")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition shadow-2xs mb-1.5">
              <ShieldCheck className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "ওয়ারেন্টি" : "Warranty"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              {warrantiesCount > 0 ? `${warrantiesCount} cards` : "Bills"}
            </span>
          </button>

          {/* Family Access Control */}
          <button
            type="button"
            onClick={() => navigate("/settings/access-control")}
            className="flex flex-col items-center justify-start text-center cursor-pointer active:scale-95 transition group"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition shadow-2xs mb-1.5">
              <Users className="h-5 w-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 leading-tight group-hover:text-slate-950">
              {language === "bn" ? "অ্যাক্সেস" : "Access"}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
              Security
            </span>
          </button>
        </div>
      </div>

      {/* 4. EXPIRING DOCUMENT ALERT BANNER (If any) */}
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
