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
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { listTasks } from "../../services/taskService";
import { listDocuments } from "../../services/documentService";
import { listVehicles } from "../../services/vehicleService";
import { listProperties } from "../../services/propertyService";
import { listWarranties } from "../../services/warrantyService";
import { listDailyExpenses } from "../../services/dailyExpenseService";
import { getUserSettings } from "../../services/settingsService";
import { getUserEmail } from "../../services/api";

export function MobileHomePage() {
  const navigate = useNavigate();
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
    <div className="space-y-2.5 pb-2">
      {/* 1. Clean Top Greeting & Metrics Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="text-[10px] font-medium text-slate-400 leading-tight">
                {getGreeting()}
              </div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {userName || "Family Head"}
              </h2>
            </div>
          </div>

          <div className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Vault Active</span>
          </div>
        </div>

        {/* Clean 3-Chip Metrics */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center">
          <div
            onClick={() => navigate("/my-life/tasks")}
            className="rounded-xl bg-slate-50/70 py-1.5 px-1 border border-slate-200/80 cursor-pointer active:scale-95 transition hover:bg-slate-100/80"
          >
            <div className="text-xs font-bold text-slate-800">{pendingTasksCount}</div>
            <div className="text-[9px] text-slate-400 font-medium">To-Do Tasks</div>
          </div>
          <div
            onClick={() => navigate("/my-life/expenses")}
            className="rounded-xl bg-slate-50/70 py-1.5 px-1 border border-slate-200/80 cursor-pointer active:scale-95 transition hover:bg-slate-100/80"
          >
            <div className="flex items-center justify-center gap-1">
              <div className="text-xs font-bold text-slate-800 truncate">
                {formattedAmount}
              </div>
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
            <div className="text-[9px] text-slate-400 font-medium">This Month</div>
          </div>
          <div
            onClick={() => navigate("/documents/vault")}
            className="rounded-xl bg-slate-50/70 py-1.5 px-1 border border-slate-200/80 cursor-pointer active:scale-95 transition hover:bg-slate-100/80"
          >
            <div className="text-xs font-bold text-slate-800">
              {expiringDocsCount > 0 ? `${expiringDocsCount} Due` : `${totalDocsCount} Saved`}
            </div>
            <div className="text-[9px] text-slate-400 font-medium">
              {expiringDocsCount > 0 ? "Expiring" : "Documents"}
            </div>
          </div>
        </div>
      </div>

      {/* GROUP 1: DAILY LIFE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <CheckSquare className="h-3 w-3" />
            </span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Daily Life
            </h3>
          </div>
          <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/60">
            To-Do & Expenses
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Tasks Item */}
          <button
            type="button"
            onClick={() => navigate("/my-life/tasks")}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition text-left cursor-pointer"
          >
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <CheckSquare className="h-3.5 w-3.5 stroke-[1.85]" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white bg-rose-500 ring-1 ring-white">
                  {pendingTasksCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Tasks</div>
              <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                {pendingTasksCount > 0 ? `${pendingTasksCount} to-do` : "All finished"}
              </div>
            </div>
          </button>

          {/* Daily Expense Item */}
          <button
            type="button"
            onClick={() => navigate("/my-life/expenses")}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition text-left cursor-pointer"
          >
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Wallet className="h-3.5 w-3.5 stroke-[1.85]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 leading-tight">Expense</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={toggleHideAmount}
                  className="text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer outline-none"
                  title={hideAmount ? "Show amount" : "Hide amount"}
                >
                  {hideAmount ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5 font-mono">
                {formattedAmount}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* GROUP 2: IMPORTANT PAPERS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <FolderLock className="h-3 w-3" />
            </span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Important Papers
            </h3>
          </div>
          <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/60">
            Document Vault
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/documents/vault")}
          className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-98 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <FolderLock className="h-3.5 w-3.5 stroke-[1.85]" />
              {expiringDocsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white bg-rose-500 ring-1 ring-white">
                  {expiringDocsCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Document Vault</div>
              <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                {expiringDocsCount > 0
                  ? `${expiringDocsCount} due for renewal`
                  : `${totalDocsCount} documents secured`}
              </div>
            </div>
          </div>
          <div className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 shrink-0">
            <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
          </div>
        </button>
      </div>

      {/* GROUP 3: VEHICLES & HOUSES */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Car className="h-3 w-3" />
            </span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Vehicles & Houses
            </h3>
          </div>
          <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/60">
            Assets
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Vehicle Item */}
          <button
            type="button"
            onClick={() => navigate("/assets/vehicles")}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition text-center cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mb-1">
              <Car className="h-3.5 w-3.5 stroke-[1.85]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 leading-tight">Vehicle</span>
            <span className="text-[9px] text-slate-500 font-normal truncate mt-0.5">
              {vehiclesCount > 0 ? `${vehiclesCount} saved` : "Cars & Bikes"}
            </span>
          </button>

          {/* Property Item */}
          <button
            type="button"
            onClick={() => navigate("/rentals/properties")}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition text-center cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mb-1">
              <Building2 className="h-3.5 w-3.5 stroke-[1.85]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 leading-tight">Property</span>
            <span className="text-[9px] text-slate-500 font-normal truncate mt-0.5">
              {propertiesCount > 0 ? `${propertiesCount} units` : "Flats & Rent"}
            </span>
          </button>

          {/* Warranty Item */}
          <button
            type="button"
            onClick={() => navigate("/assets/warranties")}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition text-center cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 stroke-[1.85]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 leading-tight">Warranty</span>
            <span className="text-[9px] text-slate-500 font-normal truncate mt-0.5">
              {warrantiesCount > 0 ? `${warrantiesCount} cards` : "Cards & Bills"}
            </span>
          </button>
        </div>
      </div>

      {/* Renewal Banner Alert (Only shown if documents expiring) */}
      {expiringDocsCount > 0 && (
        <div
          onClick={() => navigate("/documents/vault")}
          className="rounded-xl border border-rose-200 bg-rose-50/90 p-2.5 shadow-2xs active:scale-[0.99] transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-500 text-white shadow-xs">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-900 leading-tight">
                  {expiringDocsCount} Document{expiringDocsCount > 1 ? "s" : ""} Expiring
                </div>
                <div className="text-[10px] text-rose-700 leading-tight">
                  Tap to view validity dates
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-rose-600" />
          </div>
        </div>
      )}

      {/* Quick Actions (Clean Neutral 1-line Action Buttons) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
          Quick Actions
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => navigate("/my-life/tasks")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded-xl bg-slate-50/70 border border-slate-200/80 active:scale-95 transition cursor-pointer hover:bg-slate-100"
          >
            <Plus className="h-3 w-3 text-slate-500 stroke-[2.25]" />
            <span className="text-[11px] font-semibold text-slate-700">Task</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/my-life/expenses")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded-xl bg-slate-50/70 border border-slate-200/80 active:scale-95 transition cursor-pointer hover:bg-slate-100"
          >
            <Plus className="h-3 w-3 text-slate-500 stroke-[2.25]" />
            <span className="text-[11px] font-semibold text-slate-700">Expense</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/documents/vault")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded-xl bg-slate-50/70 border border-slate-200/80 active:scale-95 transition cursor-pointer hover:bg-slate-100"
          >
            <Plus className="h-3 w-3 text-slate-500 stroke-[2.25]" />
            <span className="text-[11px] font-semibold text-slate-700">Paper</span>
          </button>
        </div>
      </div>
    </div>
  );
}
