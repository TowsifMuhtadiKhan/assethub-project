import { supabase } from "../lib/supabase";
import type { DailyExpense } from "../types";

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
