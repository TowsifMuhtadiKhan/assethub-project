import { supabase, requireAuthUser } from "../lib/supabase";
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

  if (error) {
    if (error.code === "PGRST301" || error.message?.includes("JWT") || error.message?.includes("expired")) {
      await requireAuthUser().catch(() => {});
    }
    throw error;
  }
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
    cancelledAt: row.status === "Cancelled" ? (row.completed_at || row.updated_at || row.created_at) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }));
}

export async function createTask(
  input: Omit<TaskItem, "id" | "createdAt">,
): Promise<TaskItem> {
  const user = await requireAuthUser();

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
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    completed_at: status === "Completed" || status === "Cancelled" ? now : null,
    updated_at: now,
  };
  const { error } = await supabase.from(TABLE).update(patch).eq("id", id);
  if (error) throw error;
}

export async function cleanExpiredCancelledTasks(tasks: TaskItem[]): Promise<string[]> {
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const deletedIds: string[] = [];

  for (const t of tasks) {
    if (t.status === "Cancelled") {
      const refTime = t.cancelledAt
        ? new Date(t.cancelledAt).getTime()
        : t.updatedAt
        ? new Date(t.updatedAt).getTime()
        : t.createdAt
        ? new Date(t.createdAt).getTime()
        : 0;
      if (refTime > 0 && now - refTime >= THREE_DAYS_MS) {
        try {
          await deleteTask(t.id);
          deletedIds.push(t.id);
        } catch {
          // ignore
        }
      }
    }
  }
  return deletedIds;
}

export async function updateTask(
  id: string,
  input: Partial<Omit<TaskItem, "id" | "createdAt">>,
): Promise<TaskItem> {
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? "";
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.dueDate !== undefined) patch.due_date = input.dueDate || null;
  if (input.dueTime !== undefined) patch.due_time = input.dueTime ?? "";
  if (input.category !== undefined) patch.category = input.category;
  if (input.recurrence !== undefined) patch.recurrence = input.recurrence;
  if (input.familyMemberId !== undefined) patch.family_member_id = input.familyMemberId || null;
  if (input.vehicleId !== undefined) patch.vehicle_id = input.vehicleId || null;
  if (input.propertyId !== undefined) patch.property_id = input.propertyId || null;
  if (input.documentId !== undefined) patch.document_id = input.documentId || null;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at = input.status === "Completed" ? new Date().toISOString() : null;
  }
  if (input.reminderWhatsapp !== undefined) patch.reminder_whatsapp = input.reminderWhatsapp;
  if (input.reminderDate !== undefined) patch.reminder_date = input.reminderDate || null;
  if (input.notes !== undefined) patch.notes = input.notes ?? "";

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
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

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
