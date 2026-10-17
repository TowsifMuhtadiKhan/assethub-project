import { supabase } from "../lib/supabase";
import { getUserEmail } from "./api";

export type PlanTier =
  | "Free"
  | "Personal"
  | "Family"
  | "Premium"
  | "Property_Pro"
  | "Unlimited_Admin";

export interface PlanLimits {
  tier: PlanTier;
  label: string;
  priceMonthlyBdt: number;
  priceYearlyBdt: number;
  maxVehicles: number;
  maxProperties: number;
  maxDocuments: number;
  maxMembers: number;
  maxUnits: number;
  storageMb: number;
  hasDpsEmi: boolean;
  hasAdvancedAnalytics: boolean;
  hasFamilySharing: boolean;
  hasPropertyPro: boolean;
  hasWhatsappAlerts: boolean;
  hasCustomExport: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  Free: {
    tier: "Free",
    label: "Free (আগে ব্যবহার করে দেখি)",
    priceMonthlyBdt: 0,
    priceYearlyBdt: 0,
    maxVehicles: 1,
    maxProperties: 1,
    maxDocuments: 10,
    maxMembers: 1,
    maxUnits: 1,
    storageMb: 100,
    hasDpsEmi: false,
    hasAdvancedAnalytics: false,
    hasFamilySharing: false,
    hasPropertyPro: false,
    hasWhatsappAlerts: false,
    hasCustomExport: false,
  },
  Personal: {
    tier: "Personal",
    label: "Personal (শুধু আমার জন্য)",
    priceMonthlyBdt: 99,
    priceYearlyBdt: 999,
    maxVehicles: 3,
    maxProperties: 3,
    maxDocuments: 100,
    maxMembers: 1,
    maxUnits: 3,
    storageMb: 1024, // 1 GB
    hasDpsEmi: true,
    hasAdvancedAnalytics: true,
    hasFamilySharing: false,
    hasPropertyPro: false,
    hasWhatsappAlerts: true,
    hasCustomExport: true,
  },
  Family: {
    tier: "Family",
    label: "Family (আমার পরিবারের জন্য)",
    priceMonthlyBdt: 199,
    priceYearlyBdt: 1999,
    maxVehicles: 10,
    maxProperties: 10,
    maxDocuments: 500,
    maxMembers: 5,
    maxUnits: 10,
    storageMb: 5120, // 5 GB
    hasDpsEmi: true,
    hasAdvancedAnalytics: true,
    hasFamilySharing: true,
    hasPropertyPro: false,
    hasWhatsappAlerts: true,
    hasCustomExport: true,
  },
  Premium: {
    tier: "Premium",
    label: "Premium (বিশাল অ্যাসেট ও দায়িত্ব)",
    priceMonthlyBdt: 399,
    priceYearlyBdt: 3999,
    maxVehicles: 50,
    maxProperties: 50,
    maxDocuments: 5000,
    maxMembers: 10,
    maxUnits: 50,
    storageMb: 25600, // 25 GB
    hasDpsEmi: true,
    hasAdvancedAnalytics: true,
    hasFamilySharing: true,
    hasPropertyPro: true,
    hasWhatsappAlerts: true,
    hasCustomExport: true,
  },
  Property_Pro: {
    tier: "Property_Pro",
    label: "Property Pro (আমার সম্পত্তির জন্য)",
    priceMonthlyBdt: 599,
    priceYearlyBdt: 5999,
    maxVehicles: 10,
    maxProperties: 30,
    maxDocuments: 2000,
    maxMembers: 5,
    maxUnits: 30,
    storageMb: 25600, // 25 GB
    hasDpsEmi: true,
    hasAdvancedAnalytics: true,
    hasFamilySharing: true,
    hasPropertyPro: true,
    hasWhatsappAlerts: true,
    hasCustomExport: true,
  },
  Unlimited_Admin: {
    tier: "Unlimited_Admin",
    label: "Unlimited Admin / Lifetime VIP",
    priceMonthlyBdt: 0,
    priceYearlyBdt: 0,
    maxVehicles: 999999,
    maxProperties: 999999,
    maxDocuments: 999999,
    maxMembers: 999999,
    maxUnits: 999999,
    storageMb: 99999999,
    hasDpsEmi: true,
    hasAdvancedAnalytics: true,
    hasFamilySharing: true,
    hasPropertyPro: true,
    hasWhatsappAlerts: true,
    hasCustomExport: true,
  },
};

export interface UserSubscriptionRecord {
  id: string;
  userEmail: string;
  userName?: string;
  planTier: PlanTier;
  billingCycle: "monthly" | "yearly" | "lifetime";
  status: "active" | "trial" | "expired";
  customLimits?: Partial<PlanLimits>;
  grantedByAdmin: boolean;
  notes?: string;
  expiresAt?: string | null;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = "lifenest_sub_";
const ADMIN_OVERRIDE_LIST_KEY = "lifenest_admin_subscriptions_list";

/**
 * Returns whether an email belongs to the primary workspace owner or admin.
 */
export function isSuperAdminAccount(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean.includes("towsif") ||
    clean === "admin" ||
    clean === "admin@lifenest.app" ||
    clean === "towsifmuhtadikhan@gmail.com"
  );
}

/**
 * Resolves the active subscription and limits for the given user email or current session.
 */
export async function getCurrentUserSubscription(
  overrideEmail?: string
): Promise<{
  tier: PlanTier;
  limits: PlanLimits;
  record: UserSubscriptionRecord;
  isUnlimited: boolean;
}> {
  let email = overrideEmail;

  if (!email) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email || getUserEmail() || "";
    } catch {
      email = getUserEmail() || "";
    }
  }

  const cleanEmail = (email || "").trim().toLowerCase();

  // If superadmin / Towsif, always full unlimited
  if (isSuperAdminAccount(cleanEmail)) {
    const adminRec: UserSubscriptionRecord = {
      id: "admin_master",
      userEmail: cleanEmail || "towsif",
      userName: "Towsif (Owner)",
      planTier: "Unlimited_Admin",
      billingCycle: "lifetime",
      status: "active",
      grantedByAdmin: true,
      notes: "Primary System Master Admin",
      updatedAt: new Date().toISOString(),
    };
    return {
      tier: "Unlimited_Admin",
      limits: PLAN_LIMITS.Unlimited_Admin,
      record: adminRec,
      isUnlimited: true,
    };
  }

  // 1. Check local storage override cache
  try {
    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanEmail}`);
    if (local) {
      const parsed: UserSubscriptionRecord = JSON.parse(local);
      const baseLimits = PLAN_LIMITS[parsed.planTier] || PLAN_LIMITS.Free;
      const mergedLimits: PlanLimits = {
        ...baseLimits,
        ...(parsed.customLimits || {}),
      };
      return {
        tier: parsed.planTier,
        limits: mergedLimits,
        record: parsed,
        isUnlimited: parsed.planTier === "Unlimited_Admin",
      };
    }
  } catch {}

  // 2. Check remote database (if supabase table exists)
  try {
    const { data } = await supabase
      .from("lifenest_subscriptions")
      .select("*")
      .eq("user_email", cleanEmail)
      .maybeSingle();

    if (data) {
      const tier = (data.plan_tier as PlanTier) || "Free";
      const baseLimits = PLAN_LIMITS[tier] || PLAN_LIMITS.Free;
      const rec: UserSubscriptionRecord = {
        id: data.id,
        userEmail: data.user_email,
        planTier: tier,
        billingCycle: data.billing_cycle || "yearly",
        status: data.status || "active",
        grantedByAdmin: Boolean(data.granted_by_admin),
        notes: data.notes || "",
        expiresAt: data.expires_at || null,
        updatedAt: data.updated_at || new Date().toISOString(),
      };
      return {
        tier,
        limits: baseLimits,
        record: rec,
        isUnlimited: tier === "Unlimited_Admin",
      };
    }
  } catch {}

  // 3. Default to Free tier for standard users
  const defaultFree: UserSubscriptionRecord = {
    id: `sub_${cleanEmail}`,
    userEmail: cleanEmail,
    planTier: "Free",
    billingCycle: "yearly",
    status: "active",
    grantedByAdmin: false,
    updatedAt: new Date().toISOString(),
  };

  return {
    tier: "Free",
    limits: PLAN_LIMITS.Free,
    record: defaultFree,
    isUnlimited: false,
  };
}

/**
 * Check whether a specific feature or limit is allowed for the user.
 */
export async function checkPlanLimit(
  feature:
    | "vehicles"
    | "properties"
    | "documents"
    | "members"
    | "units"
    | "dps_emi"
    | "family_sharing"
    | "advanced_analytics",
  currentCount = 0
): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  tier: PlanTier;
  message?: string;
  recommendedPlan?: PlanTier;
}> {
  const { tier, limits, isUnlimited } = await getCurrentUserSubscription();

  if (isUnlimited) {
    return { allowed: true, limit: 999999, current: currentCount, tier };
  }

  switch (feature) {
    case "vehicles": {
      const allowed = currentCount < limits.maxVehicles;
      return {
        allowed,
        limit: limits.maxVehicles,
        current: currentCount,
        tier,
        recommendedPlan: tier === "Free" ? "Personal" : "Family",
        message: allowed
          ? undefined
          : `আপনার বর্তমান প্ল্যানে (${tier}) সর্বোচ্চ ${limits.maxVehicles}টি গাড়ি রাখা যায়। আরও গাড়ি যুক্ত করতে Personal বা Family প্ল্যানে আপগ্রেড করুন।`,
      };
    }
    case "properties": {
      const allowed = currentCount < limits.maxProperties;
      return {
        allowed,
        limit: limits.maxProperties,
        current: currentCount,
        tier,
        recommendedPlan: tier === "Free" ? "Personal" : "Property_Pro",
        message: allowed
          ? undefined
          : `আপনার বর্তমান প্ল্যানে (${tier}) সর্বোচ্চ ${limits.maxProperties}টি প্রোপার্টি রাখা যায়। আরও বাড়ি বা ফ্ল্যাট যুক্ত করতে Personal বা Property Pro প্ল্যানে আপগ্রেড করুন।`,
      };
    }
    case "documents": {
      const allowed = currentCount < limits.maxDocuments;
      return {
        allowed,
        limit: limits.maxDocuments,
        current: currentCount,
        tier,
        recommendedPlan: tier === "Free" ? "Personal" : "Family",
        message: allowed
          ? undefined
          : `আপনার বর্তমান প্ল্যানে (${tier}) সর্বোচ্চ ${limits.maxDocuments}টি ডকুমেন্ট আপলোড করা যায়। আরও ডকুমেন্ট সংরক্ষণ করতে Personal বা Family প্ল্যানে আপগ্রেড করুন।`,
      };
    }
    case "members": {
      const allowed = currentCount < limits.maxMembers;
      return {
        allowed,
        limit: limits.maxMembers,
        current: currentCount,
        tier,
        recommendedPlan: "Family",
        message: allowed
          ? undefined
          : `ফ্যামিলি মেম্বার যুক্ত করার সুবিধা Family (৫ জন) বা Premium (১০ জন) প্ল্যানে রয়েছে।`,
      };
    }
    case "units": {
      const allowed = currentCount < limits.maxUnits;
      return {
        allowed,
        limit: limits.maxUnits,
        current: currentCount,
        tier,
        recommendedPlan: "Property_Pro",
        message: allowed
          ? undefined
          : `আপনার বর্তমান প্ল্যানে (${tier}) সর্বোচ্চ ${limits.maxUnits}টি ফ্ল্যাট/রুম রাখা যায়। আরও ইউনিটের জন্য Property Pro বা Premium প্ল্যানে আপগ্রেড করুন।`,
      };
    }
    case "dps_emi": {
      const allowed = limits.hasDpsEmi;
      return {
        allowed,
        limit: allowed ? 999 : 0,
        current: currentCount,
        tier,
        recommendedPlan: "Family",
        message: allowed
          ? undefined
          : `DPS, FDR ও লোন EMI ম্যানেজমেন্ট সুবিধা Personal বা Family প্ল্যানে উপলব্ধ।`,
      };
    }
    case "family_sharing": {
      const allowed = limits.hasFamilySharing;
      return {
        allowed,
        limit: limits.maxMembers,
        current: currentCount,
        tier,
        recommendedPlan: "Family",
        message: allowed
          ? undefined
          : `পরিবারের সদস্যদের সাথে ডেটা শেয়ারিং সুবিধা Family প্ল্যানে উপলব্ধ।`,
      };
    }
    default:
      return { allowed: true, limit: 999, current: currentCount, tier };
  }
}

/**
 * ADMIN: Get all user subscription records.
 */
export async function getAllUserSubscriptions(): Promise<UserSubscriptionRecord[]> {
  const recordsMap = new Map<string, UserSubscriptionRecord>();

  // 1. Preload default master admin
  recordsMap.set("towsifmuhtadikhan@gmail.com", {
    id: "admin_towsif",
    userEmail: "towsifmuhtadikhan@gmail.com",
    userName: "Towsif (Owner)",
    planTier: "Unlimited_Admin",
    billingCycle: "lifetime",
    status: "active",
    grantedByAdmin: true,
    notes: "Primary Master Owner",
    updatedAt: new Date().toISOString(),
  });

  // 2. Fetch all from Supabase auth users & family members to list everyone
  try {
    const { data: members } = await supabase.from("lifenest_family_members").select("*");
    if (members) {
      for (const m of members) {
        const email = (m.email || "").trim().toLowerCase();
        if (email && !recordsMap.has(email)) {
          recordsMap.set(email, {
            id: `sub_${m.id}`,
            userEmail: email,
            userName: m.full_name,
            planTier: "Free",
            billingCycle: "yearly",
            status: "active",
            grantedByAdmin: false,
            updatedAt: m.created_at || new Date().toISOString(),
          });
        }
      }
    }
  } catch {}

  // 3. Fetch from remote subscriptions table
  try {
    const { data } = await supabase.from("lifenest_subscriptions").select("*");
    if (data) {
      for (const d of data) {
        recordsMap.set(d.user_email.toLowerCase(), {
          id: d.id,
          userEmail: d.user_email,
          userName: d.user_name || undefined,
          planTier: d.plan_tier || "Free",
          billingCycle: d.billing_cycle || "yearly",
          status: d.status || "active",
          grantedByAdmin: Boolean(d.granted_by_admin),
          notes: d.notes || "",
          expiresAt: d.expires_at || null,
          updatedAt: d.updated_at || new Date().toISOString(),
        });
      }
    }
  } catch {}

  // 4. Merge local admin overrides
  try {
    const localRaw = localStorage.getItem(ADMIN_OVERRIDE_LIST_KEY);
    if (localRaw) {
      const localList: UserSubscriptionRecord[] = JSON.parse(localRaw);
      for (const item of localList) {
        recordsMap.set(item.userEmail.toLowerCase(), item);
      }
    }
  } catch {}

  return Array.from(recordsMap.values());
}

/**
 * ADMIN: Update or grant plan access to a specific user.
 */
export async function saveUserSubscription(
  record: UserSubscriptionRecord
): Promise<void> {
  const cleanEmail = record.userEmail.trim().toLowerCase();
  const updated: UserSubscriptionRecord = {
    ...record,
    userEmail: cleanEmail,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save in local individual cache
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${cleanEmail}`,
      JSON.stringify(updated)
    );
  } catch {}

  // 2. Save in local admin list
  try {
    const localRaw = localStorage.getItem(ADMIN_OVERRIDE_LIST_KEY);
    const localList: UserSubscriptionRecord[] = localRaw ? JSON.parse(localRaw) : [];
    const filtered = localList.filter((r) => r.userEmail.toLowerCase() !== cleanEmail);
    localStorage.setItem(
      ADMIN_OVERRIDE_LIST_KEY,
      JSON.stringify([...filtered, updated])
    );
  } catch {}

  // 3. Save to Supabase (if table exists)
  try {
    await supabase.from("lifenest_subscriptions").upsert(
      {
        user_email: cleanEmail,
        user_name: record.userName || null,
        plan_tier: record.planTier,
        billing_cycle: record.billingCycle,
        status: record.status,
        granted_by_admin: record.grantedByAdmin,
        notes: record.notes || null,
        expires_at: record.expiresAt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email" }
    );
  } catch {}
}

/**
 * ADMIN: 1-Click VIP Grant.
 */
export async function grantUserFullAccess(
  email: string,
  userName?: string
): Promise<void> {
  await saveUserSubscription({
    id: `vip_${Date.now()}`,
    userEmail: email,
    userName: userName || email.split("@")[0],
    planTier: "Unlimited_Admin",
    billingCycle: "lifetime",
    status: "active",
    grantedByAdmin: true,
    notes: "Granted Full Lifetime Access by SuperAdmin Towsif",
    expiresAt: null,
    updatedAt: new Date().toISOString(),
  });
}
