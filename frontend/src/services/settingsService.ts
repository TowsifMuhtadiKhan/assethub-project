import { supabase } from "../lib/supabase";
import type { UserSettings } from "../types";

const TABLE = "lifenest_user_settings";

export async function getUserSettings(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      fullName: "",
      whatsappNumber: "",
      countryCode: "+880",
      whatsappEnabled: true,
      reminderDaysBefore: 7,
    };
  }

  const { data } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) {
    return {
      fullName: user.user_metadata?.full_name || "",
      whatsappNumber: "",
      countryCode: "+880",
      whatsappEnabled: true,
      reminderDaysBefore: 7,
    };
  }

  return {
    id: data.id,
    fullName: data.full_name,
    whatsappNumber: data.whatsapp_number,
    countryCode: data.country_code,
    whatsappEnabled: data.whatsapp_enabled,
    reminderDaysBefore: data.reminder_days_before,
    googleDriveFolderId: data.google_drive_folder_id || undefined,
    callmebotApiKey: data.callmebot_api_key || undefined,
  };
}

export async function saveUserSettings(
  settings: Partial<UserSettings>,
): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rowData: Record<string, unknown> = {
    owner_id: user.id,
    full_name: settings.fullName ?? "",
    whatsapp_number: settings.whatsappNumber ?? "",
    country_code: settings.countryCode ?? "+880",
    whatsapp_enabled: settings.whatsappEnabled ?? true,
    reminder_days_before: settings.reminderDaysBefore ?? 7,
    google_drive_folder_id: settings.googleDriveFolderId ?? "",
    updated_at: new Date().toISOString(),
  };

  if (settings.callmebotApiKey !== undefined) {
    rowData.callmebot_api_key = settings.callmebotApiKey;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rowData, { onConflict: "owner_id" })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    fullName: data.full_name,
    whatsappNumber: data.whatsapp_number,
    countryCode: data.country_code,
    whatsappEnabled: data.whatsapp_enabled,
    reminderDaysBefore: data.reminder_days_before,
    googleDriveFolderId: data.google_drive_folder_id || undefined,
    callmebotApiKey: data.callmebot_api_key || undefined,
  };
}
