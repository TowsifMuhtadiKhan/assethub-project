import { supabase } from "../lib/supabase";
import type { UserSettings, WhatsAppContact } from "../types";

const TABLE = "lifenest_user_settings";
export const CONTACTS_STORAGE_KEY = "lifenest_whatsapp_contacts";

export function getLocalWhatsAppContacts(): WhatsAppContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveLocalWhatsAppContacts(contacts: WhatsAppContact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // fallback
  }
}

export async function getUserSettings(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contacts = getLocalWhatsAppContacts();

  if (!user) {
    if (contacts.length === 0) {
      contacts = [
        {
          id: "contact-1",
          alias: "Personal",
          phone: "01777785590",
          countryCode: "+880",
          isDefault: true,
        },
      ];
      saveLocalWhatsAppContacts(contacts);
    }

    const defaultContact = contacts.find((c) => c.isDefault) || contacts[0];
    return {
      fullName: "",
      whatsappNumber: defaultContact?.phone || "01777785590",
      countryCode: defaultContact?.countryCode || "+880",
      whatsappEnabled: true,
      reminderDaysBefore: 7,
      whatsappContacts: contacts,
    };
  }

  const { data } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) {
    if (contacts.length === 0) {
      contacts = [
        {
          id: "contact-1",
          alias: "Personal",
          phone: "01777785590",
          countryCode: "+880",
          isDefault: true,
        },
      ];
      saveLocalWhatsAppContacts(contacts);
    }
    const defaultContact = contacts.find((c) => c.isDefault) || contacts[0];
    return {
      fullName: user.user_metadata?.full_name || "",
      whatsappNumber: defaultContact?.phone || "01777785590",
      countryCode: defaultContact?.countryCode || "+880",
      whatsappEnabled: true,
      reminderDaysBefore: 7,
      whatsappContacts: contacts,
    };
  }

  // If supabase has whatsapp_contacts column populated
  if (Array.isArray(data.whatsapp_contacts) && data.whatsapp_contacts.length > 0) {
    contacts = data.whatsapp_contacts;
    saveLocalWhatsAppContacts(contacts);
  } else if (contacts.length === 0) {
    contacts = [
      {
        id: "contact-1",
        alias: "Personal",
        phone: data.whatsapp_number || "01777785590",
        countryCode: data.country_code || "+880",
        isDefault: true,
      },
    ];
    saveLocalWhatsAppContacts(contacts);
  }

  const defaultContact = contacts.find((c) => c.isDefault) || contacts[0];

  return {
    id: data.id,
    fullName: data.full_name,
    whatsappNumber: data.whatsapp_number || defaultContact?.phone || "",
    countryCode: data.country_code || defaultContact?.countryCode || "+880",
    whatsappEnabled: data.whatsapp_enabled,
    reminderDaysBefore: data.reminder_days_before,
    whatsappContacts: contacts,
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

  // Handle contacts
  let contacts = settings.whatsappContacts;
  if (contacts && contacts.length > 0) {
    saveLocalWhatsAppContacts(contacts);
  } else {
    contacts = getLocalWhatsAppContacts();
  }

  const defaultContact = contacts.find((c) => c.isDefault) || contacts[0];
  const primaryPhone = defaultContact?.phone || settings.whatsappNumber || "";
  const primaryCountry = defaultContact?.countryCode || settings.countryCode || "+880";

  if (!user) {
    return {
      fullName: settings.fullName ?? "",
      whatsappNumber: primaryPhone,
      countryCode: primaryCountry,
      whatsappEnabled: settings.whatsappEnabled ?? true,
      reminderDaysBefore: settings.reminderDaysBefore ?? 7,
      whatsappContacts: contacts,
      googleDriveFolderId: settings.googleDriveFolderId,
      callmebotApiKey: settings.callmebotApiKey,
    };
  }

  const rowData: Record<string, unknown> = {
    owner_id: user.id,
    full_name: settings.fullName ?? "",
    whatsapp_number: primaryPhone,
    country_code: primaryCountry,
    whatsapp_enabled: settings.whatsappEnabled ?? true,
    reminder_days_before: settings.reminderDaysBefore ?? 7,
    google_drive_folder_id: settings.googleDriveFolderId ?? "",
    updated_at: new Date().toISOString(),
  };

  if (settings.callmebotApiKey !== undefined) {
    rowData.callmebot_api_key = settings.callmebotApiKey;
  }

  let dataResult: any = null;

  try {
    // Try saving with whatsapp_contacts
    const withContacts = { ...rowData, whatsapp_contacts: contacts };
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(withContacts, { onConflict: "owner_id" })
      .select()
      .single();

    if (error) throw error;
    dataResult = data;
  } catch {
    // Fallback if whatsapp_contacts column does not exist in remote DB yet
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(rowData, { onConflict: "owner_id" })
      .select()
      .single();

    if (error) throw error;
    dataResult = data;
  }

  return {
    id: dataResult.id,
    fullName: dataResult.full_name,
    whatsappNumber: dataResult.whatsapp_number,
    countryCode: dataResult.country_code,
    whatsappEnabled: dataResult.whatsapp_enabled,
    reminderDaysBefore: dataResult.reminder_days_before,
    whatsappContacts: contacts,
    googleDriveFolderId: dataResult.google_drive_folder_id || undefined,
    callmebotApiKey: dataResult.callmebot_api_key || undefined,
  };
}
