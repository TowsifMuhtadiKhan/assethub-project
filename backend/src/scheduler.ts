/**
 * LifeNest Autonomous Server-Side Scheduler
 * Runs 24/7 in the backend to query Supabase and dispatch scheduled WhatsApp reminders
 * even when the user's PC is turned off, browser is closed, or phone is offline.
 */

import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";
import { getWhatsAppStatus, sendWhatsAppMessage, normalizePhoneNumber } from "./whatsappService.js";

const supabaseUrl = process.env.SUPABASE_URL || "https://rbrseemfyiqcdezxhssx.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_92TM31rqlGU11iEeaRlfHQ_rDEtYluh";

const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_DIR = process.env.WHATSAPP_AUTH_DIR
  ? path.resolve(process.env.WHATSAPP_AUTH_DIR)
  : process.cwd();
const DISPATCHED_STORE_FILE = path.resolve(STORAGE_DIR, "dispatched_reminders.json");
const MESSAGE_LOGS_FILE = path.resolve(STORAGE_DIR, "whatsapp_message_logs.json");

function loadDispatchedSet(): Set<string> {
  try {
    if (fs.existsSync(DISPATCHED_STORE_FILE)) {
      const raw = fs.readFileSync(DISPATCHED_STORE_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch {}
  return new Set();
}

function saveDispatchedSet(set: Set<string>): void {
  try {
    const list = Array.from(set).slice(-1000); // keep last 1000 markers
    fs.writeFileSync(DISPATCHED_STORE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {}
}

function appendLog(to: string, message: string, itemTitle?: string, error?: string): void {
  try {
    let logs: any[] = [];
    if (fs.existsSync(MESSAGE_LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(MESSAGE_LOGS_FILE, "utf-8"));
      } catch {}
    }
    const entry = {
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      to,
      message,
      itemTitle,
      status: error ? "FAILED" : "DELIVERED",
      error: error || undefined,
    };
    logs.unshift(entry);
    fs.writeFileSync(MESSAGE_LOGS_FILE, JSON.stringify(logs.slice(0, 500), null, 2), "utf-8");
  } catch {}
}

export function parseLeadMinutes(notesOrLead?: string): number {
  if (!notesOrLead) return 0;
  const match = notesOrLead.match(/Reminder:\s*([^,\]\n]+)/i);
  const text = (match ? match[1] : notesOrLead).toLowerCase().trim();

  if (text.includes("exact") || text.includes("0 min") || text.includes("at due time")) return 0;

  const numMatch = text.match(/(\d+)\s*(minute|min|hour|hr|day)/i);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    const unit = numMatch[2].toLowerCase();
    if (unit.startsWith("min")) return val;
    if (unit.startsWith("hour") || unit.startsWith("hr")) return val * 60;
    if (unit.startsWith("day")) return val * 1440;
  }

  if (text.includes("5 min")) return 5;
  if (text.includes("10 min")) return 10;
  if (text.includes("15 min")) return 15;
  if (text.includes("30 min")) return 30;
  if (text.includes("45 min")) return 45;
  if (text.includes("1 hour")) return 60;
  if (text.includes("2 hour")) return 120;
  if (text.includes("1 day")) return 1440;
  if (text.includes("2 day")) return 2880;

  return 0;
}

export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };
  const clean = timeStr.trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const raw = clean.replace(/[^\d:]/g, "");
  const parts = raw.split(":");

  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return { hours, minutes };
}

export function formatRecipientNumber(countryCode: string, inputPhone: string): string {
  if (!inputPhone) return "";
  let digits = inputPhone.replace(/[^0-9]/g, "");
  const countryDigits = (countryCode || "+880").replace(/[^0-9]/g, "");

  if (digits.startsWith(countryDigits)) return digits;
  if (digits.startsWith("01") && digits.length === 11) return `88${digits}`;
  if (digits.startsWith("0")) digits = digits.substring(1);

  return `${countryDigits}${digits}`;
}

export function buildTaskWhatsAppMessage(task: any): string {
  const dueInfo = task.due_date
    ? `${task.due_date}${task.due_time ? ` at ${task.due_time}` : ""}`
    : "today";

  const lines = [
    `🔔 *Likhe Rakho* (লিখে রাখো)`,
    ``,
    `Hi, you have a scheduled task due soon:`,
    `*${task.title}*`,
    ``,
    `Due *${dueInfo}*`,
  ];

  if (task.lifenest_family_members?.full_name) {
    lines.push(`Assigned to *${task.lifenest_family_members.full_name}*`);
  }
  if (task.lifenest_vehicles?.name) {
    lines.push(`Vehicle *${task.lifenest_vehicles.name}*`);
  }
  if (task.lifenest_properties?.name) {
    lines.push(`Property *${task.lifenest_properties.name}*`);
  }
  if (task.description) {
    lines.push(``, task.description);
  }

  lines.push(``, `Please complete it on time. Have a wonderful day!`);
  lines.push(`Manage on Likhe Rakho: https://likherakho.vercel.app`);
  return lines.join("\n");
}

export async function checkAndDispatchDueTasks(): Promise<number> {
  const wa = await getWhatsAppStatus();
  if (wa.status !== "connected") {
    return 0;
  }

  const now = new Date();
  let dispatchedCount = 0;
  const dispatchedSet = loadDispatchedSet();

  try {
    const { data: tasks, error } = await supabase
      .from("lifenest_tasks")
      .select(`
        *,
        lifenest_family_members(full_name),
        lifenest_vehicles(name),
        lifenest_properties(name)
      `)
      .eq("reminder_whatsapp", true)
      .neq("status", "Completed")
      .neq("status", "Cancelled");

    if (error) {
      console.warn("[Server Scheduler] Supabase tasks query error:", error.message);
      return 0;
    }

    if (!tasks || tasks.length === 0) return 0;

    // Cache user settings for phone lookups
    const userSettingsCache: Record<string, any> = {};

    for (const task of tasks) {
      if (!task.due_date) continue;

      const scheduleSignature = `${task.id}_${task.due_date}_${task.due_time || "09:00"}_${task.reminder_date || ""}`;
      if (dispatchedSet.has(scheduleSignature)) continue;

      let triggerTime: Date | null = null;
      if (task.reminder_date) {
        const parsed = new Date(task.reminder_date);
        if (!isNaN(parsed.getTime())) triggerTime = parsed;
      }

      if (!triggerTime) {
        const dateParts = String(task.due_date).split("-").map(Number);
        if (dateParts.length >= 3 && !isNaN(dateParts[0]) && !isNaN(dateParts[1]) && !isNaN(dateParts[2])) {
          const { hours, minutes } = parseTimeString(task.due_time);
          const dueDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, 0);
          const leadMinutes = parseLeadMinutes(task.notes);
          triggerTime = new Date(dueDateTime.getTime() - leadMinutes * 60 * 1000);
        }
      }

      if (!triggerTime || isNaN(triggerTime.getTime())) continue;

      const diffMs = now.getTime() - triggerTime.getTime();
      // Due if triggerTime has arrived and is within last 48 hours
      const isDue = diffMs >= 0 && diffMs <= 48 * 3600 * 1000;

      if (isDue) {
        // Resolve recipient numbers
        const recipients: Array<{ alias: string; phone: string }> = [];

        // Check if task.notes lists recipients
        let targetAliases: string[] = [];
        const match = task.notes?.match(/Recipients:\s*([^\]\n]+)/i);
        if (match) {
          targetAliases = match[1].split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        // Fetch user settings if needed
        let settings = userSettingsCache[task.owner_id];
        if (!settings && task.owner_id) {
          const { data: s } = await supabase
            .from("lifenest_user_settings")
            .select("*")
            .eq("owner_id", task.owner_id)
            .maybeSingle();
          if (s) {
            userSettingsCache[task.owner_id] = s;
            settings = s;
          }
        }

        const contacts: any[] = Array.isArray(settings?.whatsapp_contacts) ? settings.whatsapp_contacts : [];

        if (targetAliases.length > 0) {
          for (const alias of targetAliases) {
            const found = contacts.find((c) => c.alias?.toLowerCase() === alias.toLowerCase());
            if (found && found.phone) {
              recipients.push({
                alias: found.alias,
                phone: formatRecipientNumber(found.countryCode || "+880", found.phone),
              });
            }
          }
        }

        // Fallback to default contact or setting number
        if (recipients.length === 0) {
          const def = contacts.find((c) => c.isDefault) || contacts[0];
          if (def && def.phone) {
            recipients.push({
              alias: def.alias || "Personal",
              phone: formatRecipientNumber(def.countryCode || "+880", def.phone),
            });
          } else if (settings?.whatsapp_number) {
            recipients.push({
              alias: "Personal",
              phone: formatRecipientNumber(settings.country_code || "+880", settings.whatsapp_number),
            });
          } else {
            // Absolute default to primary user
            recipients.push({
              alias: "Personal",
              phone: "8801537295053",
            });
          }
        }

        const message = buildTaskWhatsAppMessage(task);
        let sentAny = false;

        for (const r of recipients) {
          try {
            const res = await sendWhatsAppMessage({ to: r.phone, message });
            if (res.success) {
              sentAny = true;
              appendLog(r.phone, message, task.title);
              console.log(
                `[Server Scheduler] Dispatched WhatsApp reminder for task "${task.title}" to ${r.alias} (${r.phone})`
              );
            } else {
              appendLog(r.phone, message, task.title, res.error);
              console.warn(
                `[Server Scheduler] Failed sending reminder for task "${task.title}" to ${r.phone}:`,
                res.error
              );
            }
          } catch (sendErr) {
            appendLog(r.phone, message, task.title, sendErr instanceof Error ? sendErr.message : "Send failed");
          }
        }

        if (sentAny) {
          dispatchedSet.add(scheduleSignature);
          dispatchedCount++;
        }
      }
    }

    if (dispatchedCount > 0) {
      saveDispatchedSet(dispatchedSet);
    }
  } catch (err) {
    console.error("[Server Scheduler] Error during scheduled check:", err);
  }

  return dispatchedCount;
}

/**
 * Starts the server-side cron scheduler loop
 */
export function startServerScheduler(intervalMs = 60000): () => void {
  console.log(`[Server Scheduler] Starting 24/7 autonomous reminder daemon (interval: ${intervalMs / 1000}s)`);

  let isChecking = false;

  const run = async () => {
    if (isChecking) return;
    isChecking = true;
    try {
      await checkAndDispatchDueTasks();
    } catch (e) {
      console.warn("[Server Scheduler] Run error:", e);
    } finally {
      isChecking = false;
    }
  };

  // Initial run after 10s to let Baileys socket connect on boot
  const initialTimer = setTimeout(run, 10000);
  const intervalId = setInterval(run, intervalMs);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalId);
  };
}
