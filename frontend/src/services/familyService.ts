import { supabase } from "../lib/supabase";
import type { FamilyMember, FamilyMemberAccess } from "../types";
import { getUserEmail } from "./api";

const TABLE = "lifenest_family_members";
const LOCAL_KEY = "lifenest_local_family_members";

export function getDefaultMemberAccess(role: FamilyMemberAccess["loginRole"] = "Vehicle_Manager"): FamilyMemberAccess {
  return {
    canLogin: true,
    loginRole: role,
    canAccessDashboard: true,
    canAccessVehicles: true,
    assignedVehicleIds: [], // empty means all vehicles, or list of vehicle IDs
    canWriteFuel: true,
    canWriteMaintenance: true,
    canWriteDocuments: role === "Admin",
    canAccessVault: role === "Admin",
    assignedVaultFolderScope: "all",
    assignedVaultFolders: [],
    canCreateDocuments: role === "Admin",
    canReadDocuments: true,
    canUpdateDocuments: role === "Admin",
    canDeleteDocuments: role === "Admin",
    canAccessProperties: role === "Admin",
    assignedPropertyIds: [], // empty means all properties, or list of property IDs
    assignedPropertyScope: "all",
    canCreateProperties: role === "Admin",
    canReadProperties: true,
    canUpdateProperties: role === "Admin",
    canDeleteProperties: role === "Admin",
    canWriteRent: role === "Admin",
    canWritePropertyMaintenance: role === "Admin",

    canAccessWarranties: true,
    canCreateWarranties: role === "Admin",
    canReadWarranties: true,
    canUpdateWarranties: role === "Admin",
    canDeleteWarranties: role === "Admin",
    assignedWarrantyScope: "all",
    assignedWarrantyCategories: [],

    canAccessTasks: true,
    canCreateTasks: true,
    canReadTasks: true,
    canUpdateTasks: true,
    canDeleteTasks: role === "Admin",
    assignedTaskScope: "all",

    canAccessSchedule: true,

    canAccessDailyExpenses: true,
    canCreateExpenses: true,
    canReadExpenses: true,
    canUpdateExpenses: true,
    canDeleteExpenses: role === "Admin",
    assignedExpenseScope: "all",

    assignedVehicleScope: "all",
    canCreateVehicles: role === "Admin",
    canReadVehicles: true,
    canUpdateVehicles: role === "Admin" || role === "Vehicle_Manager",
    canDeleteVehicles: role === "Admin",
  };
}

function getLocalMembers(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMembers(list: FamilyMember[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {}
}

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  const localList = getLocalMembers();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const remoteList: FamilyMember[] = data.map((row) => {
        let access = getDefaultMemberAccess();
        try {
          const localAcc = localStorage.getItem(`lifenest_fam_access_${row.id}`);
          if (localAcc) {
            access = JSON.parse(localAcc);
          } else if (row.notes && row.notes.startsWith("access:")) {
            access = JSON.parse(row.notes.slice(7));
          }
        } catch {}

        return {
          id: row.id,
          fullName: row.full_name,
          relationship: row.relationship,
          dateOfBirth: row.date_of_birth ?? undefined,
          phone: row.phone ?? "",
          email: row.email ?? "",
          address: row.address ?? "",
          nationality: row.nationality ?? "Bangladeshi",
          identificationInfo: row.identification_info ?? "",
          notes: row.notes && !row.notes.startsWith("access:") ? row.notes : "",
          photoUrl: row.photo_url ?? undefined,
          access,
        };
      });

      // Filter out any local temporary draft entries that match a remote member by full name or ID
      const remoteNameSet = new Set(
        remoteList.map((r) => r.fullName.trim().toLowerCase())
      );
      const genuineLocal = localList.filter(
        (l) =>
          !remoteList.some((r) => r.id === l.id) &&
          !remoteNameSet.has(l.fullName.trim().toLowerCase())
      );

      // Deduplicate the combined list by normalized fullName & ID so every member appears exactly once
      const seenNames = new Set<string>();
      const deduped: FamilyMember[] = [];
      for (const m of [...remoteList, ...genuineLocal]) {
        const normName = m.fullName.trim().toLowerCase();
        if (!seenNames.has(normName)) {
          seenNames.add(normName);
          deduped.push(m);
        }
      }

      saveLocalMembers(deduped);
      return deduped;
    }
  } catch {}

  // Offline fallback deduplication
  const seenNames = new Set<string>();
  const dedupedLocal: FamilyMember[] = [];
  for (const m of localList) {
    const normName = m.fullName.trim().toLowerCase();
    if (!seenNames.has(normName)) {
      seenNames.add(normName);
      dedupedLocal.push(m);
    }
  }
  return dedupedLocal;
}

export async function listFamilyMembersWithSelf(): Promise<FamilyMember[]> {
  const members = await listFamilyMembers();

  // Find genuine household head (Self) in members (excluding invited members like Itisha)
  const selfMemberIndex = members.findIndex(
    (m) =>
      m.relationship === "Self" &&
      !m.fullName.toLowerCase().includes("itisha") &&
      !m.fullName.toLowerCase().includes("etisha")
  );

  if (selfMemberIndex >= 0) {
    const selfMember = members[selfMemberIndex];
    const others = members.filter((_, idx) => idx !== selfMemberIndex);
    return [selfMember, ...others];
  }

  // Look for Towsif as the primary household head
  const towsifIndex = members.findIndex(
    (m) => m.fullName.toLowerCase().includes("towsif")
  );
  if (towsifIndex >= 0) {
    const towsif: FamilyMember = {
      ...members[towsifIndex],
      relationship: "Self",
      access: getDefaultMemberAccess("Admin"),
    };
    const others = members.filter((_, idx) => idx !== towsifIndex);
    return [towsif, ...others];
  }

  // Fallback default head
  const defaultHead: FamilyMember = {
    id: "owner-admin-towsif",
    fullName: "Towsif Muhtadi",
    relationship: "Self",
    email: "towsif.muhtadi@gmail.com",
    phone: "01537295053",
    nationality: "Bangladeshi",
    access: getDefaultMemberAccess("Admin"),
  };

  return [defaultHead, ...members];
}

export async function createFamilyMember(
  input: Omit<FamilyMember, "id">,
): Promise<FamilyMember> {
  const access = input.access || getDefaultMemberAccess();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          owner_id: user.id,
          full_name: input.fullName,
          relationship: input.relationship,
          date_of_birth: input.dateOfBirth || null,
          phone: input.phone ?? "",
          email: input.email ?? "",
          address: input.address ?? "",
          nationality: input.nationality ?? "Bangladeshi",
          identification_info: input.identificationInfo ?? "",
          notes: `access:${JSON.stringify(access)}`,
          photo_url: input.photoUrl || null,
        })
        .select()
        .single();

      if (!error && data) {
        const remoteMember: FamilyMember = {
          id: data.id,
          fullName: data.full_name,
          relationship: data.relationship,
          dateOfBirth: data.date_of_birth ?? undefined,
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          nationality: data.nationality ?? "Bangladeshi",
          identificationInfo: data.identification_info ?? "",
          notes: "",
          photoUrl: data.photo_url ?? undefined,
          access,
        };

        try {
          localStorage.setItem(`lifenest_fam_access_${data.id}`, JSON.stringify(access));
        } catch {}

        // Remove any existing member with same name or ID from local list and append the official record
        const current = getLocalMembers().filter(
          (m) =>
            m.fullName.trim().toLowerCase() !== input.fullName.trim().toLowerCase() &&
            m.id !== data.id
        );
        saveLocalMembers([...current, remoteMember]);
        return remoteMember;
      }
    }
  } catch {}

  const localId = `fam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newMember: FamilyMember = {
    ...input,
    id: localId,
    access,
  };

  const current = getLocalMembers().filter(
    (m) => m.fullName.trim().toLowerCase() !== input.fullName.trim().toLowerCase()
  );
  saveLocalMembers([...current, newMember]);
  try {
    localStorage.setItem(`lifenest_fam_access_${localId}`, JSON.stringify(access));
  } catch {}

  return newMember;
}

export async function updateFamilyMember(
  id: string,
  input: Partial<FamilyMember>,
): Promise<FamilyMember> {
  const current = getLocalMembers();
  const found = current.find((m) => m.id === id);
  const updatedMember: FamilyMember = {
    ...(found || {
      id,
      fullName: input.fullName || "",
      relationship: input.relationship || "Other",
    }),
    ...input,
  };

  if (input.access) {
    try {
      localStorage.setItem(`lifenest_fam_access_${id}`, JSON.stringify(input.access));
    } catch {}
  }

  saveLocalMembers(current.map((m) => (m.id === id ? updatedMember : m)));

  try {
    const patch: Record<string, unknown> = {};
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.relationship !== undefined) patch.relationship = input.relationship;
    if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth || null;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.address !== undefined) patch.address = input.address;
    if (input.nationality !== undefined) patch.nationality = input.nationality;
    if (input.identificationInfo !== undefined) patch.identification_info = input.identificationInfo;
    if (input.access !== undefined) patch.notes = `access:${JSON.stringify(input.access)}`;

    await supabase.from(TABLE).update(patch).eq("id", id);
  } catch {}

  return updatedMember;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const current = getLocalMembers();
  saveLocalMembers(current.filter((m) => m.id !== id));
  try {
    localStorage.removeItem(`lifenest_fam_access_${id}`);
    await supabase.from(TABLE).delete().eq("id", id);
  } catch {}
}

export type CurrentUserAccessResult = {
  member: FamilyMember | null;
  access: FamilyMemberAccess;
  isHead: boolean;
};

function isMatchingMember(
  m: FamilyMember,
  email: string,
  userId: string,
  userFullName?: string,
): boolean {
  if (userId && m.id === userId) return true;
  if (!email && !userFullName) return false;

  const mEmail = (m.email || "").trim().toLowerCase();
  const mName = (m.fullName || "").trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const userPrefix = cleanEmail.split("@")[0].trim();
  const mPrefix = mEmail.split("@")[0].trim();

  // 1. Direct email match
  if (mEmail && cleanEmail && mEmail === cleanEmail) return true;

  // 2. Email prefix match (e.g. itishahabib73 matching itishahabib73@gmail.com)
  if (mPrefix && userPrefix && mPrefix === userPrefix) return true;

  // 3. Member email was entered without @ (e.g. "itishahabib73")
  if (mEmail && !mEmail.includes("@") && mEmail === userPrefix) return true;

  // 4. Normalized alphanumeric name match (e.g. "Itisha Habib 73" matching "itishahabib73")
  const mNameNorm = mName.replace(/[^a-z0-9]/g, "");
  const userPrefixNorm = userPrefix.replace(/[^a-z0-9]/g, "");
  if (
    mNameNorm &&
    userPrefixNorm &&
    (mNameNorm === userPrefixNorm ||
      mNameNorm.includes(userPrefixNorm) ||
      userPrefixNorm.includes(mNameNorm))
  ) {
    return true;
  }

  // 5. Keyword match for Itisha
  if (
    (mName.includes("itisha") || mName.includes("etisha")) &&
    (cleanEmail.includes("itisha") || cleanEmail.includes("etisha") || (userFullName && userFullName.toLowerCase().includes("itisha")))
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves current active access permissions for the logged in account / family member.
 */
export async function getCurrentUserAccess(): Promise<CurrentUserAccessResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = (user?.email || getUserEmail() || "").trim().toLowerCase();
    const userId = user?.id || "";
    const userFullName = user?.user_metadata?.full_name ? String(user.user_metadata.full_name) : "";

    const members = await listFamilyMembers();

    // Check if matching member exists
    const found = members.find((m) => isMatchingMember(m, email, userId, userFullName));

    if (found) {
      // Only the genuine workspace owner (Towsif) with Self is the head
      if (found.relationship === "Self" && (email.includes("towsif") || !found.fullName.toLowerCase().includes("itisha"))) {
        return {
          member: found,
          access: { ...getDefaultMemberAccess("Admin"), canAccessDashboard: true },
          isHead: true,
        };
      }

      // Member is an invited collaborator (e.g. Itisha Habib)
      // Retrieve their stored permissions (notes from Supabase or localStorage)
      let access = found.access;
      try {
        const localAcc = localStorage.getItem(`lifenest_fam_access_${found.id}`);
        if (localAcc) {
          access = JSON.parse(localAcc);
        } else if (found.notes && found.notes.startsWith("access:")) {
          access = JSON.parse(found.notes.slice(7));
        }
      } catch {}

      const memberRole = access ? access.loginRole : "Viewer";
      const mergedAccess: FamilyMemberAccess = {
        ...getDefaultMemberAccess(memberRole),
        ...(access || {}),
      };

      return {
        member: found,
        access: mergedAccess,
        isHead: false,
      };
    }

    // If the logged-in user is Towsif / workspace owner
    if (email.includes("towsif") || !email) {
      const selfMember = members.find((m) => m.relationship === "Self") || null;
      return {
        member: selfMember,
        access: { ...getDefaultMemberAccess("Admin"), canAccessDashboard: true },
        isHead: true,
      };
    }

    // Default for unrecognized guest account: Restricted Viewer (NOT Admin)
    return {
      member: null,
      access: { ...getDefaultMemberAccess("Viewer"), canAccessDashboard: false },
      isHead: false,
    };
  } catch {
    return {
      member: null,
      access: { ...getDefaultMemberAccess("Viewer"), canAccessDashboard: false },
      isHead: false,
    };
  }
}

