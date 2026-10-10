/**
 * Meta WhatsApp Cloud API Service (System-Level)
 * Enables LifeNest to dispatch automated alerts, reminders, and notifications
 * to user WhatsApp numbers without regular users needing developer accounts.
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";

export function getWhatsAppStatus() {
  const configured = Boolean(
    (process.env.WHATSAPP_PHONE_NUMBER_ID || WHATSAPP_PHONE_NUMBER_ID) &&
    (process.env.WHATSAPP_ACCESS_TOKEN || WHATSAPP_ACCESS_TOKEN)
  );

  return {
    configured,
    provider: "meta",
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || WHATSAPP_PHONE_NUMBER_ID) || null,
  };
}

/**
 * Normalizes phone numbers into international digits-only format required by Meta:
 * e.g., "+880 1712-345678" -> "8801712345678"
 * e.g., "01712345678" (BD local) -> "8801712345678"
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let digits = input.replace(/[^0-9]/g, "");

  // Bangladesh local 11-digit mobile (starts with 013-019)
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `88${digits}`;
  }

  // Strip accidental double international prefix like 00880 -> 880
  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  return digits;
}

export interface SendWhatsAppParams {
  to: string;
  message: string;
  templateName?: string;
  templateLanguage?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
}

/**
 * Dispatches a WhatsApp notification via Meta WhatsApp Cloud API.
 * Handles both free-form text messages and pre-approved template messages.
 */
export async function sendWhatsAppMessage({
  to,
  message,
  templateName,
  templateLanguage = "en_US",
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      error: "WhatsApp system credentials not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in backend/.env.",
    };
  }

  const recipient = normalizePhoneNumber(to);
  if (!recipient || recipient.length < 8) {
    return {
      success: false,
      error: `Invalid recipient phone number: "${to}". Please provide a full mobile number with country code.`,
    };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  // Payload: Either pre-approved Template or Free-form text message
  let payload: Record<string, unknown>;

  if (templateName) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
      },
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        error_data?: { details: string };
      };
    };

    if (response.ok && data.messages && data.messages.length > 0) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    // Handle Meta API errors
    const errorMsg = data.error?.message || `Meta WhatsApp API error (HTTP ${response.status})`;
    console.warn("Meta WhatsApp API error response:", data);

    // If text message failed because 24h window passed and template is required, fallback to sandbox template hello_world
    if (!templateName && (data.error?.code === 131047 || data.error?.code === 131026)) {
      console.log("Attempting fallback to sandbox template 'hello_world'...");
      return await sendWhatsAppMessage({
        to,
        message,
        templateName: "hello_world",
        templateLanguage: "en_US",
      });
    }

    return {
      success: false,
      error: errorMsg,
      details: data.error,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to connect to Meta WhatsApp API";
    console.error("WhatsApp dispatch network error:", err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
