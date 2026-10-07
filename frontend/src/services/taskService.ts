import { supabase } from "../lib/supabase";
import type { TaskItem } from "../types";

const TABLE = "lifenest_tasks";

export async function listTasks(): Promise<TaskItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
      *,
      lifenest_family_members(full_name),
      lifenest_vehicles(name),
      lifenest_properties(name)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? "",
    category: row.category ?? "General",
    recurrence: row.recurrence ?? "None",
    familyMemberId: row.family_member_id ?? undefined,
    familyMemberName: row.lifenest_family_members?.full_name ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    vehicleName: row.lifenest_vehicles?.name ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyName: row.lifenest_properties?.name ?? undefined,
    documentId: row.document_id ?? undefined,
    status: row.status,
    reminderWhatsapp: row.reminder_whatsapp ?? true,
    reminderDate: row.reminder_date ?? undefined,
    notes: row.notes ?? "",
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function createTask(
  input: Omit<TaskItem, "id" | "createdAt">,
): Promise<TaskItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData = {
    owner_id: user.id,
    title: input.title,
    description: input.description ?? "",
    priority: input.priority || "Medium",
    due_date: input.dueDate || null,
    due_time: input.dueTime ?? "",
    category: input.category || "General",
    recurrence: input.recurrence || "None",
    family_member_id: input.familyMemberId || null,
    vehicle_id: input.vehicleId || null,
    property_id: input.propertyId || null,
    document_id: input.documentId || null,
    status: input.status || "Pending",
    reminder_whatsapp: input.reminderWhatsapp ?? true,
    reminder_date: input.reminderDate || null,
    notes: input.notes ?? "",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rowData)
    .select(
      `
      *,
      lifenest_family_members(full_name),
      lifenest_vehicles(name),
      lifenest_properties(name)
    `,
    )
    .single();

  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? "",
    priority: data.priority,
    dueDate: data.due_date ?? undefined,
    dueTime: data.due_time ?? "",
    category: data.category ?? "General",
    recurrence: data.recurrence ?? "None",
    familyMemberId: data.family_member_id ?? undefined,
    familyMemberName: data.lifenest_family_members?.full_name ?? undefined,
    vehicleId: data.vehicle_id ?? undefined,
    vehicleName: data.lifenest_vehicles?.name ?? undefined,
    propertyId: data.property_id ?? undefined,
    propertyName: data.lifenest_properties?.name ?? undefined,
    documentId: data.document_id ?? undefined,
    status: data.status,
    reminderWhatsapp: data.reminder_whatsapp ?? true,
    reminderDate: data.reminder_date ?? undefined,
    notes: data.notes ?? "",
    completedAt: data.completed_at ?? undefined,
    createdAt: data.created_at,
  };
}

export async function updateTaskStatus(
  id: string,
  status: TaskItem["status"],
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    completed_at: status === "Completed" ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
