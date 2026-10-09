import { supabase } from "../lib/supabase";
import type { FamilyMember, FamilyMemberAccess } from "../types";

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
    canAccessWarranties: true,
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

      const map = new Map<string, FamilyMember>();
      localList.forEach((m) => map.set(m.id, m));
      remoteList.forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values());
      saveLocalMembers(merged);
      return merged;
    }
  } catch {}

  return localList;
}

export async function createFamilyMember(
  input: Omit<FamilyMember, "id">,
): Promise<FamilyMember> {
  const localId = `fam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const access = input.access || getDefaultMemberAccess();

  const newMember: FamilyMember = {
    ...input,
    id: localId,
    access,
  };

  const current = getLocalMembers();
  const updated = [...current, newMember];
  saveLocalMembers(updated);
  try {
    localStorage.setItem(`lifenest_fam_access_${localId}`, JSON.stringify(access));
  } catch {}

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
        newMember.id = data.id;
        try {
          localStorage.setItem(`lifenest_fam_access_${data.id}`, JSON.stringify(access));
        } catch {}
      }
    }
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
