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
  CreditCard,
  X,
  Bell,
  BellOff,
  Send,
  MessageCircle,
  Pencil,
} from "lucide-react";
import {
  getMemberLoanById,
  toggleLoanSegmentPayment,
  addLoanRepaymentSegment,
  updateLoanRepaymentSegment,
  deleteLoanRepaymentSegment,
  deleteMemberLoan,
  updateMemberLoan,
} from "../services/dailyExpenseService";
import type { MemberLoan, LoanRepaymentSegment, DailyExpensePaymentMethod } from "../types";
import { TableRowActions } from "../components/common/TableRowActions";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { ConfirmationModal } from "../components/common";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";
import { sendSystemWhatsAppAlert, formatRecipientNumber } from "../services/whatsappService";
import { getLocalWhatsAppContacts } from "../services/settingsService";
import { parseLeadMinutes } from "../services/reminderDaemon";

export function EmiDetailPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();

  const [loan, setLoan] = useState<MemberLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingSegmentId, setUpdatingSegmentId] = useState<string | null>(null);
  const [syncToDailyExpenses, setSyncToDailyExpenses] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Payment Confirmation Modal State
  const [confirmingSegmentPayment, setConfirmingSegmentPayment] = useState<LoanRepaymentSegment | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState<DailyExpensePaymentMethod>("Bank Card");
  const [paySyncExpense, setPaySyncExpense] = useState(true);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Unpay Confirmation Modal State
  const [confirmingSegmentUnpay, setConfirmingSegmentUnpay] = useState<LoanRepaymentSegment | null>(null);
  const [isSubmittingUnpay, setIsSubmittingUnpay] = useState(false);

  // Manual Add Segment Modal State
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);
  const [newSegmentAmount, setNewSegmentAmount] = useState<number | "">("");
  const [newSegmentMonth, setNewSegmentMonth] = useState("");
  const [newSegmentDueDate, setNewSegmentDueDate] = useState("");

  // Edit Segment Modal State
  const [editingSegment, setEditingSegment] = useState<LoanRepaymentSegment | null>(null);
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editMonthLabel, setEditMonthLabel] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingSegmentEdit, setSavingSegmentEdit] = useState(false);

  // Reminder Notification Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDay, setReminderDay] = useState<number>(5);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderTiming, setReminderTiming] = useState<string>("3_days_before");
  const [reminderTime, setReminderTime] = useState<string>("09:00");
  const [reminderRecipients, setReminderRecipients] = useState<string[]>(["Personal"]);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  // Delete Entire Loan Modal State
  const [showDeleteLoanModal, setShowDeleteLoanModal] = useState(false);
  const [isDeletingLoan, setIsDeletingLoan] = useState(false);

  async function handleDeleteEntireLoan() {
    if (!loan || isDeletingLoan) return;
    setIsDeletingLoan(true);
    try {
      await deleteMemberLoan(loan.id, loan.loanTitle);
      showToast("✓ Obligation deleted successfully!");
      setTimeout(() => {
        navigate("/my-life/expenses?tab=loans");
      }, 400);
    } catch (err) {
      console.error("Failed to delete loan:", err);
      showToast("Failed to delete obligation");
      setIsDeletingLoan(false);
    }
  }

  useEffect(() => {
    if (!loanId) return;
    loadLoan();
  }, [loanId]);

  async function loadLoan() {
    setLoading(true);
    try {
      if (loanId) {
        const found = await getMemberLoanById(loanId);
        setLoan(found);
        if (found) {
          setReminderDay(found.reminderDayOfMonth || 5);
          setReminderEnabled(found.reminderEnabled ?? true);

          // Parse notes for reminder metadata
          const notes = found.notes || "";
          const minutes = parseLeadMinutes(notes);
          if (minutes === 0) setReminderTiming("on_due_date");
          else if (minutes === 1440) setReminderTiming("1_day_before");
          else if (minutes === 2880) setReminderTiming("2_days_before");
          else if (minutes === 4320) setReminderTiming("3_days_before");
          else if (minutes === 7200) setReminderTiming("5_days_before");
          else if (minutes === 10080) setReminderTiming("7_days_before");
          else if (found.reminderDayOfMonth) setReminderTiming("specific_day");
          else setReminderTiming("3_days_before");

          const timeMatch = notes.match(/Due Time:\s*([^,\]\n]+)/i);
          if (timeMatch) {
            setReminderTime(timeMatch[1].trim());
          }

          const recMatch = notes.match(/Recipients:\s*([^\]\n]+)/i);
          if (recMatch) {
            const list = recMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
            if (list.length > 0) setReminderRecipients(list);
          }
        }
      }
    } catch (err) {
      console.error("Error loading loan:", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  const { totalPaid, remainingBalance, progressPercent, paidCount, totalCount } = useMemo(() => {
    if (!loan) return { totalPaid: 0, remainingBalance: 0, progressPercent: 0, paidCount: 0, totalCount: 0 };
    const segments = loan.repayments || [];
    const totalCount = segments.length;
    const paidSegments = segments.filter((s) => s.isPaid);
    const paidCount = paidSegments.length;
    const totalPaid = paidSegments.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalCommitment = loan.totalRepayableAmount || loan.principalAmount || 0;
    const remainingBalance = Math.max(0, totalCommitment - totalPaid);
    const progressPercent = totalCommitment > 0 ? Math.min(100, Math.round((totalPaid / totalCommitment) * 100)) : 0;
    return { totalPaid, remainingBalance, progressPercent, paidCount, totalCount };
  }, [loan]);

  function handleInitiateToggle(segment: LoanRepaymentSegment) {
    if (segment.isPaid) {
      setConfirmingSegmentUnpay(segment);
    } else {
      setConfirmingSegmentPayment(segment);
      setPayDate(segment.dueDate || new Date().toISOString().split("T")[0]);
      setPayMethod(segment.paymentMethod || "Bank Card");
      setPaySyncExpense(syncToDailyExpenses);
    }
  }

  async function handleConfirmPayment() {
    if (!loan || !confirmingSegmentPayment || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    setUpdatingSegmentId(confirmingSegmentPayment.id);
    try {
      const paymentDate = payDate || confirmingSegmentPayment.dueDate || new Date().toISOString().split("T")[0];
      const updated = await toggleLoanSegmentPayment(
        loan.id,
        confirmingSegmentPayment.id,
        paymentDate,
        paySyncExpense,
        payMethod
      );
      setLoan(updated);
      showToast(
        `✓ Installment #${confirmingSegmentPayment.installmentNo || ""} (৳${confirmingSegmentPayment.amount.toLocaleString()}) confirmed & marked as PAID!`
      );
      setConfirmingSegmentPayment(null);
    } catch (err: any) {
      console.error("Failed to mark installment paid:", err);
      showToast("Error updating installment status");
    } finally {
      setIsSubmittingPayment(false);
      setUpdatingSegmentId(null);
    }
  }

  async function handleConfirmUnpay() {
    if (!loan || !confirmingSegmentUnpay || isSubmittingUnpay) return;
    setIsSubmittingUnpay(true);
    setUpdatingSegmentId(confirmingSegmentUnpay.id);
    try {
      const updated = await toggleLoanSegmentPayment(
        loan.id,
        confirmingSegmentUnpay.id,
        undefined,
        false
      );
      setLoan(updated);
      showToast(`Installment #${confirmingSegmentUnpay.installmentNo || ""} marked as UNPAID.`);
      setConfirmingSegmentUnpay(null);
    } catch (err: any) {
      console.error("Failed to revert installment:", err);
      showToast("Error reverting installment status");
    } finally {
      setIsSubmittingUnpay(false);
      setUpdatingSegmentId(null);
    }
  }

  function openEditSegmentModal(segment: LoanRepaymentSegment) {
    setEditingSegment(segment);
    setEditAmount(segment.amount);
    setEditMonthLabel(segment.monthLabel || "");
    setEditDueDate(segment.dueDate || "");
  }

  async function handleSaveSegmentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan || !editingSegment || !editAmount) return;
    setSavingSegmentEdit(true);
    try {
      const updated = await updateLoanRepaymentSegment(loan.id, editingSegment.id, {
        amount: Number(editAmount),
        monthLabel: editMonthLabel.trim() || undefined,
        dueDate: editDueDate || undefined,
      });
      setLoan(updated);
      setEditingSegment(null);
      showToast("✓ Installment updated & balance recalculated successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to update installment segment");
    } finally {
      setSavingSegmentEdit(false);
    }
  }

  async function handleAddCustomSegment(e: React.FormEvent) {
    e.preventDefault();
    if (!loan || !newSegmentAmount) return;
    try {
      const updated = await addLoanRepaymentSegment(
        loan.id,
        {
          loanId: loan.id,
          amount: Number(newSegmentAmount),
          dueDate: newSegmentDueDate || new Date().toISOString().split("T")[0],
          monthLabel: newSegmentMonth || undefined,
          paymentMethod: "Bank Card",
        },
        false
      );
      setLoan(updated);
      setShowAddSegmentModal(false);
      setNewSegmentAmount("");
      setNewSegmentMonth("");
      setNewSegmentDueDate("");
      showToast("✓ Custom installment segment added!");
    } catch (err) {
      console.error(err);
      showToast("Failed to add installment segment");
    }
  }

  async function handleDeleteSegment(segmentId: string) {
    if (!loan) return;
    if (!confirm("Are you sure you want to remove this installment segment?")) return;
    try {
      const updated = await deleteLoanRepaymentSegment(loan.id, segmentId);
      setLoan(updated);
      showToast("Installment segment removed.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete segment");
    }
  }

  async function handleSendTestAlert() {
    if (!loan || isSendingTestAlert) return;
    setIsSendingTestAlert(true);
    try {
      const contacts = getLocalWhatsAppContacts();
      const targets = contacts.filter((c) => reminderRecipients.includes(c.alias));
      if (targets.length === 0) {
        showToast("No recipient contact found. Please configure WhatsApp in Settings.");
        setIsSendingTestAlert(false);
        return;
      }

      const nextUnpaid = (loan.repayments || []).find((r) => !r.isPaid) || loan.repayments?.[0];
      const amountStr = (nextUnpaid?.amount || loan.monthlyEmiAmount || 0).toLocaleString();
      const installmentLabel = nextUnpaid?.monthLabel || (nextUnpaid?.installmentNo ? `Installment #${nextUnpaid.installmentNo}` : "Monthly EMI");
      const dueDateStr = nextUnpaid?.dueDate || `Day ${reminderDay} of this month`;

      const message = `🔔 *LifeNest Payment Reminder (Test)*\n\n` +
        `Obligation: *${loan.loanTitle}*\n` +
        `Lender / Provider: *${loan.lenderName || "Bank"}*\n` +
        `Installment: *${installmentLabel}*\n` +
        `Amount Due: *৳${amountStr}*\n` +
        `Scheduled Due: *${dueDateStr}*\n\n` +
        `💡 _This test confirms that payment alerts are working and sent to your selected numbers._`;

      let sentCount = 0;
      for (const t of targets) {
        const fullPhone = formatRecipientNumber(t.countryCode, t.phone);
        const res = await sendSystemWhatsAppAlert({ to: fullPhone, message });
        if (res.success) sentCount++;
      }

      if (sentCount > 0) {
        showToast(`✓ Test WhatsApp alert delivered to ${sentCount} contact(s)!`);
      } else {
        showToast("Could not send WhatsApp test alert. Please verify gateway settings.");
      }
    } catch (err) {
      console.error("Test alert failed:", err);
      showToast("Failed to send test alert");
    } finally {
      setIsSendingTestAlert(false);
    }
  }

  async function handleSaveReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    setSavingReminder(true);
    try {
      let leadText = "3 days before";
      if (reminderTiming === "on_due_date") leadText = "On exact due date";
      else if (reminderTiming === "1_day_before") leadText = "1 day before";
      else if (reminderTiming === "2_days_before") leadText = "2 days before";
      else if (reminderTiming === "3_days_before") leadText = "3 days before";
      else if (reminderTiming === "5_days_before") leadText = "5 days before";
      else if (reminderTiming === "7_days_before") leadText = "7 days before";
      else if (reminderTiming === "specific_day") leadText = `Day ${reminderDay} of month`;

      const cleanNotes = (loan.notes || "").replace(/\s*\[Reminder:[^\]]+\]/gi, "").trim();
      const reminderTag = reminderEnabled
        ? `[Reminder: ${leadText}, Due Time: ${reminderTime}, Recipients: ${reminderRecipients.join(", ")}]`
        : `[Reminder: Disabled]`;

      const newNotes = cleanNotes ? `${cleanNotes} ${reminderTag}` : reminderTag;

      const updated = await updateMemberLoan(loan.id, {
        reminderDayOfMonth: Number(reminderDay),
        reminderEnabled,
        notes: newNotes,
      });

      setLoan(updated);
      setShowReminderModal(false);
      showToast(
        reminderEnabled
          ? `✓ WhatsApp reminder active! Alerts will be sent to: ${reminderRecipients.join(", ")}`
          : "✓ Payment alerts turned off for this obligation."
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to save reminder setting");
    } finally {
      setSavingReminder(false);
    }
  }

  if (loading) {
    return (
      <BrandLogoLoader
        message="Loading EMI Schedule & Installments..."
        subtitle="Calculating remaining balances and payment timeline"
      />
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">EMI Record Not Found</h2>
          <p className="text-slate-500 mt-2 mb-6">
            The requested EMI or loan schedule could not be located.
          </p>
          <Link
            to="/my-life/expenses?tab=loans"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold shadow hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Banking & Obligations
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = loan.status === "PAID_OFF" || progressPercent >= 100;

  return (
    <div className="w-full text-slate-900 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sleek Breadcrumb & Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/my-life/expenses?tab=loans")}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition py-1.5 px-3 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Banking & Obligations</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* WhatsApp Reminder Status Pill / Button */}
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-2xs cursor-pointer ${
              loan.reminderEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
            title="Configure WhatsApp payment reminders and recipients"
          >
            {loan.reminderEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span className="hidden sm:inline">WhatsApp Alerts:</span>
                <span>ON</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Alerts OFF</span>
              </>
            )}
          </button>

          {/* Delete Obligation Button */}
          <button
            type="button"
            onClick={() => setShowDeleteLoanModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-xs font-semibold text-rose-700 transition shadow-2xs cursor-pointer"
            title="Delete this entire obligation"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Delete Obligation</span>
          </button>

          {/* Status Badge */}
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
              isCompleted
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-teal-50 text-teal-800 border-teal-200"
            }`}
          >
            {isCompleted ? "✓ Completed" : "Active Repayment"}
          </span>
        </div>
      </div>

      <div className="w-full space-y-5">
        {/* Modern, Space-Efficient Obligation Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5">
          {/* Title & Metadata Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {loan.loanTitle}
                </h1>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                    {loan.loanType || "Consumer EMI"}
                  </span>
                  {loan.lenderName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {loan.lenderName}
                    </span>
                  )}
                  {loan.familyMemberName && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      • Account: <strong className="text-slate-700">{loan.familyMemberName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4-Metric Clean KPI Strip (Like DailyExpensesPage & VehicleDetailsPage) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-0 md:divide-x md:divide-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90">
            <div className="md:px-4 first:pl-0">
              <span className="text-[11px] font-semibold text-slate-500 block">Monthly Installment</span>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-0.5">
                ৳{(loan.monthlyEmiAmount || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">{totalCount} scheduled cycles</span>
            </div>

            <div className="md:px-4">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Commitment</span>
              <div className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-0.5">
                ৳{(loan.totalRepayableAmount || loan.principalAmount || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Principal: ৳{(loan.principalAmount || 0).toLocaleString()}</span>
            </div>

            <div className="md:px-4">
              <span className="text-[11px] font-semibold text-emerald-800 block">Total Paid So Far</span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-700 mt-0.5">
                ৳{totalPaid.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-700/90 font-medium">{paidCount} cleared ({progressPercent}%)</span>
            </div>

            <div className="md:px-4 last:pr-0">
              <span className="text-[11px] font-semibold text-amber-800 block">Remaining Balance</span>
              <div className="text-lg sm:text-xl font-black font-mono text-amber-700 mt-0.5">
                ৳{remainingBalance.toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-700/90 font-medium">{totalCount - paidCount} remaining</span>
            </div>
          </div>

          {/* Slim Progress Bar */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">
                Repayment Progress ({paidCount} of {totalCount} Installments Cleared)
              </span>
              <span className="text-teal-700 font-bold font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Compact Meta Footer Strip */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Started: <strong className="text-slate-800">{loan.startDate}</strong>
              </span>
              {loan.targetEndDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Target End: <strong className="text-slate-800">{loan.targetEndDate}</strong>
                </span>
              )}
              {loan.interestRate && loan.interestRate > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  Interest: <strong className="text-slate-800">{loan.interestRate}%</strong>
                </span>
              ) : null}
            </div>

            <div className="inline-flex items-center gap-1.5 text-slate-600">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Alert Recipients: <strong className="text-slate-800">{loan.reminderEnabled ? reminderRecipients.join(", ") : "Disabled"}</strong></span>
            </div>
          </div>
        </div>

        {/* Schedule & Segmentation Controls */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Monthly Installments & Repayment Checklist</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark any installment paid or edit scheduled amounts. When checked, payments are placed under their respective month.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncToDailyExpenses}
                  onChange={(e) => setSyncToDailyExpenses(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span>Sync paid to Daily Expenses</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAddSegmentModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extra Month</span>
              </button>
            </div>
          </div>

          {/* Segment Table */}
          {(!loan.repayments || loan.repayments.length === 0) ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No installment segments generated yet for this EMI.</p>
              <button
                type="button"
                onClick={() => setShowAddSegmentModal(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Installment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-4 text-left">Month / Cycle</th>
                    <th className="py-3 px-4 text-left">Scheduled Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-36">Mark Paid</th>
                    <th className="py-3 px-4 text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.repayments.map((segment, index) => {
                    const isPaid = !!segment.isPaid;
                    const isBusy = updatingSegmentId === segment.id;

                    return (
                      <tr
                        key={segment.id}
                        className={`group transition hover:bg-slate-50/80 ${
                          isPaid ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        {/* Installment Index */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-400 font-mono">
                          {segment.installmentNo || index + 1}
                        </td>

                        {/* Month Label */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-left">
                          {segment.monthLabel || `Month ${index + 1}`}
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-left">
                          {segment.dueDate || "—"}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900">
                          ৳{segment.amount.toLocaleString()}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Paid {segment.paymentDate ? `(${segment.paymentDate})` : ""}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Due / Pending</span>
                            </span>
                          )}
                        </td>

                        {/* Checkmark Button Action */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleInitiateToggle(segment)}
                            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition shadow-2xs cursor-pointer ${
                              isPaid
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-white border border-slate-200 text-slate-800 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/50"
                            } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isPaid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>Paid [✓]</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 text-slate-400" />
                                <span>Mark Paid</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Row Actions: Edit and Delete */}
                        <td className="py-3.5 px-4 text-right">
                          <TableRowActions
                            title={`Installment #${index + 1}`}
                            subtitle={`Due: ${segment.dueDate} • ৳${segment.amount.toLocaleString()}`}
                            actions={[
                              {
                                label: "Edit Installment",
                                description: "Update amount, due date, or notes",
                                icon: Pencil,
                                onClick: () => openEditSegmentModal(segment),
                              },
                              {
                                label: "Delete Installment",
                                description: "Remove this installment from schedule",
                                icon: Trash2,
                                variant: "danger" as const,
                                onClick: () => handleDeleteSegment(segment.id),
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
          )}
        </div>

        {/* Notes or Guidance Card */}
        {loan.notes && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-xs text-slate-600 shadow-2xs">
            <span className="font-semibold text-slate-800">Notes / Details:</span>
            <p className="mt-1 whitespace-pre-wrap">{loan.notes}</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT INSTALLMENT SEGMENT                                        */}
      {/* ========================================================================= */}
      {editingSegment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Installment Segment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update segment amount, month, or due date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSegment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSegmentEdit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Month / Cycle Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. November, 26"
                  value={editMonthLabel}
                  onChange={(e) => setEditMonthLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scheduled Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Installment Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 2452"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Changing this amount will immediately recalculate the remaining balance and progress percentage.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSegment(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSegmentEdit}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition shadow cursor-pointer"
                >
                  {savingSegmentEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD CUSTOM INSTALLMENT SEGMENT                                  */}
      {/* ========================================================================= */}
      {showAddSegmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                Add Installment Segment
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSegmentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomSegment} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Month Label (e.g. November, 26)
                </label>
                <input
                  type="text"
                  placeholder="e.g. November, 26"
                  value={newSegmentMonth}
                  onChange={(e) => setNewSegmentMonth(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newSegmentDueDate}
                  onChange={(e) => setNewSegmentDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Installment Amount (৳) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 2452"
                  value={newSegmentAmount}
                  onChange={(e) => setNewSegmentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSegmentModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow cursor-pointer"
                >
                  Add Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIGURE EMI REMINDER & WHATSAPP NOTIFICATIONS                  */}
      {/* ========================================================================= */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Payment Reminder Settings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure WhatsApp alerts for {loan.loanTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
              {/* Notification ON/OFF Toggle Switch */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    WhatsApp Payment Reminders
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Automatically send reminder alerts before upcoming installment dates.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    reminderEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={reminderEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      reminderEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {reminderEnabled && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                  {/* When should the notification be sent */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      When should the notification be sent?
                    </label>
                    <select
                      value={reminderTiming}
                      onChange={(e) => setReminderTiming(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
                    >
                      <option value="on_due_date">On the exact due date</option>
                      <option value="1_day_before">1 day before due date</option>
                      <option value="2_days_before">2 days before due date</option>
                      <option value="3_days_before">3 days before due date (Recommended)</option>
                      <option value="5_days_before">5 days before due date</option>
                      <option value="7_days_before">7 days before due date</option>
                      <option value="specific_day">On a specific day of the month</option>
                    </select>
                  </div>

                  {/* If specific day of month selected */}
                  {reminderTiming === "specific_day" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Reminder Day of Every Month
                      </label>
                      <select
                        value={reminderDay}
                        onChange={(e) => setReminderDay(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of each month
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Alert Time of Day */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Alert Time of Day
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>

                  {/* To Whom Should It Send The Notification (Recipient Selector) */}
                  <ItemRecipientSelector
                    selectedRecipients={reminderRecipients}
                    onChange={setReminderRecipients}
                    label="To whom should it send the notification?"
                    helperText="Select which registered family WhatsApp numbers will receive payment alerts."
                  />

                  {/* Test WhatsApp Alert Button & Status */}
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Instant WhatsApp Test</span>
                      </span>
                      <button
                        type="button"
                        disabled={isSendingTestAlert || reminderRecipients.length === 0}
                        onClick={handleSendTestAlert}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                      >
                        {isSendingTestAlert ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Test Alert</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Sends a sample notification right now to <strong>{reminderRecipients.join(", ") || "selected contacts"}</strong> to confirm WhatsApp delivery.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReminder}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition shadow cursor-pointer"
                >
                  {savingReminder ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM MARK INSTALLMENT AS PAID                                 */}
      {/* ========================================================================= */}
      {confirmingSegmentPayment && (
        <ConfirmationModal
          isOpen={!!confirmingSegmentPayment}
          onClose={() => setConfirmingSegmentPayment(null)}
          onConfirm={handleConfirmPayment}
          title="Confirm Installment Payment"
          description="Verify and record installment payment"
          confirmText="Confirm Payment"
          variant="primary"
          icon={CheckCircle2}
          isLoading={isSubmittingPayment}
        >
          {/* Summary Card */}
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950">
                {loan.loanTitle}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                {confirmingSegmentPayment.monthLabel || `Installment #${confirmingSegmentPayment.installmentNo || ""}`}
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700">
              ৳{confirmingSegmentPayment.amount.toLocaleString()}
            </div>
            {confirmingSegmentPayment.dueDate && (
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Scheduled Due: <strong className="text-slate-800">{confirmingSegmentPayment.dueDate}</strong></span>
              </div>
            )}
          </div>

          {/* Payment Date Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          {/* Payment Method Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as DailyExpensePaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white cursor-pointer"
            >
              <option value="Bank Card">Bank Card</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
            </select>
          </div>

          {/* Sync to Daily Expenses */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/80 space-y-1">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paySyncExpense}
                onChange={(e) => setPaySyncExpense(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>Sync to Daily Expenses</span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6.5 leading-relaxed">
              Automatically records ৳{confirmingSegmentPayment.amount.toLocaleString()} under "Loan & EMI Repayment" in your Daily Expenses for this month.
            </p>
          </div>
        </ConfirmationModal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRM REVERT TO UNPAID                                         */}
      {/* ========================================================================= */}
      {confirmingSegmentUnpay && (
        <ConfirmationModal
          isOpen={!!confirmingSegmentUnpay}
          onClose={() => setConfirmingSegmentUnpay(null)}
          onConfirm={handleConfirmUnpay}
          title="Revert Installment to Unpaid?"
          description="Restore debt balance for this installment"
          confirmText="Yes, Mark Unpaid"
          cancelText="Keep as Paid"
          variant="warning"
          icon={AlertCircle}
          isLoading={isSubmittingUnpay}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to mark <strong>{confirmingSegmentUnpay.monthLabel || `Installment #${confirmingSegmentUnpay.installmentNo || ""}`}</strong> (৳{confirmingSegmentUnpay.amount.toLocaleString()}) as <strong>Unpaid</strong>?
            </p>
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 text-[11px] text-amber-900 leading-relaxed">
              This will add ৳{confirmingSegmentUnpay.amount.toLocaleString()} back to your remaining debt. If it was synced to Daily Expenses, the linked expense record will also be removed.
            </div>
          </div>
        </ConfirmationModal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRM DELETE ENTIRE OBLIGATION                                  */}
      {/* ========================================================================= */}
      {showDeleteLoanModal && loan && (
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
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900 font-semibold">
                  {loan.loanTitle}
                </strong>{" "}
                (৳{(loan.totalRepayableAmount || loan.principalAmount || 0).toLocaleString()}) and all linked records? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingLoan}
                onClick={() => setShowDeleteLoanModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoan}
                onClick={handleDeleteEntireLoan}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {isDeletingLoan ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Obligation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmiDetailPage;
