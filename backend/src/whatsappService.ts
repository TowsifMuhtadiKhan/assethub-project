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

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
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
        connectedPhone = phone ? `+${phone}` : "Connected Device";

        console.log(`[LifeNest WhatsApp] Connected successfully as ${connectedPhone}!`);
      }

      if (connection === "close") {
        isConnected = false;
        sock = null;
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
          ?.output?.statusCode;
        const isSessionInvalid =
          statusCode === DisconnectReason.loggedOut ||
          statusCode === DisconnectReason.connectionReplaced ||
          statusCode === 401 ||
          statusCode === 440;

        console.log(
          `[LifeNest WhatsApp] Connection closed (code ${statusCode}). SessionInvalid: ${isSessionInvalid}`,
        );

        if (isSessionInvalid) {
          // Logged out or session replaced on another client: wipe credentials and restart clean for new QR
          connectionStatus = "disconnected";
          connectedPhone = null;
          qrCodeDataUrl = null;
          cleanAuthDir();
          setTimeout(() => {
            isInitializing = false;
            void initWhatsAppGateway();
          }, 2000);
        } else {
          // Normal network blip: wait 3s before reconnecting
          connectionStatus = "connecting";
          setTimeout(() => {
            isInitializing = false;
            void initWhatsAppGateway();
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
  if (!isConnected || !sock) {
    return {
      success: false,
      error:
        "WhatsApp Gateway is not connected yet. Please scan the QR code in Settings to link your WhatsApp.",
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
