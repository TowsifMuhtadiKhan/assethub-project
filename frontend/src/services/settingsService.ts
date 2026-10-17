import { supabase } from "../lib/supabase";
import type { UserSettings, WhatsAppContact } from "../types";

const TABLE = "lifenest_user_settings";
export const CONTACTS_STORAGE_KEY = "lifenest_whatsapp_contacts";

export function getLocalWhatsAppContacts(): WhatsAppContact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: WhatsAppContact) => {
          if (
            c.alias?.toLowerCase() === "personal" &&
            (c.phone === "01711353028" || c.phone === "01777785590" || c.phone === "01537290553")
          ) {
            return { ...c, phone: "01537295053" };
          }
          return c;
        });
      }
    }
  } catch {
    // fallback
  }
  return [
    {
      id: "contact_personal_default",
      alias: "Personal",
      phone: "01537295053",
      countryCode: "+880",
      isDefault: true,
    },
  ];
}

export function saveLocalWhatsAppContacts(contacts: WhatsAppContact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // fallback
  }
}

let cachedUserSettings: { data: UserSettings; timestamp: number } | null = null;
let activeSettingsPromise: Promise<UserSettings> | null = null;

export function invalidateUserSettingsCache(): void {
  cachedUserSettings = null;
  activeSettingsPromise = null;
}

export async function getUserSettings(forceRefresh = false): Promise<UserSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedUserSettings && now - cachedUserSettings.timestamp < 30000) {
    return cachedUserSettings.data;
  }
  if (activeSettingsPromise) {
    return activeSettingsPromise;
  }

  activeSettingsPromise = (async () => {
    try {
      const result = await fetchUserSettingsRaw();
      cachedUserSettings = { data: result, timestamp: Date.now() };
      return result;
    } finally {
      activeSettingsPromise = null;
    }
  })();

  return activeSettingsPromise;
}

async function fetchUserSettingsRaw(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contacts = getLocalWhatsAppContacts();

  if (!user) {
    if (contacts.length === 0) {
      contacts = [
        {
          id: "contact_personal_default",
          alias: "Personal",
          phone: "01537295053",
          countryCode: "+880",
          isDefault: true,
        },
      ];
      saveLocalWhatsAppContacts(contacts);
    }

    const personal = contacts.find((c) => c.alias.toLowerCase() === "personal");
    const defaultContact = contacts.find((c) => c.isDefault) || personal || contacts[0];
    return {
      fullName: "",
      whatsappNumber: personal?.phone || defaultContact?.phone || "01537295053",
      countryCode: personal?.countryCode || defaultContact?.countryCode || "+880",
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
          id: "contact_personal_default",
          alias: "Personal",
          phone: "01537295053",
          countryCode: "+880",
          isDefault: true,
        },
      ];
      saveLocalWhatsAppContacts(contacts);
    }
    const personal = contacts.find((c) => c.alias.toLowerCase() === "personal");
    const defaultContact = contacts.find((c) => c.isDefault) || personal || contacts[0];
    return {
      fullName: user.user_metadata?.full_name || "",
      whatsappNumber: personal?.phone || defaultContact?.phone || "01537295053",
      countryCode: personal?.countryCode || defaultContact?.countryCode || "+880",
      whatsappEnabled: true,
      reminderDaysBefore: 7,
      whatsappContacts: contacts,
    };
  }

  // If supabase has whatsapp_contacts column populated with array
  if (Array.isArray(data.whatsapp_contacts) && data.whatsapp_contacts.length > 0) {
    contacts = data.whatsapp_contacts;
  }

  // Ensure Personal contact accurately reflects the user's personal number and is never overwritten
  const dbPhone = data.whatsapp_number?.trim();
  const personalIdx = contacts.findIndex((c) => c.alias.toLowerCase() === "personal");
  if (personalIdx >= 0) {
    if (dbPhone && (!contacts[personalIdx].phone || contacts[personalIdx].phone === "01777785590")) {
      contacts[personalIdx].phone = dbPhone;
    }
    if (data.country_code) {
      contacts[personalIdx].countryCode = data.country_code;
    }
  } else {
    // No personal contact in list yet, insert at beginning
    contacts.unshift({
      id: "contact_personal_default",
      alias: "Personal",
      phone: dbPhone || "01537295053",
      countryCode: data.country_code || "+880",
      isDefault: contacts.length === 0,
    });
  }

  saveLocalWhatsAppContacts(contacts);

  const personal = contacts.find((c) => c.alias.toLowerCase() === "personal");
  const defaultContact = contacts.find((c) => c.isDefault) || personal || contacts[0];

  return {
    id: data.id,
    fullName: data.full_name,
    whatsappNumber: data.whatsapp_number || personal?.phone || defaultContact?.phone || "01537295053",
    countryCode: data.country_code || personal?.countryCode || defaultContact?.countryCode || "+880",
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

  // The user's personal WhatsApp number should ALWAYS stay associated with the "Personal" contact,
  // NOT overwritten by secondary contacts like Wife, Driver, etc.
  const personalContact = contacts.find((c) => c.alias.toLowerCase() === "personal");
  const defaultContact = contacts.find((c) => c.isDefault) || personalContact || contacts[0];
  const personalPhone = personalContact?.phone || settings.whatsappNumber || defaultContact?.phone || "";
  const personalCountry = personalContact?.countryCode || settings.countryCode || defaultContact?.countryCode || "+880";

  if (!user) {
    return {
      fullName: settings.fullName ?? "",
      whatsappNumber: personalPhone,
      countryCode: personalCountry,
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
    whatsapp_number: personalPhone,
    country_code: personalCountry,
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

  invalidateUserSettingsCache();

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
