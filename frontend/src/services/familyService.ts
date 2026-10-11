import { supabase } from "../lib/supabase";
import type { FamilyMember, FamilyMemberAccess } from "../types";
import { getUserSettings } from "./settingsService";

const TABLE = "lifenest_family_members";
const LOCAL_KEY = "lifenest_local_family_members";

export function getDefaultMemberAccess(role: FamilyMemberAccess["loginRole"] = "Vehicle_Manager"): FamilyMemberAccess {
  return {
    canLogin: true,
    loginRole: role,
    canAccessVehicles: true,
    assignedVehicleIds: [], // empty means all vehicles, or list of vehicle IDs
    canWriteFuel: true,
    canWriteMaintenance: true,
    canWriteDocuments: role === "Admin",
    canAccessVault: role === "Admin",
    canAccessProperties: role === "Admin",
    assignedPropertyIds: [], // empty means all properties, or list of property IDs
    canWriteRent: role === "Admin",
    canWritePropertyMaintenance: role === "Admin",
    canAccessWarranties: true,
    canAccessTasks: true,
    canAccessSchedule: true,
    canAccessDailyExpenses: true,
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

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const alreadyHasSelf = members.some(
        (m) =>
          m.relationship === "Self" ||
          (m.email && m.email.toLowerCase() === (user.email || "").toLowerCase()) ||
          m.id === user.id
      );

      if (!alreadyHasSelf) {
        let adminName = "";
        try {
          const settings = await getUserSettings();
          if (settings.fullName) {
            adminName = settings.fullName.trim();
          }
        } catch {}

        if (!adminName && user.user_metadata?.full_name) {
          adminName = String(user.user_metadata.full_name).trim();
        }

        if (!adminName && user.email) {
          adminName = user.email.split("@")[0].replace(/[._]/g, " ");
        }

        if (!adminName) {
          adminName = "Family Admin";
        }

        adminName = adminName
          .split(" ")
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
          .join(" ");

        const selfMember: FamilyMember = {
          id: user.id,
          fullName: adminName,
          relationship: "Self",
          email: user.email || "",
          phone: "",
          nationality: "Bangladeshi",
          access: getDefaultMemberAccess("Admin"),
        };

        return [selfMember, ...members];
      }
    }
  } catch {}

  return members;
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
