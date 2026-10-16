import { listTasks } from "./taskService";
import { getLocalWhatsAppContacts, getUserSettings } from "./settingsService";
import { sendSystemWhatsAppAlert, formatRecipientNumber } from "./whatsappService";
import type { TaskItem, VehicleDocument, Vehicle } from "../types";

/**
 * Parses reminder lead in minutes from task or document notes or string
 * e.g. "15 days before" -> 21600, "15 minutes before" -> 15, "1 hour before" -> 60, "At exact due time" -> 0
 */
export function parseLeadMinutes(notesOrLead?: string): number {
  if (!notesOrLead) return 0;
  const match = notesOrLead.match(/Reminder:\s*([^,\]\n]+)/i);
  const text = (match ? match[1] : notesOrLead).toLowerCase().trim();

  if (text.includes("exact") || text.includes("0 min") || text.includes("on expiry date") || text.includes("at due time")) return 0;

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
  if (text.includes("3 day")) return 4320;
  if (text.includes("7 day")) return 10080;
  if (text.includes("15 day")) return 21600;
  if (text.includes("30 day")) return 43200;

  return 0;
}

/**
 * Parses time string (e.g. "13:26", "1:26 PM", "01:26") into { hours: number, minutes: number }
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 }; // default 9:00 AM

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

/**
 * Resolves recipient phone numbers from notes or defaults
 */
export function resolveRecipientsFromNotes(
  notes?: string,
  defaultPhone?: string,
  defaultCountry?: string,
): Array<{ alias: string; phone: string }> {
  const contacts = getLocalWhatsAppContacts();
  const recipients: Array<{ alias: string; phone: string }> = [];

  const match = notes?.match(/Recipients:\s*([^\]\n]+)/i);
  let targetAliases: string[] = [];
  if (match) {
    targetAliases = match[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (targetAliases.length > 0) {
    for (const alias of targetAliases) {
      const found = contacts.find((c) => c.alias.toLowerCase() === alias.toLowerCase());
      if (found) {
        recipients.push({
          alias: found.alias,
          phone: formatRecipientNumber(found.countryCode, found.phone),
        });
      }
    }
  }

  // If no recipient matched from aliases, fallback to default contact or setting
  if (recipients.length === 0) {
    const def = contacts.find((c) => c.isDefault) || contacts[0];
    if (def) {
      recipients.push({
        alias: def.alias,
        phone: formatRecipientNumber(def.countryCode, def.phone),
      });
    } else if (defaultPhone) {
      recipients.push({
        alias: "Personal",
        phone: formatRecipientNumber(defaultCountry || "+880", defaultPhone),
      });
    }
  }

  return recipients;
}

export function resolveTaskRecipientNumbers(
  task: TaskItem,
  defaultPhone?: string,
  defaultCountry?: string,
): Array<{ alias: string; phone: string }> {
  return resolveRecipientsFromNotes(task.notes, defaultPhone, defaultCountry);
}

/**
 * Generates formatted WhatsApp notification message text for a task
 */
export function buildTaskWhatsAppMessage(task: TaskItem): string {
  const dueInfo = task.dueDate
    ? `${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ""}`
    : "today";

  const lines = [
    `🔔 *Aponjon*`,
    ``,
    `Hi, you have a task due soon:`,
    `*${task.title}*`,
    ``,
    `Due *${dueInfo}*`,
  ];

  if (task.familyMemberName) {
    lines.push(`Assigned to *${task.familyMemberName}*`);
  }
  if (task.vehicleName) {
    lines.push(`Vehicle *${task.vehicleName}*`);
  }
  if (task.propertyName) {
    lines.push(`Property *${task.propertyName}*`);
  }
  if (task.description) {
    lines.push(``, task.description);
  }

  lines.push(``, `Please take care of it when you can. Have a wonderful day!`);
  return lines.join("\n");
}

/**
 * Manually dispatches a WhatsApp alert for a specific task right now
 */
export async function dispatchTaskReminderNow(
  task: TaskItem,
): Promise<{ success: boolean; dispatchedTo: string[]; error?: string }> {
  try {
    const settings = await getUserSettings().catch(() => null);
    const recipients = resolveTaskRecipientNumbers(
      task,
      settings?.whatsappNumber,
      settings?.countryCode,
    );

    if (recipients.length === 0) {
      return {
        success: false,
        dispatchedTo: [],
        error: "No valid recipient WhatsApp number registered.",
      };
    }

    const message = buildTaskWhatsAppMessage(task);
    const dispatchedTo: string[] = [];

    for (const r of recipients) {
      const res = await sendSystemWhatsAppAlert({
        to: r.phone,
        message,
      });
      if (res.success) {
        dispatchedTo.push(`${r.alias} (${r.phone})`);
      }
    }

    if (dispatchedTo.length > 0) {
      localStorage.setItem(`lifenest_task_dispatched_${task.id}`, new Date().toISOString());
      return { success: true, dispatchedTo };
    }

    return {
      success: false,
      dispatchedTo: [],
      error: "WhatsApp gateway could not deliver alert.",
    };
  } catch (err) {
    return {
      success: false,
      dispatchedTo: [],
      error: err instanceof Error ? err.message : "Dispatch failed",
    };
  }
}

/**
 * Builds formatted WhatsApp message for a vehicle document (e.g. BRTA Tax Token, Fitness)
 */
export function buildVehicleDocWhatsAppMessage(doc: VehicleDocument, vehicle?: Vehicle): string {
  const remainingDays = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const dueInfo = doc.expiryDate
    ? `${doc.expiryDate}${
        remainingDays !== null
          ? ` (${remainingDays < 0 ? `${Math.abs(remainingDays)} days overdue` : remainingDays === 0 ? "today" : `in ${remainingDays} days`})`
          : ""
      }`
    : "soon";

  const lines = [
    `🚗 *Aponjon*`,
    ``,
    `Hi, this is a reminder that your vehicle paper is expiring:`,
    `*${doc.name}*`,
    ``,
    `Expires *${dueInfo}*`,
  ];

  if (vehicle) {
    lines.push(`Vehicle *${vehicle.name} (${vehicle.registrationNumber || "Unregistered"})*`);
  }
  if (doc.documentNumber) {
    lines.push(`Doc No. *${doc.documentNumber}*`);
  }
  if (doc.notes) {
    const cleanNotes = doc.notes.replace(/\s*\[Reminder:[^\]]+\]/gi, "").trim();
    if (cleanNotes) {
      lines.push(``, cleanNotes);
    }
  }

  lines.push(``, `Please complete the renewal on time to avoid BRTA penalties.`);
  return lines.join("\n");
}

/**
 * Manually dispatches a WhatsApp alert for a specific vehicle document right now
 */
export async function dispatchVehicleDocReminderNow(
  doc: VehicleDocument,
  vehicle?: Vehicle,
): Promise<{ success: boolean; dispatchedTo: string[]; error?: string }> {
  try {
    const settings = await getUserSettings().catch(() => null);
    const recipients = resolveRecipientsFromNotes(
      doc.notes,
      settings?.whatsappNumber,
      settings?.countryCode,
    );

    if (recipients.length === 0) {
      return {
        success: false,
        dispatchedTo: [],
        error: "No valid recipient WhatsApp number registered.",
      };
    }

    const message = buildVehicleDocWhatsAppMessage(doc, vehicle);
    const dispatchedTo: string[] = [];

    for (const r of recipients) {
      const res = await sendSystemWhatsAppAlert({
        to: r.phone,
        message,
      });
      if (res.success) {
        dispatchedTo.push(`${r.alias} (${r.phone})`);
      }
    }

    if (dispatchedTo.length > 0) {
      localStorage.setItem(`lifenest_vehdoc_dispatched_${doc.id}`, new Date().toISOString());
      return { success: true, dispatchedTo };
    }

    return {
      success: false,
      dispatchedTo: [],
      error: "WhatsApp gateway could not deliver alert.",
    };
  } catch (err) {
    return {
      success: false,
      dispatchedTo: [],
      error: err instanceof Error ? err.message : "Dispatch failed",
    };
  }
}

/**
 * Core scanner: checks active tasks and vehicle documents and dispatches due WhatsApp alerts
 */
export async function checkAndDispatchDueReminders(): Promise<number> {
  try {
    const settings = await getUserSettings().catch(() => null);
    if (settings && !settings.whatsappEnabled) return 0;

    const now = new Date();
    let sentCount = 0;

    // 1. Scan Tasks
    const tasks = await listTasks().catch(() => []);
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        if (!task.reminderWhatsapp || task.status === "Completed") continue;
        if (!task.dueDate) continue;

        const dispatchKey = `lifenest_task_dispatched_${task.id}`;
        if (localStorage.getItem(dispatchKey)) continue;

        const dateParts = task.dueDate.split("-");
        if (dateParts.length < 3) continue;
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);

        const { hours, minutes } = parseTimeString(task.dueTime);
        const dueDateTime = new Date(year, month, day, hours, minutes, 0);

        const leadMinutes = parseLeadMinutes(task.notes);
        const triggerTime = new Date(dueDateTime.getTime() - leadMinutes * 60 * 1000);

        const diffMs = now.getTime() - triggerTime.getTime();
        const isDue = diffMs >= 0 && diffMs <= 48 * 3600 * 1000;

        if (isDue) {
          const recipients = resolveTaskRecipientNumbers(
            task,
            settings?.whatsappNumber,
            settings?.countryCode,
          );

          if (recipients.length > 0) {
            const message = buildTaskWhatsAppMessage(task);
            let sentAny = false;

            for (const r of recipients) {
              const res = await sendSystemWhatsAppAlert({
                to: r.phone,
                message,
              });
              if (res.success) sentAny = true;
            }

            if (sentAny) {
              localStorage.setItem(dispatchKey, new Date().toISOString());
              sentCount++;
              console.log(
                `[LifeNest ReminderDaemon] Dispatched WhatsApp reminder for task "${task.title}" to ${recipients.map((r) => r.alias).join(", ")}`,
              );
            }
          }
        }
      }
    }

    // 2. Scan Vehicle Documents
    try {
      const docKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("lifenest_veh_docs_")) {
          docKeys.push(key);
        }
      }

      for (const docKey of docKeys) {
        const raw = localStorage.getItem(docKey);
        if (!raw) continue;
        const docs: VehicleDocument[] = JSON.parse(raw);
        if (!Array.isArray(docs)) continue;

        for (const doc of docs) {
          if (!doc.expiryDate) continue;

          // Check if document has reminder configured in notes
          const hasReminder = Boolean(doc.notes && /\[Reminder:[^\]]+\]/i.test(doc.notes));
          if (!hasReminder) continue;

          const dispatchKey = `lifenest_vehdoc_dispatched_${doc.id}`;
          if (localStorage.getItem(dispatchKey)) continue;

          const dateParts = doc.expiryDate.split("-");
          if (dateParts.length < 3) continue;
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const day = parseInt(dateParts[2], 10);

          // Extract Due Time from notes if specified (e.g. Due Time: 09:00 AM)
          const timeMatch = doc.notes?.match(/Due Time:\s*([^,\]\n]+)/i);
          const { hours, minutes } = parseTimeString(timeMatch ? timeMatch[1] : "09:00");
          const expiryDateTime = new Date(year, month, day, hours, minutes, 0);

          const leadMinutes = parseLeadMinutes(doc.notes);
          const triggerTime = new Date(expiryDateTime.getTime() - leadMinutes * 60 * 1000);

          const diffMs = now.getTime() - triggerTime.getTime();
          const isDue = diffMs >= 0 && diffMs <= 48 * 3600 * 1000;

          if (isDue) {
            const recipients = resolveRecipientsFromNotes(
              doc.notes,
              settings?.whatsappNumber,
              settings?.countryCode,
            );

            if (recipients.length > 0) {
              const message = buildVehicleDocWhatsAppMessage(doc);
              let sentAny = false;

              for (const r of recipients) {
                const res = await sendSystemWhatsAppAlert({
                  to: r.phone,
                  message,
                });
                if (res.success) sentAny = true;
              }

              if (sentAny) {
                localStorage.setItem(dispatchKey, new Date().toISOString());
                sentCount++;
                console.log(
                  `[LifeNest ReminderDaemon] Dispatched WhatsApp reminder for vehicle document "${doc.name}" to ${recipients.map((r) => r.alias).join(", ")}`,
                );
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[LifeNest ReminderDaemon] Vehicle doc scan error:", e);
    }

    return sentCount;
  } catch (err) {
    console.warn("[LifeNest ReminderDaemon] Scan error:", err);
    return 0;
  }
}

/**
 * Starts the global reminder daemon interval
 * Checks every 20 seconds
 */
export function startReminderDaemon(intervalMs = 20000): () => void {
  // Run initial check immediately
  checkAndDispatchDueReminders().catch(() => {});

  const intervalId = setInterval(() => {
    checkAndDispatchDueReminders().catch(() => {});
  }, intervalMs);

  return () => clearInterval(intervalId);
}
