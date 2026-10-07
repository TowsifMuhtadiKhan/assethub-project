import { supabase } from "../lib/supabase";
import type { FamilyMember } from "../types";

const TABLE = "lifenest_family_members";

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    relationship: row.relationship,
    dateOfBirth: row.date_of_birth ?? undefined,
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    nationality: row.nationality ?? "Bangladeshi",
    identificationInfo: row.identification_info ?? "",
    notes: row.notes ?? "",
    photoUrl: row.photo_url ?? undefined,
  }));
}

export async function createFamilyMember(
  input: Omit<FamilyMember, "id">,
): Promise<FamilyMember> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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
      notes: input.notes ?? "",
      photo_url: input.photoUrl || null,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    fullName: data.full_name,
    relationship: data.relationship,
    dateOfBirth: data.date_of_birth ?? undefined,
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    nationality: data.nationality ?? "Bangladeshi",
    identificationInfo: data.identification_info ?? "",
    notes: data.notes ?? "",
    photoUrl: data.photo_url ?? undefined,
  };
}

export async function updateFamilyMember(
  id: string,
  input: Partial<FamilyMember>,
): Promise<FamilyMember> {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.relationship !== undefined) patch.relationship = input.relationship;
  if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth || null;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.address !== undefined) patch.address = input.address;
  if (input.nationality !== undefined) patch.nationality = input.nationality;
  if (input.identificationInfo !== undefined) patch.identification_info = input.identificationInfo;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl || null;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    fullName: data.full_name,
    relationship: data.relationship,
    dateOfBirth: data.date_of_birth ?? undefined,
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    nationality: data.nationality ?? "Bangladeshi",
    identificationInfo: data.identification_info ?? "",
    notes: data.notes ?? "",
    photoUrl: data.photo_url ?? undefined,
  };
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
