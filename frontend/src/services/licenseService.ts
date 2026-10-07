import { supabase } from "../lib/supabase";
import type { LicenseItem } from "../types";

const TABLE = "lifenest_licenses";

export async function listLicenses(): Promise<LicenseItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("expiry_date", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    licenseName: row.license_name,
    licenseNumber: row.license_number ?? "",
    holderName: row.holder_name ?? "",
    familyMemberId: row.family_member_id ?? undefined,
    issuingAuthority: row.issuing_authority ?? "",
    issueDate: row.issue_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    renewalPeriod: row.renewal_period ?? "Annual",
    renewalCost: Number(row.renewal_cost ?? 0),
    reminderDate: row.reminder_date ?? undefined,
    documentUrl: row.document_url ?? undefined,
    notes: row.notes ?? "",
  }));
}

export async function createLicense(
  input: Omit<LicenseItem, "id">,
): Promise<LicenseItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData = {
    owner_id: user.id,
    license_name: input.licenseName,
    license_number: input.licenseNumber ?? "",
    holder_name: input.holderName ?? "",
    family_member_id: input.familyMemberId || null,
    issuing_authority: input.issuingAuthority ?? "",
    issue_date: input.issueDate || null,
    expiry_date: input.expiryDate || null,
    renewal_period: input.renewalPeriod || "Annual",
    renewal_cost: input.renewalCost ?? 0,
    reminder_date: input.reminderDate || null,
    document_url: input.documentUrl || null,
    notes: input.notes ?? "",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rowData)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    licenseName: data.license_name,
    licenseNumber: data.license_number ?? "",
    holderName: data.holder_name ?? "",
    familyMemberId: data.family_member_id ?? undefined,
    issuingAuthority: data.issuing_authority ?? "",
    issueDate: data.issue_date ?? undefined,
    expiryDate: data.expiry_date ?? undefined,
    renewalPeriod: data.renewal_period ?? "Annual",
    renewalCost: Number(data.renewal_cost ?? 0),
    reminderDate: data.reminder_date ?? undefined,
    documentUrl: data.document_url ?? undefined,
    notes: data.notes ?? "",
  };
}

export async function deleteLicense(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
