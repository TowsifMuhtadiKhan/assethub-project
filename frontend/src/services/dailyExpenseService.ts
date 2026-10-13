import { supabase } from "../lib/supabase";
import type { DailyExpense, MemberLoan, LoanRepaymentSegment } from "../types";

const TABLE = "lifenest_daily_expenses";
const LOCAL_STORAGE_KEY = "lifenest_daily_expenses_list";

function getLocalExpenses(): DailyExpense[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalExpenses(list: DailyExpense[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function listDailyExpenses(
  familyMemberId?: string,
): Promise<DailyExpense[]> {
  const localList = getLocalExpenses();

  try {
    let query = supabase.from(TABLE).select("*").order("date", { ascending: false });
    if (familyMemberId) {
      query = query.eq("family_member_id", familyMemberId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const remoteList: DailyExpense[] = data.map((row) => ({
        id: row.id,
        familyMemberId: row.family_member_id,
        familyMemberName: row.family_member_name ?? "",
        date: row.date,
        amount: Number(row.amount),
        category: row.category,
        paymentMethod: row.payment_method ?? "Cash",
        description: row.description ?? "",
        merchant: row.merchant ?? "",
        receiptUrl: row.receipt_url ?? undefined,
        notes: row.notes ?? "",
        createdAt: row.created_at,
      }));

      // Merge and save
      const remoteIdSet = new Set(remoteList.map((r) => r.id));
      const filteredLocal = localList.filter((l) => !remoteIdSet.has(l.id));
      const combined = [...remoteList, ...filteredLocal];
      saveLocalExpenses(combined);

      return familyMemberId
        ? combined.filter((e) => e.familyMemberId === familyMemberId)
        : combined;
    }
  } catch {}

  // Fallback to local storage
  return familyMemberId
    ? localList.filter((e) => e.familyMemberId === familyMemberId)
    : localList;
}

export async function createDailyExpense(
  input: Omit<DailyExpense, "id">,
): Promise<DailyExpense> {
  const localList = getLocalExpenses();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: input.familyMemberId,
          family_member_name: input.familyMemberName || "",
          date: input.date,
          amount: input.amount,
          category: input.category,
          payment_method: input.paymentMethod,
          description: input.description || "",
          merchant: input.merchant || "",
          receipt_url: input.receiptUrl || null,
          notes: input.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        const remoteItem: DailyExpense = {
          id: data.id,
          familyMemberId: data.family_member_id,
          familyMemberName: data.family_member_name ?? "",
          date: data.date,
          amount: Number(data.amount),
          category: data.category,
          paymentMethod: data.payment_method ?? "Cash",
          description: data.description ?? "",
          merchant: data.merchant ?? "",
          receiptUrl: data.receipt_url ?? undefined,
          notes: data.notes ?? "",
          createdAt: data.created_at,
        };

        saveLocalExpenses([remoteItem, ...localList]);
        return remoteItem;
      }
    }
  } catch {}

  // Local fallback
  const localItem: DailyExpense = {
    ...input,
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  saveLocalExpenses([localItem, ...localList]);
  return localItem;
}

export async function updateDailyExpense(
  id: string,
  input: Partial<DailyExpense>,
): Promise<DailyExpense> {
  const localList = getLocalExpenses();
  const found = localList.find((e) => e.id === id);
  const updatedItem: DailyExpense = {
    ...(found || {
      id,
      familyMemberId: input.familyMemberId || "",
      date: input.date || new Date().toISOString().split("T")[0],
      amount: input.amount || 0,
      category: input.category || "Others",
      paymentMethod: input.paymentMethod || "Cash",
      description: input.description || "",
    }),
    ...input,
  };

  saveLocalExpenses(localList.map((e) => (e.id === id ? updatedItem : e)));

  try {
    const patch: Record<string, any> = {};
    if (input.date !== undefined) patch.date = input.date;
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.category !== undefined) patch.category = input.category;
    if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod;
    if (input.description !== undefined) patch.description = input.description;
    if (input.merchant !== undefined) patch.merchant = input.merchant;
    if (input.receiptUrl !== undefined) patch.receipt_url = input.receiptUrl;
    if (input.notes !== undefined) patch.notes = input.notes;

    await supabase.from(TABLE).update(patch).eq("id", id);
  } catch {}

  return updatedItem;
}

export async function deleteDailyExpense(id: string): Promise<void> {
  const localList = getLocalExpenses();
  saveLocalExpenses(localList.filter((e) => e.id !== id));

  try {
    await supabase.from(TABLE).delete().eq("id", id);
  } catch {}
}

// ==============================================================================
// PIN SECURITY HELPERS
// ==============================================================================

const PIN_PREFIX = "lifenest_expense_pin_";

function hashPin(pin: string, memberId: string): string {
  // Simple obfuscation hash with salt
  const salt = `ln_salt_${memberId.slice(-4)}`;
  return btoa(`${salt}:${pin.trim()}`);
}

export function hasMemberPin(memberId: string): boolean {
  try {
    const stored = localStorage.getItem(`${PIN_PREFIX}${memberId}`);
    return Boolean(stored && stored.length > 0);
  } catch {
    return false;
  }
}

export function setMemberPin(memberId: string, pin: string): void {
  try {
    const hashed = hashPin(pin, memberId);
    localStorage.setItem(`${PIN_PREFIX}${memberId}`, hashed);
  } catch {}
}

export function verifyMemberPin(memberId: string, pin: string): boolean {
  try {
    const stored = localStorage.getItem(`${PIN_PREFIX}${memberId}`);
    if (!stored) return false;
    const expected = hashPin(pin, memberId);
    return stored === expected;
  } catch {
    return false;
  }
}

export function removeMemberPin(memberId: string): void {
  try {
    localStorage.removeItem(`${PIN_PREFIX}${memberId}`);
  } catch {}
}

// ============================================================================
// LOANS, DEBTS & SEGMENT REPAYMENTS
// ============================================================================

const LOANS_TABLE = "lifenest_member_loans";
const LOCAL_LOANS_KEY = "lifenest_member_loans_list";

function getLocalLoans(): MemberLoan[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLoans(list: MemberLoan[]): void {
  try {
    localStorage.setItem(LOCAL_LOANS_KEY, JSON.stringify(list));
  } catch {}
}

export async function listMemberLoans(familyMemberId?: string): Promise<MemberLoan[]> {
  const localList = getLocalLoans();

  try {
    let query = supabase.from(LOANS_TABLE).select("*").order("created_at", { ascending: false });
    if (familyMemberId) {
      query = query.eq("family_member_id", familyMemberId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const remoteList: MemberLoan[] = data.map((row: any) => ({
        id: row.id,
        familyMemberId: row.family_member_id,
        familyMemberName: row.family_member_name ?? "",
        loanTitle: row.loan_title ?? "Personal Loan",
        loanType: row.loan_type ?? "Car Loan",
        lenderName: row.lender_name ?? "",
        principalAmount: Number(row.principal_amount || 0),
        totalRepayableAmount: Number(row.total_repayable_amount || row.principal_amount || 0),
        interestRate: row.interest_rate ? Number(row.interest_rate) : undefined,
        startDate: row.start_date || new Date().toISOString().split("T")[0],
        targetEndDate: row.target_end_date || undefined,
        monthlyEmiAmount: row.monthly_emi_amount ? Number(row.monthly_emi_amount) : undefined,
        repayments: Array.isArray(row.repayments) ? row.repayments : [],
        status: row.status ?? "ACTIVE",
        notes: row.notes ?? "",
        createdAt: row.created_at,
      }));

      const remoteIds = new Set(remoteList.map((r) => r.id));
      const filteredLocal = localList.filter((l) => !remoteIds.has(l.id));
      const merged = [...remoteList, ...filteredLocal];
      saveLocalLoans(merged);

      return familyMemberId ? merged.filter((l) => l.familyMemberId === familyMemberId) : merged;
    }
  } catch {}

  return familyMemberId ? localList.filter((l) => l.familyMemberId === familyMemberId) : localList;
}

export async function createMemberLoan(
  input: Omit<MemberLoan, "id" | "repayments" | "createdAt">
): Promise<MemberLoan> {
  const localList = getLocalLoans();
  const newId = `loan_${Date.now()}`;
  const newLoan: MemberLoan = {
    id: newId,
    ...input,
    repayments: [],
    createdAt: new Date().toISOString(),
  };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from(LOANS_TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: input.familyMemberId,
          family_member_name: input.familyMemberName || "",
          loan_title: input.loanTitle,
          loan_type: input.loanType,
          lender_name: input.lenderName,
          principal_amount: input.principalAmount,
          total_repayable_amount: input.totalRepayableAmount,
          interest_rate: input.interestRate,
          start_date: input.startDate,
          target_end_date: input.targetEndDate,
          monthly_emi_amount: input.monthlyEmiAmount,
          repayments: [],
          status: input.status || "ACTIVE",
          notes: input.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        newLoan.id = data.id;
      }
    }
  } catch {}

  const updated = [newLoan, ...localList.filter((l) => l.id !== newLoan.id)];
  saveLocalLoans(updated);
  return newLoan;
}

export async function addLoanRepaymentSegment(
  loanId: string,
  segment: Omit<LoanRepaymentSegment, "id">,
  syncToExpense: boolean = true
): Promise<MemberLoan> {
  const localList = getLocalLoans();
  const loanIndex = localList.findIndex((l) => l.id === loanId);
  if (loanIndex < 0) {
    throw new Error("Loan not found");
  }

  const loan = localList[loanIndex];
  const newSegmentId = `seg_${Date.now()}`;
  const newSegment: LoanRepaymentSegment = {
    id: newSegmentId,
    ...segment,
    createdAt: new Date().toISOString(),
  };

  const updatedRepayments = [newSegment, ...loan.repayments];
  const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
  const isPaidOff = totalRepaid >= loan.totalRepayableAmount;

  const updatedLoan: MemberLoan = {
    ...loan,
    repayments: updatedRepayments,
    status: isPaidOff ? "PAID_OFF" : "ACTIVE",
  };

  localList[loanIndex] = updatedLoan;
  saveLocalLoans(localList);

  try {
    await supabase
      .from(LOANS_TABLE)
      .update({
        repayments: updatedRepayments,
        status: updatedLoan.status,
      })
      .eq("id", loanId);
  } catch {}

  if (syncToExpense) {
    try {
      await createDailyExpense({
        familyMemberId: loan.familyMemberId,
        familyMemberName: loan.familyMemberName,
        date: segment.paymentDate,
        amount: segment.amount,
        category: "Loan & EMI Repayment",
        paymentMethod: segment.paymentMethod,
        description: `${loan.loanTitle} - Repayment installment to ${loan.lenderName}`,
        merchant: loan.lenderName,
        notes: segment.notes || `Repayment installment for ${loan.loanTitle}`,
      });
    } catch {}
  }

  return updatedLoan;
}

export async function deleteMemberLoan(id: string): Promise<void> {
  const localList = getLocalLoans();
  saveLocalLoans(localList.filter((l) => l.id !== id));

  try {
    await supabase.from(LOANS_TABLE).delete().eq("id", id);
  } catch {}
}

export async function updateMemberLoan(
  id: string,
  updates: Partial<Omit<MemberLoan, "id" | "repayments" | "createdAt">>
): Promise<MemberLoan> {
  const localList = getLocalLoans();
  const index = localList.findIndex((l) => l.id === id);
  if (index < 0) throw new Error("Loan not found");

  const existing = localList[index];
  const updatedLoan: MemberLoan = {
    ...existing,
    ...updates,
    totalRepayableAmount:
      updates.totalRepayableAmount ??
      updates.principalAmount ??
      existing.totalRepayableAmount ??
      existing.principalAmount,
  };

  const totalRepaid = (updatedLoan.repayments || []).reduce((sum, r) => sum + r.amount, 0);
  if (!updates.status) {
    updatedLoan.status = totalRepaid >= updatedLoan.totalRepayableAmount ? "PAID_OFF" : "ACTIVE";
  }

  localList[index] = updatedLoan;
  saveLocalLoans(localList);

  try {
    const supabaseUpdates: Record<string, any> = {};
    if (updates.loanTitle !== undefined) supabaseUpdates.loan_title = updates.loanTitle;
    if (updates.loanType !== undefined) supabaseUpdates.loan_type = updates.loanType;
    if (updates.lenderName !== undefined) supabaseUpdates.lender_name = updates.lenderName;
    if (updates.principalAmount !== undefined) supabaseUpdates.principal_amount = updates.principalAmount;
    if (updatedLoan.totalRepayableAmount !== undefined) supabaseUpdates.total_repayable_amount = updatedLoan.totalRepayableAmount;
    if (updates.interestRate !== undefined) supabaseUpdates.interest_rate = updates.interestRate;
    if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate;
    if (updates.targetEndDate !== undefined) supabaseUpdates.target_end_date = updates.targetEndDate;
    if (updates.monthlyEmiAmount !== undefined) supabaseUpdates.monthly_emi_amount = updates.monthlyEmiAmount;
    if (updates.status !== undefined || updatedLoan.status !== existing.status) supabaseUpdates.status = updatedLoan.status;
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;

    if (Object.keys(supabaseUpdates).length > 0) {
      await supabase.from(LOANS_TABLE).update(supabaseUpdates).eq("id", id);
    }
  } catch {}

  return updatedLoan;
}

export async function updateLoanRepaymentSegment(
  loanId: string,
  segmentId: string,
  updates: Partial<Omit<LoanRepaymentSegment, "id" | "loanId" | "createdAt">>
): Promise<MemberLoan> {
  const localList = getLocalLoans();
  const loanIndex = localList.findIndex((l) => l.id === loanId);
  if (loanIndex < 0) throw new Error("Loan not found");

  const loan = localList[loanIndex];
  const updatedRepayments = (loan.repayments || []).map((seg) => {
    if (seg.id === segmentId) {
      return { ...seg, ...updates };
    }
    return seg;
  });

  const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
  const isPaidOff = totalRepaid >= loan.totalRepayableAmount;

  const updatedLoan: MemberLoan = {
    ...loan,
    repayments: updatedRepayments,
    status: isPaidOff ? "PAID_OFF" : "ACTIVE",
  };

  localList[loanIndex] = updatedLoan;
  saveLocalLoans(localList);

  try {
    await supabase
      .from(LOANS_TABLE)
      .update({
        repayments: updatedRepayments,
        status: updatedLoan.status,
      })
      .eq("id", loanId);
  } catch {}

  return updatedLoan;
}

export async function deleteLoanRepaymentSegment(
  loanId: string,
  segmentId: string
): Promise<MemberLoan> {
  const localList = getLocalLoans();
  const loanIndex = localList.findIndex((l) => l.id === loanId);
  if (loanIndex < 0) throw new Error("Loan not found");

  const loan = localList[loanIndex];
  const updatedRepayments = (loan.repayments || []).filter((seg) => seg.id !== segmentId);
  const totalRepaid = updatedRepayments.reduce((sum, r) => sum + r.amount, 0);
  const isPaidOff = totalRepaid >= loan.totalRepayableAmount && loan.totalRepayableAmount > 0;

  const updatedLoan: MemberLoan = {
    ...loan,
    repayments: updatedRepayments,
    status: isPaidOff ? "PAID_OFF" : "ACTIVE",
  };

  localList[loanIndex] = updatedLoan;
  saveLocalLoans(localList);

  try {
    await supabase
      .from(LOANS_TABLE)
      .update({
        repayments: updatedRepayments,
        status: updatedLoan.status,
      })
      .eq("id", loanId);
  } catch {}

  return updatedLoan;
}

