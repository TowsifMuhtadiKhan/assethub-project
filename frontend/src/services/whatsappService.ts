/**
 * LifeNest WhatsApp Integration Service (Frontend)
 * Dispatches automated alerts and reminders using the system-level Meta WhatsApp Cloud API
 */

import { getBackendApiUrl } from "../utils/googleDrive";

export interface WhatsAppSystemStatus {
  configured: boolean;
  provider: string;
  phoneNumberId?: string;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
}

/**
 * Checks if the system-level WhatsApp Gateway is configured and active
 */
export async function getWhatsAppSystemStatus(): Promise<WhatsAppSystemStatus> {
  try {
    const apiUrl = getBackendApiUrl();
    const res = await fetch(`${apiUrl}/api/whatsapp/status`);
    if (res.ok) {
      return (await res.json()) as WhatsAppSystemStatus;
    }
  } catch (err) {
    console.warn("Failed to check WhatsApp status from backend:", err);
  }
  return { configured: false, provider: "none" };
}

/**
 * Sends a WhatsApp alert directly to the recipient number via system backend
 */
export async function sendSystemWhatsAppAlert({
  to,
  message,
  templateName,
  templateLanguage,
}: {
  to: string;
  message: string;
  templateName?: string;
  templateLanguage?: string;
}): Promise<SendWhatsAppResponse> {
  const apiUrl = getBackendApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, templateName, templateLanguage }),
    });

    const data = (await res.json()) as SendWhatsAppResponse;
    return data;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to backend WhatsApp service",
    };
  }
}

/**
 * Formats a clean wa.me direct WhatsApp link as an instant zero-config fallback
 */
export function getDirectWhatsAppUrl(phone: string, text: string): string {
  let cleanNumber = phone.replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("01") && cleanNumber.length === 11) {
    cleanNumber = `88${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
