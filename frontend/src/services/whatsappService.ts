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
 * Normalizes phone numbers with country code without duplicate prefixes
 */
export function formatRecipientNumber(countryCode: string, inputPhone: string): string {
  if (!inputPhone) return "";
  let digits = inputPhone.replace(/[^0-9]/g, "");
  const countryDigits = (countryCode || "+880").replace(/[^0-9]/g, "");

  // If already starts with the country digits (e.g. 8801711353028)
  if (digits.startsWith(countryDigits)) {
    return digits;
  }

  // If Bangladesh local 11 digits (e.g. 01711353028)
  if (digits.startsWith("01") && digits.length === 11) {
    return `88${digits}`;
  }

  // If starts with 0, strip leading 0 before prepending country
  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  return `${countryDigits}${digits}`;
}

async function fetchWithFallback(path: string, options?: RequestInit): Promise<Response> {
  const apiUrl = getBackendApiUrl();
  const urls = [`${apiUrl}${path}`, path];
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (e) {
      lastErr = e;
    }
  }

  // Final attempt with primary url to throw or return response
  return fetch(`${apiUrl}${path}`, options).catch((err) => {
    throw lastErr || err;
  });
}

/**
 * Checks the live status of the WhatsApp Web Gateway and gets QR code if waiting for scan
 */
export async function getWhatsAppSystemStatus(): Promise<WhatsAppSystemStatus> {
  try {
    const res = await fetchWithFallback("/api/whatsapp/status");
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
  try {
    const res = await fetchWithFallback("/api/whatsapp/send", {
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
  try {
    const res = await fetchWithFallback("/api/whatsapp/disconnect", {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Cleanly forces generation of a fresh QR code
 */
export async function restartWhatsAppGateway(): Promise<boolean> {
  try {
    const res = await fetchWithFallback("/api/whatsapp/restart", {
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
export function getDirectWhatsAppUrl(phone: string, text: string, countryCode = "+880"): string {
  const formatted = formatRecipientNumber(countryCode, phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
}
