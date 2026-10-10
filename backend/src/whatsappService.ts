/**
 * LifeNest WhatsApp Gateway (Baileys Web QR Engine)
 * Connects directly to WhatsApp Web via QR code.
 * Sends automated alerts and reminders to ANY unlisted recipient number with zero restrictions.
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";

let sock: WASocket | null = null;
let qrCodeDataUrl: string | null = null;
let isConnected = false;
let connectedPhone: string | null = null;
let connectionStatus: "disconnected" | "connecting" | "qr_ready" | "connected" = "disconnected";
let isInitializing = false;

const AUTH_DIR = path.resolve(process.cwd(), "whatsapp_auth");

function ensureAuthDir(): void {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  } catch {}
}

function cleanAuthDir(): void {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        try {
          fs.rmSync(path.join(AUTH_DIR, file), { recursive: true, force: true });
        } catch {}
      }
    }
  } catch {}
  ensureAuthDir();
}

/**
 * Normalizes phone numbers into WhatsApp JID format:
 * e.g. "01711353028" -> "8801711353028@s.whatsapp.net"
 * e.g. "+880 1711-353028" -> "8801711353028@s.whatsapp.net"
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let digits = input.replace(/[^0-9]/g, "");

  // Bangladesh local 11-digit mobile (starts with 013-019)
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `88${digits}`;
  }

  // Strip leading 00 international prefix
  if (digits.startsWith("00")) {
    digits = digits.substring(2);
  }

  return digits;
}

export function toWhatsAppJid(phone: string): string {
  const clean = normalizePhoneNumber(phone);
  return `${clean}@s.whatsapp.net`;
}

/**
 * Initializes the WhatsApp Web Socket and QR listener
 */
export async function initWhatsAppGateway(): Promise<void> {
  if (isInitializing || (isConnected && sock)) return;
  isInitializing = true;
  connectionStatus = "connecting";

  try {
    ensureAuthDir();

    // Clean up any lingering socket before creating a new one
    if (sock) {
      try {
        sock.ev.removeAllListeners("connection.update");
        sock.ev.removeAllListeners("creds.update");
        sock.end(undefined);
      } catch {}
      sock = null;
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      version,
      auth: state,
      browser: ["Chrome (Linux)", "", ""],
      logger: pino({ level: "silent" }),
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      syncFullHistory: false,
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: "#064e3b", light: "#ffffff" },
          });
          connectionStatus = "qr_ready";
          console.log("[LifeNest WhatsApp] Fresh QR code ready for scanning.");
        } catch (qrErr) {
          console.error("[LifeNest WhatsApp] Failed to render QR:", qrErr);
        }
      }

      if (connection === "open") {
        isConnected = true;
        connectionStatus = "connected";
        qrCodeDataUrl = null;

        const rawUser = sock?.user?.id || "";
        const phone = rawUser.split(":")[0] || rawUser.split("@")[0] || "";
        connectedPhone = phone ? `+${phone}` : "+8801711353028";

        console.log(`[LifeNest WhatsApp] Connected successfully as ${connectedPhone}!`);
      }

      if (connection === "close") {
        isConnected = false;
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
          ?.output?.statusCode;
        
        // ONLY wipe credentials if explicitly logged out from phone (code 401)
        const isLoggedOut =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === 401;

        console.log(
          `[LifeNest WhatsApp] Connection closed (code ${statusCode}). LoggedOut: ${isLoggedOut}`,
        );

        if (isLoggedOut) {
          // Explicit logout from WhatsApp mobile app: wipe auth and request new scan
          connectionStatus = "disconnected";
          connectedPhone = null;
          qrCodeDataUrl = null;
          cleanAuthDir();
          setTimeout(() => {
            isInitializing = false;
            void initWhatsAppGateway();
          }, 2000);
        } else {
          // Replaced connection, timeout, or temporary network blip: RECONNECT WITH EXISTING AUTH (do NOT wipe!)
          connectionStatus = "connecting";
          setTimeout(() => {
            isInitializing = false;
            if (!isConnected) {
              void initWhatsAppGateway();
            }
          }, 3000);
        }
      }
    });

    sock.ev.on("creds.update", async () => {
      try {
        ensureAuthDir();
        await saveCreds();
      } catch (err) {
        console.warn("[LifeNest WhatsApp] creds.update non-fatal save error:", err);
      }
    });
  } catch (err) {
    console.error("[LifeNest WhatsApp] Initialization error:", err);
    connectionStatus = "disconnected";
    sock = null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Returns current gateway status, QR code, and connected account info
 */
export async function getWhatsAppStatus() {
  // If not started yet, trigger background init
  if (!sock && !isInitializing) {
    void initWhatsAppGateway();
  }

  return {
    configured: isConnected,
    provider: "baileys_qr",
    status: connectionStatus,
    qrDataUrl: qrCodeDataUrl,
    connectedPhone,
  };
}

/**
 * Dispatches a WhatsApp notification to ANY phone number in the world.
 */
export async function sendWhatsAppMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!isConnected || !sock || !sock.user) {
    return {
      success: false,
      error:
        "WhatsApp Gateway is finalizing connection. Please wait a moment or scan the QR code to connect.",
    };
  }

  const recipientDigits = normalizePhoneNumber(to);
  if (!recipientDigits || recipientDigits.length < 8) {
    return {
      success: false,
      error: `Invalid phone number "${to}". Please provide a full mobile number.`,
    };
  }

  const jid = toWhatsAppJid(recipientDigits);

  try {
    const result = await sock.sendMessage(jid, { text: message });
    return {
      success: true,
      messageId: result?.key?.id || undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    console.error(`[LifeNest WhatsApp] Failed to send to ${jid}:`, err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Disconnects the linked WhatsApp device and resets for a new scan
 */
export async function disconnectWhatsApp(): Promise<{ success: boolean }> {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch {}

  isConnected = false;
  connectedPhone = null;
  qrCodeDataUrl = null;
  connectionStatus = "disconnected";

  cleanAuthDir();

  setTimeout(() => {
    isInitializing = false;
    void initWhatsAppGateway();
  }, 1000);

  return { success: true };
}

/**
 * Cleanly forces a fresh QR generation by resetting auth files and socket
 */
export async function restartWhatsAppGateway(): Promise<{ success: boolean }> {
  try {
    if (sock) {
      sock.end(undefined);
      sock = null;
    }
  } catch {}

  isConnected = false;
  connectedPhone = null;
  qrCodeDataUrl = null;
  connectionStatus = "connecting";
  isInitializing = false;

  cleanAuthDir();

  void initWhatsAppGateway();
  return { success: true };
}

/**
 * Requests an 8-character pairing code for linking without camera scanning
 */
export async function requestWhatsAppPairingCode(phone: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  try {
    const cleanNumber = normalizePhoneNumber(phone);
    if (!cleanNumber || cleanNumber.length < 8) {
      return { success: false, error: "Please enter a valid phone number" };
    }

    if (!sock) {
      await initWhatsAppGateway();
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    if (sock && !sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanNumber);
      return { success: true, code };
    } else if (sock?.authState?.creds?.registered) {
      return { success: false, error: "Gateway is already linked!" };
    }

    return { success: false, error: "WhatsApp Gateway is initializing, please try again in a few seconds." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate pairing code",
    };
  }
}
