import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Calendar,
  Building2,
  Percent,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  X,
} from "lucide-react";
import {
  getMemberSavingsById,
  toggleSavingsDepositPaid,
  addSavingsDepositLog,
  deleteSavingsDepositLog,
} from "../services/dailyExpenseService";
import type { MemberSavings, SavingsDepositLog } from "../types";
import { BrandLogoLoader } from "../components/common/LoadingStates";

export function DpsFdrDetailPage() {
  const { savingsId } = useParams<{ savingsId: string }>();
  const navigate = useNavigate();

  const [savings, setSavings] = useState<MemberSavings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);
  const [syncToDailyExpenses, setSyncToDailyExpenses] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual log modal
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLogAmount, setNewLogAmount] = useState<number | "">("");
  const [newLogMonth, setNewLogMonth] = useState("");
  const [newLogDueDate, setNewLogDueDate] = useState("");

  useEffect(() => {
    if (!savingsId) return;
    loadSavings();
  }, [savingsId]);

  async function loadSavings() {
    setLoading(true);
    try {
      if (savingsId) {
        const found = await getMemberSavingsById(savingsId);
        setSavings(found);
      }
    } catch (err) {
      console.error("Error loading savings:", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  const { totalPaid, remainingBalance, progressPercent, paidCount, totalCount, totalTarget } = useMemo(() => {
    if (!savings) return { totalPaid: 0, remainingBalance: 0, progressPercent: 0, paidCount: 0, totalCount: 0, totalTarget: 0 };
    const logs = savings.depositLogs || [];
    const totalCount = logs.length;
    const paidLogs = logs.filter((l) => l.isPaid);
    const paidCount = paidLogs.length;
    const totalPaid = paidLogs.reduce((sum, l) => sum + (l.amount || 0), 0);

    const isDPS = savings.type === "DPS";
    const totalTarget = isDPS
      ? (savings.monthlyInstallment || 0) * (savings.tenureMonths || 12)
      : (savings.principalAmount || 0);

    const remainingBalance = Math.max(0, totalTarget - totalPaid);
    const progressPercent = totalCount > 0 ? Math.min(100, Math.round((paidCount / totalCount) * 100)) : 0;

    return { totalPaid, remainingBalance, progressPercent, paidCount, totalCount, totalTarget };
  }, [savings]);

  async function handleTogglePaid(log: SavingsDepositLog) {
    if (!savings || updatingLogId) return;
    setUpdatingLogId(log.id);
    try {
      const today = new Date().toISOString().split("T")[0];
      const updated = await toggleSavingsDepositPaid(
        savings.id,
        log.id,
        today,
        syncToDailyExpenses,
        log.paymentMethod || "Bank Card"
      );
      setSavings(updated);
      const nowPaid = !log.isPaid;
      const actionText = savings.type === "DPS" ? "Deposit" : "Profit";
      showToast(
        nowPaid
          ? `✓ ${actionText} #${log.installmentNo || ""} (৳${log.amount.toLocaleString()}) marked as RECEIVED / PAID!`
          : `${actionText} #${log.installmentNo || ""} marked as Pending.`
      );
    } catch (err: any) {
      console.error("Failed to toggle savings deposit:", err);
      showToast("Error updating deposit status");
    } finally {
      setUpdatingLogId(null);
    }
  }

  async function handleAddCustomLog(e: React.FormEvent) {
    e.preventDefault();
    if (!savings || !newLogAmount) return;
    try {
      const updated = await addSavingsDepositLog(
        savings.id,
        {
          amount: Number(newLogAmount),
          dueDate: newLogDueDate || new Date().toISOString().split("T")[0],
          monthLabel: newLogMonth || undefined,
          paymentMethod: "Bank Card",
        },
        false
      );
      setSavings(updated);
      setShowAddLogModal(false);
      setNewLogAmount("");
      setNewLogMonth("");
      setNewLogDueDate("");
      showToast("Installment entry added!");
    } catch (err) {
      console.error(err);
      showToast("Failed to add entry");
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!savings) return;
    if (!confirm("Are you sure you want to remove this schedule entry?")) return;
    try {
      const updated = await deleteSavingsDepositLog(savings.id, logId);
      setSavings(updated);
      showToast("Entry removed.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete entry");
    }
  }

  if (loading) {
    return (
      <BrandLogoLoader
        message="Loading Savings Plan & Ledger..."
        subtitle="Calculating maturity returns and recurring deposit logs"
      />
    );
  }

  if (!savings) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Savings Plan Not Found</h2>
          <p className="text-slate-500 mt-2 mb-6">
            The requested DPS or FDR schedule could not be located.
          </p>
          <Link
            to="/my-life/expenses?tab=savings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold shadow hover:bg-teal-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Savings & DPS
          </Link>
        </div>
      </div>
    );
  }

  const isDPS = savings.type === "DPS";
  const isMatured = savings.status === "MATURED" || (totalCount > 0 && paidCount >= totalCount);

  return (
    <div className="w-full text-slate-900 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/my-life/expenses?tab=savings")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700 transition py-1.5 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" />
          <span>Back to Savings & DPS</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isMatured
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }`}
          >
            {isMatured ? "✓ Matured / Completed" : "Active Plan"}
          </span>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Header Hero Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/90 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  {savings.type} Scheme
                </span>
                {savings.institutionName && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    {savings.institutionName}
                  </span>
                )}
                {savings.accountNumber && (
                  <span className="text-xs font-mono text-slate-400">
                    A/C: {savings.accountNumber}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {savings.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Start: <strong className="text-slate-700">{savings.startDate}</strong>
                </span>
                {savings.maturityDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Maturity: <strong className="text-slate-700">{savings.maturityDate}</strong>
                  </span>
                )}
                {savings.interestRate !== undefined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    Interest/Profit:{" "}
                    <strong className="text-slate-700">{savings.interestRate}%</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics Badge */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-right pr-2">
                <div className="text-xs text-slate-500 font-medium">
                  {isDPS ? "Monthly Deposit" : "Principal Amount"}
                </div>
                <div className="text-xl md:text-2xl font-black text-emerald-600">
                  ৳{((isDPS ? savings.monthlyInstallment : savings.principalAmount) || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400">
                  {savings.tenureMonths ? `${savings.tenureMonths} Months Tenure` : `${totalCount} Cycles`}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar & KPI Grid */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-600">
                {isDPS ? "Deposit Progress" : "Profit Collection Progress"} ({paidCount} of {totalCount} Cycles Completed)
              </span>
              <span className="text-emerald-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#064e3b] to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-medium text-slate-500">
                  {isDPS ? "Total Expected Deposits" : "Principal Investment"}
                </span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  ৳{totalTarget.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Maturity Value: ~৳{(savings.maturityAmount || totalTarget).toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                <span className="text-xs font-medium text-emerald-800">
                  {isDPS ? "Total Deposited" : "Total Profit Collected"}
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  ৳{totalPaid.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  {paidCount} installment{paidCount === 1 ? "" : "s"} completed
                </div>
              </div>

              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200">
                <span className="text-xs font-medium text-sky-800">
                  {isDPS ? "Remaining Deposits" : "Pending Cycles"}
                </span>
                <div className="text-2xl font-black text-sky-700 mt-1">
                  {isDPS ? `৳${remainingBalance.toLocaleString()}` : `${totalCount - paidCount} Cycles`}
                </div>
                <div className="text-[11px] text-sky-600 mt-0.5">
                  {totalCount - paidCount} installment{totalCount - paidCount === 1 ? "" : "s"} remaining
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Segmentation Controls */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{isDPS ? "Monthly DPS Installments" : "Profit Collection Schedule"}</span>
                <span className="text-xs font-normal text-slate-500">
                  (Click any row checkmark to update status)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isDPS
                  ? "Track your monthly deposit payments. Check off each month when deposited."
                  : "Track each dividend or maturity profit cycle payout."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isDPS && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncToDailyExpenses}
                    onChange={(e) => setSyncToDailyExpenses(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <span>Sync deposits to Daily Expenses</span>
                </label>
              )}

              <button
                onClick={() => setShowAddLogModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extra Month</span>
              </button>
            </div>
          </div>

          {/* Segment Table */}
          {(!savings.depositLogs || savings.depositLogs.length === 0) ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No schedule generated yet for this savings plan.</p>
              <button
                onClick={() => setShowAddLogModal(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
              >
                <Plus className="w-4 h-4" /> Add First Installment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 text-center w-14">#</th>
                    <th className="py-3 px-4">Month / Cycle</th>
                    <th className="py-3 px-4">Scheduled Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-36">Action</th>
                    <th className="py-3 px-3 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {savings.depositLogs.map((log, index) => {
                    const isPaid = !!log.isPaid;
                    const isBusy = updatingLogId === log.id;

                    return (
                      <tr
                        key={log.id}
                        className={`group transition hover:bg-slate-50 ${
                          isPaid ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* Installment Index */}
                        <td className="py-3.5 px-3 text-center font-bold text-xs text-slate-500">
                          {log.installmentNo || index + 1}
                        </td>

                        {/* Month Label */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{log.monthLabel || `Month ${index + 1}`}</span>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {log.dueDate || "—"}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ৳{log.amount.toLocaleString()}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>{isDPS ? "Deposited" : "Collected"} {log.depositDate ? `(${log.depositDate})` : ""}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Pending / Due</span>
                            </span>
                          )}
                        </td>

                        {/* Checkmark Button Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleTogglePaid(log)}
                            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition shadow-sm ${
                              isPaid
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-white border border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-600"
                            } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isPaid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 fill-white text-emerald-600" />
                                <span>{isDPS ? "Deposited [✓]" : "Collected [✓]"}</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 text-slate-400" />
                                <span>{isDPS ? "Mark Deposited" : "Mark Collected"}</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Remove log */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 rounded text-slate-300 hover:text-rose-500 transition"
                            title="Delete this installment row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nominee & Notes Card */}
        {(savings.nomineeName || savings.notes) && (
          <div className="bg-slate-100/70 rounded-2xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2">
            {savings.nomineeName && (
              <div>
                <span className="font-semibold text-slate-800">Nominee: </span>
                <span>{savings.nomineeName}</span>
              </div>
            )}
            {savings.notes && (
              <div>
                <span className="font-semibold text-slate-800">Notes / Details:</span>
                <p className="mt-0.5 whitespace-pre-wrap">{savings.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl border border-slate-200 my-auto overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                Add Installment / Payout Cycle
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomLog} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Month Label (e.g. November, 26)
                </label>
                <input
                  type="text"
                  placeholder="e.g. November, 26"
                  value={newLogMonth}
                  onChange={(e) => setNewLogMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={newLogDueDate}
                  onChange={(e) => setNewLogDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={newLogAmount}
                  onChange={(e) => setNewLogAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition shadow"
                >
                  Add Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default DpsFdrDetailPage;
