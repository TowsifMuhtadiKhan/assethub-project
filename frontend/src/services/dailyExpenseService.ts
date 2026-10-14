import { supabase } from "../lib/supabase";
import type { DailyExpense, MemberLoan, LoanRepaymentSegment, MemberSavings, SavingsDepositLog } from "../types";

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

export async function syncLocalExpensesToRemote(): Promise<number> {
  let synced = 0;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const localList = getLocalExpenses();
    const unsynced = localList.filter((e) => e.id.startsWith("exp_"));
    if (unsynced.length === 0) return 0;

    for (const item of unsynced) {
      const targetMemberId =
        !item.familyMemberId || item.familyMemberId === "owner-admin-towsif"
          ? user.id
          : item.familyMemberId;

      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: targetMemberId,
          family_member_name: item.familyMemberName || "",
          date: item.date,
          amount: item.amount,
          category: item.category,
          payment_method: item.paymentMethod,
          description: item.description || "",
          merchant: item.merchant || "",
          receipt_url: item.receiptUrl || null,
          notes: item.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        synced++;
        const currentList = getLocalExpenses();
        const updated = currentList.map((c) =>
          c.id === item.id
            ? { ...c, id: data.id, familyMemberId: targetMemberId }
            : c,
        );
        saveLocalExpenses(updated);
      } else if (error) {
        console.warn("Could not sync expense to Supabase:", error.message);
        break;
      }
    }
  } catch (err) {
    console.warn("syncLocalExpensesToRemote error:", err);
  }
  return synced;
}

export async function listDailyExpenses(
  familyMemberId?: string,
  familyMemberName?: string,
): Promise<DailyExpense[]> {
  const localList = getLocalExpenses();

  try {
    // Attempt auto-sync of any unsynced local items
    await syncLocalExpensesToRemote();

    const query = supabase
      .from(TABLE)
      .select("*")
      .order("date", { ascending: false });

    const { data, error } = await query;
    if (!error && data) {
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
      const currentLocal = getLocalExpenses();
      const filteredLocal = currentLocal.filter((l) => !remoteIdSet.has(l.id));
      const combined = [...remoteList, ...filteredLocal];
      saveLocalExpenses(combined);

      if (!familyMemberId && !familyMemberName) return combined;

      const normName = familyMemberName?.trim().toLowerCase();
      return combined.filter((e) => {
        if (familyMemberId && e.familyMemberId === familyMemberId) return true;
        if (normName && e.familyMemberName?.trim().toLowerCase() === normName) return true;
        if (
          familyMemberId === "owner-admin-towsif" &&
          (!e.familyMemberId || e.familyMemberId === "owner-admin-towsif")
        )
          return true;
        return false;
      });
    }
  } catch (err) {
    console.warn("listDailyExpenses remote query failed, fallback to local:", err);
  }

  // Fallback to local storage
  if (!familyMemberId && !familyMemberName) return localList;
  const normName = familyMemberName?.trim().toLowerCase();
  return localList.filter((e) => {
    if (familyMemberId && e.familyMemberId === familyMemberId) return true;
    if (normName && e.familyMemberName?.trim().toLowerCase() === normName) return true;
    if (
      familyMemberId === "owner-admin-towsif" &&
      (!e.familyMemberId || e.familyMemberId === "owner-admin-towsif")
    )
      return true;
    return false;
  });
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
      } else if (error) {
        console.warn("createDailyExpense failed on Supabase, saving to local:", error.message);
      }
    }
  } catch (err) {
    console.warn("createDailyExpense caught exception, saving to local:", err);
  }

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

  if (!id.startsWith("exp_")) {
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
  }

  return updatedItem;
}

export async function deleteDailyExpense(id: string): Promise<void> {
  const localList = getLocalExpenses();
  saveLocalExpenses(localList.filter((e) => e.id !== id));

  if (!id.startsWith("exp_")) {
    try {
      await supabase.from(TABLE).delete().eq("id", id);
    } catch {}
  }
}


// ==============================================================================
// PIN SECURITY HELPERS (CLOUD-SYNCED & PERSISTENT)
// ==============================================================================

const PIN_PREFIX = "lifenest_expense_pin_";
const PIN_MAP_KEY = "lifenest_expense_pin_map";

function getLocalPinMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PIN_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPinMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(PIN_MAP_KEY, JSON.stringify(map));
  } catch {}
}

function hashPin(pin: string): string {
  return btoa(`ln_expense_salt_v1:${pin.trim()}`);
}

function verifyPinMatch(storedHash: string, pin: string, memberId?: string): boolean {
  if (!storedHash) return false;
  const p = pin.trim();
  // 1. Check standard constant-salt hash
  if (storedHash === hashPin(p)) return true;
  // 2. Check legacy salt with memberId if applicable
  if (memberId && storedHash === btoa(`ln_salt_${memberId.slice(-4)}:${p}`)) return true;
  // 3. Plaintext fallback if legacy
  if (storedHash === p) return true;
  return false;
}

export async function loadCloudMemberPins(): Promise<Record<string, string>> {
  const localMap = getLocalPinMap();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return localMap;

    const { data } = await supabase
      .from("lifenest_user_settings")
      .select("member_pins, whatsapp_contacts")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (data) {
      let cloudPins: Record<string, string> = {};
      if (data.member_pins && typeof data.member_pins === "object") {
        cloudPins = data.member_pins;
      } else if (Array.isArray(data.whatsapp_contacts)) {
        const pinStore = data.whatsapp_contacts.find(
          (c: any) => c && c.id === "__lifenest_member_pins__",
        );
        if (pinStore && pinStore.pins) {
          cloudPins = pinStore.pins;
        }
      }

      const merged = { ...localMap, ...cloudPins };
      saveLocalPinMap(merged);
      return merged;
    }
  } catch (err) {
    console.warn("loadCloudMemberPins error:", err);
  }
  return localMap;
}

export function hasMemberPin(memberId: string, memberName?: string): boolean {
  const map = getLocalPinMap();
  if (map[memberId]) return true;
  if (localStorage.getItem(`${PIN_PREFIX}${memberId}`)) return true;

  if (memberName) {
    const norm = memberName.trim().toLowerCase();
    if (map[norm]) return true;
    if (localStorage.getItem(`${PIN_PREFIX}${norm}`)) return true;
  }
  return false;
}

export async function setMemberPin(
  memberId: string,
  pin: string,
  memberName?: string,
): Promise<void> {
  const hashed = hashPin(pin);
  const map = getLocalPinMap();
  map[memberId] = hashed;
  if (memberName) {
    map[memberName.trim().toLowerCase()] = hashed;
  }

  try {
    localStorage.setItem(`${PIN_PREFIX}${memberId}`, hashed);
    if (memberName) {
      localStorage.setItem(`${PIN_PREFIX}${memberName.trim().toLowerCase()}`, hashed);
    }
  } catch {}
  saveLocalPinMap(map);

  // Sync to Supabase cloud
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Also map under the authenticated user ID if setting Self
      map[user.id] = hashed;
      saveLocalPinMap(map);

      // 1. Attempt update with member_pins column
      const { error } = await supabase
        .from("lifenest_user_settings")
        .update({ member_pins: map })
        .eq("owner_id", user.id);

      if (error) {
        // 2. Fallback to whatsapp_contacts JSONB storage if member_pins column doesn't exist yet
        const { data: currentSettings } = await supabase
          .from("lifenest_user_settings")
          .select("whatsapp_contacts")
          .eq("owner_id", user.id)
          .maybeSingle();

        const currentContacts = Array.isArray(currentSettings?.whatsapp_contacts)
          ? currentSettings.whatsapp_contacts
          : [];
        const filtered = currentContacts.filter(
          (c: any) => c && c.id !== "__lifenest_member_pins__",
        );
        filtered.push({ id: "__lifenest_member_pins__", pins: map });

        await supabase
          .from("lifenest_user_settings")
          .update({ whatsapp_contacts: filtered })
          .eq("owner_id", user.id);
      }
    }
  } catch (err) {
    console.warn("setMemberPin cloud sync error:", err);
  }
}

export function verifyMemberPin(
  memberId: string,
  pin: string,
  memberName?: string,
): boolean {
  const map = getLocalPinMap();
  let stored = map[memberId] || localStorage.getItem(`${PIN_PREFIX}${memberId}`);
  if (!stored && memberName) {
    const norm = memberName.trim().toLowerCase();
    stored = map[norm] || localStorage.getItem(`${PIN_PREFIX}${norm}`);
  }
  if (!stored) return false;
  return verifyPinMatch(stored, pin, memberId);
}

export async function removeMemberPin(
  memberId: string,
  memberName?: string,
): Promise<void> {
  const map = getLocalPinMap();
  delete map[memberId];
  if (memberName) delete map[memberName.trim().toLowerCase()];

  try {
    localStorage.removeItem(`${PIN_PREFIX}${memberId}`);
    if (memberName) {
      localStorage.removeItem(`${PIN_PREFIX}${memberName.trim().toLowerCase()}`);
    }
  } catch {}
  saveLocalPinMap(map);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("lifenest_user_settings")
        .update({ member_pins: map })
        .eq("owner_id", user.id);
    }
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

export async function syncLocalLoansToRemote(): Promise<number> {
  let synced = 0;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const localList = getLocalLoans();
    const unsynced = localList.filter((l) => l.id.startsWith("loan_"));
    if (unsynced.length === 0) return 0;

    for (const item of unsynced) {
      const targetMemberId =
        !item.familyMemberId || item.familyMemberId === "owner-admin-towsif"
          ? user.id
          : item.familyMemberId;

      const { data, error } = await supabase
        .from(LOANS_TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: targetMemberId,
          family_member_name: item.familyMemberName || "",
          loan_title: item.loanTitle,
          loan_type: item.loanType,
          lender_name: item.lenderName,
          principal_amount: item.principalAmount,
          total_repayable_amount: item.totalRepayableAmount,
          interest_rate: item.interestRate,
          start_date: item.startDate,
          target_end_date: item.targetEndDate,
          monthly_emi_amount: item.monthlyEmiAmount,
          repayments: item.repayments || [],
          status: item.status || "ACTIVE",
          notes: item.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        synced++;
        const currentList = getLocalLoans();
        const updated = currentList.map((c) =>
          c.id === item.id
            ? { ...c, id: data.id, familyMemberId: targetMemberId }
            : c,
        );
        saveLocalLoans(updated);
      } else if (error) {
        console.warn("Could not sync loan to Supabase:", error.message);
        break;
      }
    }
  } catch (err) {
    console.warn("syncLocalLoansToRemote error:", err);
  }
  return synced;
}

export async function syncAllLocalExpenseData(): Promise<{ syncedExpenses: number; syncedLoans: number; syncedSavings: number }> {
  const syncedExpenses = await syncLocalExpensesToRemote();
  const syncedLoans = await syncLocalLoansToRemote();
  const syncedSavings = await syncLocalSavingsToRemote();
  return { syncedExpenses, syncedLoans, syncedSavings };
}

export async function listMemberLoans(
  familyMemberId?: string,
  familyMemberName?: string,
): Promise<MemberLoan[]> {
  const localList = getLocalLoans();

  try {
    // Attempt auto-sync of any unsynced local loans
    await syncLocalLoansToRemote();

    const query = supabase
      .from(LOANS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (!error && data) {
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
      const currentLocal = getLocalLoans();
      const filteredLocal = currentLocal.filter((l) => !remoteIds.has(l.id));
      const merged = [...remoteList, ...filteredLocal];
      saveLocalLoans(merged);

      if (!familyMemberId && !familyMemberName) return merged;

      const normName = familyMemberName?.trim().toLowerCase();
      return merged.filter((l) => {
        if (familyMemberId && l.familyMemberId === familyMemberId) return true;
        if (normName && l.familyMemberName?.trim().toLowerCase() === normName) return true;
        if (
          familyMemberId === "owner-admin-towsif" &&
          (!l.familyMemberId || l.familyMemberId === "owner-admin-towsif")
        )
          return true;
        return false;
      });
    }
  } catch (err) {
    console.warn("listMemberLoans remote query failed, fallback to local:", err);
  }

  if (!familyMemberId && !familyMemberName) return localList;
  const normName = familyMemberName?.trim().toLowerCase();
  return localList.filter((l) => {
    if (familyMemberId && l.familyMemberId === familyMemberId) return true;
    if (normName && l.familyMemberName?.trim().toLowerCase() === normName) return true;
    if (
      familyMemberId === "owner-admin-towsif" &&
      (!l.familyMemberId || l.familyMemberId === "owner-admin-towsif")
    )
      return true;
    return false;
  });
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
      } else if (error) {
        console.warn("createMemberLoan failed on Supabase, saving to local:", error.message);
      }
    }
  } catch (err) {
    console.warn("createMemberLoan caught exception, saving to local:", err);
  }

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

  if (!loanId.startsWith("loan_")) {
    try {
      await supabase
        .from(LOANS_TABLE)
        .update({
          repayments: updatedRepayments,
          status: updatedLoan.status,
        })
        .eq("id", loanId);
    } catch {}
  }


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

  if (!id.startsWith("loan_")) {
    try {
      await supabase.from(LOANS_TABLE).delete().eq("id", id);
    } catch {}
  }
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

  if (!id.startsWith("loan_")) {
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
  }

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

  if (!loanId.startsWith("loan_")) {
    try {
      await supabase
        .from(LOANS_TABLE)
        .update({
          repayments: updatedRepayments,
          status: updatedLoan.status,
        })
        .eq("id", loanId);
    } catch {}
  }

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

  if (!loanId.startsWith("loan_")) {
    try {
      await supabase
        .from(LOANS_TABLE)
        .update({
          repayments: updatedRepayments,
          status: updatedLoan.status,
        })
        .eq("id", loanId);
    } catch {}
  }

  return updatedLoan;
}

// ============================================================================
// 4. MEMBER SAVINGS, DPS & TERM DEPOSITS (FDR, Sanchayapatra)
// ============================================================================

const SAVINGS_TABLE = "lifenest_member_savings";
const LOCAL_SAVINGS_KEY = "lifenest_member_savings_list";

function getLocalSavings(): MemberSavings[] {
  try {
    const raw = localStorage.getItem(LOCAL_SAVINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSavings(list: MemberSavings[]): void {
  try {
    localStorage.setItem(LOCAL_SAVINGS_KEY, JSON.stringify(list));
  } catch {}
}

export async function syncLocalSavingsToRemote(): Promise<number> {
  let synced = 0;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const localList = getLocalSavings();
    const unsynced = localList.filter((s) => s.id.startsWith("sav_"));
    if (unsynced.length === 0) return 0;

    for (const item of unsynced) {
      const targetMemberId =
        !item.familyMemberId || item.familyMemberId === "owner-admin-towsif"
          ? user.id
          : item.familyMemberId;

      const { data, error } = await supabase
        .from(SAVINGS_TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: targetMemberId,
          family_member_name: item.familyMemberName || "",
          title: item.title,
          type: item.type,
          institution_name: item.institutionName,
          account_number: item.accountNumber || "",
          monthly_installment: item.monthlyInstallment,
          principal_amount: item.principalAmount,
          tenure_years: item.tenureYears,
          tenure_months: item.tenureMonths,
          start_date: item.startDate,
          maturity_date: item.maturityDate,
          interest_rate: item.interestRate,
          maturity_amount: item.maturityAmount,
          deposit_day_of_month: item.depositDayOfMonth,
          profit_payout_frequency: item.profitPayoutFrequency,
          deposit_logs: item.depositLogs || [],
          status: item.status || "ACTIVE",
          nominee_name: item.nomineeName || "",
          notes: item.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        synced++;
        const currentList = getLocalSavings();
        const updated = currentList.map((c) =>
          c.id === item.id
            ? { ...c, id: data.id, familyMemberId: targetMemberId }
            : c,
        );
        saveLocalSavings(updated);
      } else if (error) {
        console.warn("Could not sync savings to Supabase:", error.message);
        break;
      }
    }
  } catch (err) {
    console.warn("syncLocalSavingsToRemote error:", err);
  }
  return synced;
}

export async function listMemberSavings(
  familyMemberId?: string,
  familyMemberName?: string,
): Promise<MemberSavings[]> {
  const localList = getLocalSavings();

  try {
    await syncLocalSavingsToRemote();

    const query = supabase
      .from(SAVINGS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (!error && data) {
      const remoteList: MemberSavings[] = data.map((row: any) => ({
        id: row.id,
        familyMemberId: row.family_member_id,
        familyMemberName: row.family_member_name ?? "",
        title: row.title ?? "Savings Scheme",
        type: row.type ?? "DPS",
        institutionName: row.institution_name ?? "",
        accountNumber: row.account_number ?? "",
        monthlyInstallment: row.monthly_installment ? Number(row.monthly_installment) : undefined,
        principalAmount: row.principal_amount ? Number(row.principal_amount) : undefined,
        tenureYears: row.tenure_years ? Number(row.tenure_years) : undefined,
        tenureMonths: row.tenure_months ? Number(row.tenure_months) : undefined,
        startDate: row.start_date || new Date().toISOString().split("T")[0],
        maturityDate: row.maturity_date || undefined,
        interestRate: row.interest_rate ? Number(row.interest_rate) : undefined,
        maturityAmount: row.maturity_amount ? Number(row.maturity_amount) : undefined,
        depositDayOfMonth: row.deposit_day_of_month ? Number(row.deposit_day_of_month) : undefined,
        profitPayoutFrequency: row.profit_payout_frequency ?? undefined,
        depositLogs: Array.isArray(row.deposit_logs) ? row.deposit_logs : [],
        status: row.status ?? "ACTIVE",
        nomineeName: row.nominee_name ?? "",
        notes: row.notes ?? "",
        createdAt: row.created_at,
      }));

      const remoteIds = new Set(remoteList.map((r) => r.id));
      const currentLocal = getLocalSavings();
      const filteredLocal = currentLocal.filter((s) => !remoteIds.has(s.id));
      const merged = [...remoteList, ...filteredLocal];
      saveLocalSavings(merged);

      if (!familyMemberId && !familyMemberName) return merged;

      const normName = familyMemberName?.trim().toLowerCase();
      return merged.filter((s) => {
        if (familyMemberId && s.familyMemberId === familyMemberId) return true;
        if (normName && s.familyMemberName?.trim().toLowerCase() === normName) return true;
        if (
          (familyMemberId === "owner-admin-towsif" || familyMemberName?.toLowerCase().includes("towsif")) &&
          (!s.familyMemberId || s.familyMemberId === "owner-admin-towsif")
        ) {
          return true;
        }
        return false;
      });
    }
  } catch (err) {
    console.warn("listMemberSavings error, using local:", err);
  }

  if (!familyMemberId && !familyMemberName) return localList;
  const normName = familyMemberName?.trim().toLowerCase();
  return localList.filter((s) => {
    if (familyMemberId && s.familyMemberId === familyMemberId) return true;
    if (normName && s.familyMemberName?.trim().toLowerCase() === normName) return true;
    if (
      (familyMemberId === "owner-admin-towsif" || familyMemberName?.toLowerCase().includes("towsif")) &&
      (!s.familyMemberId || s.familyMemberId === "owner-admin-towsif")
    ) {
      return true;
    }
    return false;
  });
}

export async function createMemberSavings(
  savingsData: Omit<MemberSavings, "id" | "createdAt" | "depositLogs">,
  initialDeposit?: boolean
): Promise<MemberSavings> {
  let createdId = `sav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let finalMemberId = savingsData.familyMemberId;
  let remoteCreated: MemberSavings | null = null;

  const depositLogs: SavingsDepositLog[] = [];
  if (initialDeposit && savingsData.monthlyInstallment && savingsData.type === "DPS") {
    depositLogs.push({
      id: `dep_${Date.now()}_init`,
      savingsId: createdId,
      installmentNo: 1,
      amount: savingsData.monthlyInstallment,
      depositDate: savingsData.startDate || new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Card",
      notes: "First installment deposit upon opening DPS",
      createdAt: new Date().toISOString(),
    });
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (!finalMemberId || finalMemberId === "owner-admin-towsif") {
        finalMemberId = user.id;
      }

      const { data, error } = await supabase
        .from(SAVINGS_TABLE)
        .insert({
          owner_id: user.id,
          family_member_id: finalMemberId,
          family_member_name: savingsData.familyMemberName || "",
          title: savingsData.title,
          type: savingsData.type,
          institution_name: savingsData.institutionName,
          account_number: savingsData.accountNumber || "",
          monthly_installment: savingsData.monthlyInstallment,
          principal_amount: savingsData.principalAmount,
          tenure_years: savingsData.tenureYears,
          tenure_months: savingsData.tenureMonths,
          start_date: savingsData.startDate,
          maturity_date: savingsData.maturityDate,
          interest_rate: savingsData.interestRate,
          maturity_amount: savingsData.maturityAmount,
          deposit_day_of_month: savingsData.depositDayOfMonth,
          profit_payout_frequency: savingsData.profitPayoutFrequency,
          deposit_logs: depositLogs,
          status: savingsData.status || "ACTIVE",
          nominee_name: savingsData.nomineeName || "",
          notes: savingsData.notes || "",
        })
        .select()
        .single();

      if (!error && data) {
        createdId = data.id;
        remoteCreated = {
          id: data.id,
          familyMemberId: data.family_member_id,
          familyMemberName: data.family_member_name,
          title: data.title,
          type: data.type,
          institutionName: data.institution_name,
          accountNumber: data.account_number,
          monthlyInstallment: data.monthly_installment ? Number(data.monthly_installment) : undefined,
          principalAmount: data.principal_amount ? Number(data.principal_amount) : undefined,
          tenureYears: data.tenure_years ? Number(data.tenure_years) : undefined,
          tenureMonths: data.tenure_months ? Number(data.tenure_months) : undefined,
          startDate: data.start_date,
          maturityDate: data.maturity_date,
          interestRate: data.interest_rate ? Number(data.interest_rate) : undefined,
          maturityAmount: data.maturity_amount ? Number(data.maturity_amount) : undefined,
          depositDayOfMonth: data.deposit_day_of_month ? Number(data.deposit_day_of_month) : undefined,
          profitPayoutFrequency: data.profit_payout_frequency,
          depositLogs: Array.isArray(data.deposit_logs) ? data.deposit_logs : depositLogs,
          status: data.status,
          nomineeName: data.nominee_name,
          notes: data.notes,
          createdAt: data.created_at,
        };
      }
    }
  } catch (err) {
    console.warn("createMemberSavings remote error, falling back locally:", err);
  }

  const localSavings: MemberSavings = remoteCreated || {
    ...savingsData,
    id: createdId,
    familyMemberId: finalMemberId,
    depositLogs,
    status: savingsData.status || "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  const localList = getLocalSavings();
  localList.unshift(localSavings);
  saveLocalSavings(localList);

  return localSavings;
}

export async function updateMemberSavings(
  id: string,
  updates: Partial<MemberSavings>
): Promise<MemberSavings> {
  const localList = getLocalSavings();
  const index = localList.findIndex((s) => s.id === id);
  if (index < 0) throw new Error("Savings record not found");

  const updated: MemberSavings = {
    ...localList[index],
    ...updates,
  };

  localList[index] = updated;
  saveLocalSavings(localList);

  if (!id.startsWith("sav_")) {
    try {
      await supabase
        .from(SAVINGS_TABLE)
        .update({
          title: updated.title,
          type: updated.type,
          institution_name: updated.institutionName,
          account_number: updated.accountNumber,
          monthly_installment: updated.monthlyInstallment,
          principal_amount: updated.principalAmount,
          tenure_years: updated.tenureYears,
          tenure_months: updated.tenureMonths,
          start_date: updated.startDate,
          maturity_date: updated.maturityDate,
          interest_rate: updated.interestRate,
          maturity_amount: updated.maturityAmount,
          deposit_day_of_month: updated.depositDayOfMonth,
          profit_payout_frequency: updated.profitPayoutFrequency,
          status: updated.status,
          nominee_name: updated.nomineeName,
          notes: updated.notes,
          deposit_logs: updated.depositLogs,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("updateMemberSavings remote error:", err);
    }
  }

  return updated;
}

export async function deleteMemberSavings(id: string): Promise<boolean> {
  const localList = getLocalSavings();
  const filtered = localList.filter((s) => s.id !== id);
  saveLocalSavings(filtered);

  if (!id.startsWith("sav_")) {
    try {
      await supabase.from(SAVINGS_TABLE).delete().eq("id", id);
    } catch (err) {
      console.warn("deleteMemberSavings remote error:", err);
    }
  }
  return true;
}

export async function addSavingsDepositLog(
  savingsId: string,
  logData: Omit<SavingsDepositLog, "id" | "createdAt" | "savingsId">,
  syncToDailyExpenses = false,
  familyMemberName?: string
): Promise<MemberSavings> {
  const localList = getLocalSavings();
  const index = localList.findIndex((s) => s.id === savingsId);
  if (index < 0) throw new Error("Savings account not found");

  const savings = localList[index];
  const nextInstallmentNo = (savings.depositLogs?.length || 0) + 1;

  const newLog: SavingsDepositLog = {
    ...logData,
    id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    savingsId,
    installmentNo: logData.installmentNo || nextInstallmentNo,
    createdAt: new Date().toISOString(),
  };

  const updatedLogs = [...(savings.depositLogs || []), newLog];

  // Check if fully matured based on tenure
  const totalMonthsExpected = savings.tenureMonths || (savings.tenureYears ? savings.tenureYears * 12 : 0);
  const isMatured = totalMonthsExpected > 0 && updatedLogs.length >= totalMonthsExpected;

  const updatedSavings: MemberSavings = {
    ...savings,
    depositLogs: updatedLogs,
    status: isMatured ? "MATURED" : savings.status,
  };

  localList[index] = updatedSavings;
  saveLocalSavings(localList);

  if (!savingsId.startsWith("sav_")) {
    try {
      await supabase
        .from(SAVINGS_TABLE)
        .update({
          deposit_logs: updatedLogs,
          status: updatedSavings.status,
        })
        .eq("id", savingsId);
    } catch {}
  }

  // Optionally sync into Daily Expenses
  if (syncToDailyExpenses) {
    try {
      await createDailyExpense({
        familyMemberId: savings.familyMemberId,
        familyMemberName: savings.familyMemberName || familyMemberName || "",
        date: logData.depositDate || new Date().toISOString().split("T")[0],
        amount: logData.amount,
        category: "DPS & Savings Deposit",
        paymentMethod: logData.paymentMethod,
        description: `${savings.title} - Installment #${newLog.installmentNo} deposit to ${savings.institutionName}`,
        merchant: savings.institutionName,
        notes: logData.notes || `DPS deposit: ${savings.accountNumber || ""}`,
      });
    } catch (err) {
      console.warn("Could not sync deposit to Daily Expenses:", err);
    }
  }

  return updatedSavings;
}

export async function updateSavingsDepositLog(
  savingsId: string,
  logId: string,
  updates: Partial<SavingsDepositLog>
): Promise<MemberSavings> {
  const localList = getLocalSavings();
  const index = localList.findIndex((s) => s.id === savingsId);
  if (index < 0) throw new Error("Savings account not found");

  const savings = localList[index];
  const updatedLogs = (savings.depositLogs || []).map((log) => {
    if (log.id === logId) {
      return { ...log, ...updates };
    }
    return log;
  });

  const updatedSavings: MemberSavings = {
    ...savings,
    depositLogs: updatedLogs,
  };

  localList[index] = updatedSavings;
  saveLocalSavings(localList);

  if (!savingsId.startsWith("sav_")) {
    try {
      await supabase
        .from(SAVINGS_TABLE)
        .update({
          deposit_logs: updatedLogs,
        })
        .eq("id", savingsId);
    } catch {}
  }

  return updatedSavings;
}

export async function deleteSavingsDepositLog(
  savingsId: string,
  logId: string
): Promise<MemberSavings> {
  const localList = getLocalSavings();
  const index = localList.findIndex((s) => s.id === savingsId);
  if (index < 0) throw new Error("Savings account not found");

  const savings = localList[index];
  const updatedLogs = (savings.depositLogs || []).filter((log) => log.id !== logId);

  const updatedSavings: MemberSavings = {
    ...savings,
    depositLogs: updatedLogs,
  };

  localList[index] = updatedSavings;
  saveLocalSavings(localList);

  if (!savingsId.startsWith("sav_")) {
    try {
      await supabase
        .from(SAVINGS_TABLE)
        .update({
          deposit_logs: updatedLogs,
        })
        .eq("id", savingsId);
    } catch {}
  }

  return updatedSavings;
}


