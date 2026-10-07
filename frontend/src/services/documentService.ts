import { supabase } from "../lib/supabase";
import type { DocumentItem, DocumentFolder } from "../types";

const TABLE = "lifenest_documents";

export async function listDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*, lifenest_family_members(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    documentNumber: row.document_number ?? "",
    issueDate: row.issue_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    issuingAuthority: row.issuing_authority ?? "",
    familyMemberId: row.family_member_id ?? undefined,
    familyMemberName: row.lifenest_family_members?.full_name ?? undefined,
    assetType: row.asset_type ?? "",
    assetId: row.asset_id ?? "",
    folderName: row.folder_name ?? "General",
    fileUrl: row.file_url ?? undefined,
    fileType: row.file_type ?? "pdf",
    storageProvider: row.storage_provider ?? "supabase",
    driveFileId: row.drive_file_id ?? undefined,
    isFavorite: row.is_favorite ?? false,
    requiresRenewal: row.requires_renewal ?? false,
    reminderDate: row.reminder_date ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes ?? "",
    createdAt: row.created_at,
  }));
}

export async function createDocument(
  input: Omit<DocumentItem, "id" | "createdAt" | "familyMemberName">,
): Promise<DocumentItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData = {
    owner_id: user.id,
    name: input.name,
    category: input.category,
    document_number: input.documentNumber ?? "",
    issue_date: input.issueDate || null,
    expiry_date: input.expiryDate || null,
    issuing_authority: input.issuingAuthority ?? "",
    family_member_id: input.familyMemberId || null,
    asset_type: input.assetType ?? "",
    asset_id: input.assetId ?? "",
    folder_name: input.folderName || "General",
    file_url: input.fileUrl || null,
    file_type: input.fileType || "pdf",
    storage_provider: input.storageProvider || "supabase",
    drive_file_id: input.driveFileId || null,
    is_favorite: input.isFavorite ?? false,
    requires_renewal: input.requiresRenewal ?? false,
    reminder_date: input.reminderDate || null,
    tags: input.tags || [],
    notes: input.notes ?? "",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rowData)
    .select("*, lifenest_family_members(full_name)")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    documentNumber: data.document_number ?? "",
    issueDate: data.issue_date ?? undefined,
    expiryDate: data.expiry_date ?? undefined,
    issuingAuthority: data.issuing_authority ?? "",
    familyMemberId: data.family_member_id ?? undefined,
    familyMemberName: data.lifenest_family_members?.full_name ?? undefined,
    assetType: data.asset_type ?? "",
    assetId: data.asset_id ?? "",
    folderName: data.folder_name ?? "General",
    fileUrl: data.file_url ?? undefined,
    fileType: data.file_type ?? "pdf",
    storageProvider: data.storage_provider ?? "supabase",
    driveFileId: data.drive_file_id ?? undefined,
    isFavorite: data.is_favorite ?? false,
    requiresRenewal: data.requires_renewal ?? false,
    reminderDate: data.reminder_date ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    notes: data.notes ?? "",
    createdAt: data.created_at,
  };
}

export async function updateDocument(
  id: string,
  input: Partial<DocumentItem>,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.category !== undefined) patch.category = input.category;
  if (input.documentNumber !== undefined) patch.document_number = input.documentNumber;
  if (input.issueDate !== undefined) patch.issue_date = input.issueDate || null;
  if (input.expiryDate !== undefined) patch.expiry_date = input.expiryDate || null;
  if (input.issuingAuthority !== undefined) patch.issuing_authority = input.issuingAuthority;
  if (input.familyMemberId !== undefined) patch.family_member_id = input.familyMemberId || null;
  if (input.assetType !== undefined) patch.asset_type = input.assetType;
  if (input.assetId !== undefined) patch.asset_id = input.assetId;
  if (input.folderName !== undefined) patch.folder_name = input.folderName;
  if (input.fileUrl !== undefined) patch.file_url = input.fileUrl;
  if (input.isFavorite !== undefined) patch.is_favorite = input.isFavorite;
  if (input.requiresRenewal !== undefined) patch.requires_renewal = input.requiresRenewal;
  if (input.reminderDate !== undefined) patch.reminder_date = input.reminderDate || null;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

const FOLDERS_TABLE = "lifenest_document_folders";
const LOCAL_FOLDERS_KEY = "lifenest_local_folders";

function getLocalFolders(): DocumentFolder[] {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFolders(folders: DocumentFolder[]) {
  try {
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
  } catch {}
}

export async function listDocumentFolders(): Promise<DocumentFolder[]> {
  try {
    const { data, error } = await supabase
      .from(FOLDERS_TABLE)
      .select("*, lifenest_family_members(full_name)")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      familyMemberId: row.family_member_id ?? undefined,
      familyMemberName: row.lifenest_family_members?.full_name ?? undefined,
      color: row.color ?? "indigo",
      createdAt: row.created_at,
    }));
  } catch {
    return getLocalFolders();
  }
}

export async function createDocumentFolder(input: {
  name: string;
  familyMemberId?: string;
  color?: string;
}): Promise<DocumentFolder> {
  const localId = `folder_${Date.now()}`;
  const newFolder: DocumentFolder = {
    id: localId,
    name: input.name,
    familyMemberId: input.familyMemberId || undefined,
    color: input.color || "indigo",
    createdAt: new Date().toISOString(),
  };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from(FOLDERS_TABLE)
        .insert({
          owner_id: user.id,
          name: input.name,
          family_member_id: input.familyMemberId || null,
          color: input.color || "indigo",
        })
        .select("*, lifenest_family_members(full_name)")
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          familyMemberId: data.family_member_id ?? undefined,
          familyMemberName: data.lifenest_family_members?.full_name ?? undefined,
          color: data.color ?? "indigo",
          createdAt: data.created_at,
        };
      }
    }
  } catch {}

  const current = getLocalFolders();
  const updated = [...current, newFolder];
  saveLocalFolders(updated);
  return newFolder;
}

export async function deleteDocumentFolder(id: string): Promise<void> {
  try {
    await supabase.from(FOLDERS_TABLE).delete().eq("id", id);
  } catch {}

  const current = getLocalFolders();
  saveLocalFolders(current.filter((f) => f.id !== id));
}
