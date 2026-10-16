/**
 * LifeNest WhatsApp Gateway (Baileys Web engine)
 *
 * Design rules (to avoid endless QR rotation / duplicate sockets):
 *  - Only ONE socket exists at a time (tracked by a generation counter; events from old sockets are ignored).
 *  - Linking starts ONLY when the user asks for it (Settings page). Nothing runs in the background otherwise.
 *  - When the QR / pairing window expires, we STOP and wait for the user to click again (no auto loop).
 *  - After a successful scan WhatsApp sends "restart required" (515) – we reconnect with the saved session.
 *  - A saved, linked session is reconnected automatically on server boot so alerts keep working.
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

export type GatewayStatus = "idle" | "connecting" | "qr_ready" | "qr_expired" | "connected";

let sock: WASocket | null = null;
let generation = 0;
let status: GatewayStatus = "idle";
let qrCodeDataUrl: string | null = null;
let connectedPhone: string | null = null;
let lastError: string | null = null;
let reconnectAttempts = 0;
let firstQrResolver: (() => void) | null = null;

const AUTH_DIR = path.resolve(process.cwd(), "whatsapp_auth");
const CREDS_FILE = path.join(AUTH_DIR, "creds.json");

function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function wipeAuthDir(): void {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      for (const f of fs.readdirSync(AUTH_DIR)) {
        try {
          fs.rmSync(path.join(AUTH_DIR, f), { recursive: true, force: true });
        } catch {}
      }
    }
  } catch {}
  ensureAuthDir();
}

/** True if a fully linked session (with an account id) is saved on disk. */
function hasLinkedSession(): boolean {
  try {
    if (!fs.existsSync(CREDS_FILE)) return false;
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    return Boolean(creds?.me?.id);
  } catch {
    return false;
  }
}

/** "01711353028" / "+880 1711-353028" -> "8801711353028" */
export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.substring(2);
  if (digits.startsWith("01") && digits.length === 11) digits = `88${digits}`;
  return digits;
}

export function toWhatsAppJid(phone: string): string {
  return `${normalizePhoneNumber(phone)}@s.whatsapp.net`;
}

function killSocket(): void {
  generation++; // invalidate events from the old socket
  if (sock) {
    try {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      sock.end(undefined);
    } catch {}
  }
  sock = null;
}

/** Creates exactly one socket. Old socket (if any) is killed first. */
async function startSocket(): Promise<void> {
  killSocket();
  const myGen = generation;
  ensureAuthDir();
  status = "connecting";
  qrCodeDataUrl = null;
  lastError = null;

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  if (myGen !== generation) return; // superseded while awaiting

  const s = makeWASocket({
    version,
    auth: state,
    browser: ["LifeNest (জীবননীড়)", "Desktop", "1.0.0"] as [string, string, string],
    logger: pino({ level: "silent" }),
    keepAliveIntervalMs: 15_000,
    connectTimeoutMs: 60_000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });
  sock = s;

  s.ev.on("creds.update", async () => {
    try {
      ensureAuthDir();
      await saveCreds();
    } catch (err) {
      console.warn("[LifeNest WhatsApp] could not save creds:", err);
    }
  });

  s.ev.on("connection.update", async (update) => {
    if (myGen !== generation) return; // stale socket
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
        status = "qr_ready";
        firstQrResolver?.();
        firstQrResolver = null;
      } catch (e) {
        console.error("[LifeNest WhatsApp] QR render failed:", e);
      }
    }

    if (connection === "open") {
      status = "connected";
      qrCodeDataUrl = null;
      reconnectAttempts = 0;
      const id = s.user?.id || "";
      const digits = id.split(":")[0].split("@")[0];
      connectedPhone = digits ? `+${digits}` : null;
      console.log(`[LifeNest WhatsApp] Linked & online as ${connectedPhone}`);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      console.log(`[LifeNest WhatsApp] socket closed (code ${code})`);
      sock = null;
      qrCodeDataUrl = null;

      if (code === DisconnectReason.loggedOut) {
        // Unlinked from phone or pairing rejected -> clean slate, wait for user.
        wipeAuthDir();
        connectedPhone = null;
        status = "idle";
        lastError = "WhatsApp session was logged out. Click 'Link WhatsApp' to link again.";
        return;
      }

      if (code === DisconnectReason.restartRequired) {
        // Normal right after a successful scan: reconnect with the freshly saved session.
        void startSocket();
        return;
      }

      if (hasLinkedSession()) {
        // Linked account, temporary drop: reconnect with backoff.
        reconnectAttempts++;
        const delay = Math.min(30_000, 2_000 * reconnectAttempts);
        status = "connecting";
        setTimeout(() => {
          if (myGen === generation && !sock) void startSocket();
        }, delay);
        return;
      }

      // Not linked and the QR window ran out (408) or another error: STOP. No background loop.
      status = "qr_expired";
      lastError =
        code === DisconnectReason.timedOut
          ? "The QR code expired before it was scanned. Click 'Generate new QR' to try again."
          : `Linking was interrupted (code ${code}). Click 'Generate new QR' to try again.`;
    }
  });
}

/** Called on server boot: reconnect only if an account is already linked. Never shows QR in background. */
export async function initWhatsAppGateway(): Promise<void> {
  if (hasLinkedSession()) {
    console.log("[LifeNest WhatsApp] Saved session found, reconnecting...");
    await startSocket();
  } else {
    status = "idle";
    console.log("[LifeNest WhatsApp] Not linked. Waiting for user to start linking from Settings.");
  }
}

/** User clicked "Link WhatsApp" / "Generate new QR". */
export async function restartWhatsAppGateway(): Promise<{ success: boolean }> {
  if (status === "connected") return { success: true };
  if (!hasLinkedSession()) wipeAuthDir(); // drop half-finished pairing junk
  reconnectAttempts = 0;
  await startSocket();
  return { success: true };
}

export async function getWhatsAppStatus() {
  return {
    configured: status === "connected",
    provider: "baileys_qr",
    status,
    qrDataUrl: qrCodeDataUrl,
    connectedPhone,
    error: lastError,
  };
}

export async function requestWhatsAppPairingCode(
  phone: string,
): Promise<{ success: boolean; code?: string; error?: string }> {
  const number = normalizePhoneNumber(phone);
  if (number.length < 10) return { success: false, error: "Please enter a valid phone number." };
  if (status === "connected") return { success: false, error: "WhatsApp is already linked." };

  try {
    wipeAuthDir();
    const ready = new Promise<void>((resolve, reject) => {
      firstQrResolver = resolve;
      setTimeout(() => reject(new Error("WhatsApp did not respond in time, try again.")), 15_000);
    });
    await startSocket();
    await ready; // socket is registered with WhatsApp and waiting for pairing
    if (!sock) throw new Error("Connection dropped, try again.");
    const code = await sock.requestPairingCode(number);
    qrCodeDataUrl = null; // don't confuse the user with a QR while they type the code
    console.log(`[LifeNest WhatsApp] Pairing code for +${number}: ${code}`);
    return { success: true, code };
  } catch (err) {
    firstQrResolver = null;
    return { success: false, error: err instanceof Error ? err.message : "Failed to get code" };
  }
}

export async function sendWhatsAppMessage({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (status !== "connected" || !sock?.user) {
    return {
      success: false,
      error: "WhatsApp is not linked yet. Link it in Settings first.",
    };
  }
  const digits = normalizePhoneNumber(to);
  if (digits.length < 10) return { success: false, error: `Invalid phone number "${to}".` };

  try {
    const check = await sock.onWhatsApp(digits);
    const found = check?.[0];
    if (found && !found.exists) {
      return { success: false, error: `+${digits} is not registered on WhatsApp.` };
    }
    const jid = found?.jid || toWhatsAppJid(digits);
    const result = await sock.sendMessage(jid, { text: message });
    return { success: true, messageId: result?.key?.id || undefined };
  } catch (err) {
    console.error("[LifeNest WhatsApp] send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export async function disconnectWhatsApp(): Promise<{ success: boolean }> {
  try {
    await sock?.logout();
  } catch {}
  killSocket();
  wipeAuthDir();
  status = "idle";
  connectedPhone = null;
  qrCodeDataUrl = null;
  return { success: true };
}
