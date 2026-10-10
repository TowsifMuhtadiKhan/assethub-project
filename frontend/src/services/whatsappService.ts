/**
 * LifeNest WhatsApp Integration Service (Frontend)
 * Communicates with the backend Baileys WhatsApp Web QR Gateway.
 * Supports auto-sending to ANY recipient phone number.
 */

import { getBackendApiUrl } from "../utils/googleDrive";

export interface WhatsAppSystemStatus {
  configured: boolean;
  provider: string;
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrDataUrl?: string | null;
  connectedPhone?: string | null;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Checks the live status of the WhatsApp Web Gateway and gets QR code if waiting for scan
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
  return {
    configured: false,
    provider: "baileys_qr",
    status: "disconnected",
  };
}

/**
 * Sends a WhatsApp notification to ANY phone number via the connected WhatsApp Gateway
 */
export async function sendSystemWhatsAppAlert({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<SendWhatsAppResponse> {
  const apiUrl = getBackendApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
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
 * Disconnects the current linked WhatsApp device so you can re-scan a new one
 */
export async function disconnectWhatsAppGateway(): Promise<boolean> {
  const apiUrl = getBackendApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/whatsapp/disconnect`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 1-Click direct wa.me URL fallback
 */
export function getDirectWhatsAppUrl(phone: string, text: string): string {
  let cleanNumber = phone.replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("01") && cleanNumber.length === 11) {
    cleanNumber = `88${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
