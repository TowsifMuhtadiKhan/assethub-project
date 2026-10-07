import { useEffect, useState } from "react";
import { ExternalLink, Save, Send, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import type { UserSettings } from "../types";

export function NotificationsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    fullName: "",
    whatsappNumber: "",
    countryCode: "+880",
    whatsappEnabled: true,
    reminderDaysBefore: 7,
    callmebotApiKey: "",
  });
  const [saved, setSaved] = useState(false);
  const [sendingDirect, setSendingDirect] = useState(false);
  const [apiNotice, setApiNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  useEffect(() => {
    getUserSettings().then((s) => {
      setSettings(s);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const getCleanFullNumber = () => {
    const country = settings.countryCode.replace(/[^0-9]/g, "");
    let rawNumber = settings.whatsappNumber.replace(/[^0-9]/g, "");
    if (rawNumber.startsWith("0")) {
      rawNumber = rawNumber.substring(1);
    }
    return `${country}${rawNumber}`;
  };

  const sampleAlertText = `🔔 *LifeNest Automated Alert Test*

Hello ${settings.fullName || "User"},
This is a test notification from your LifeNest Personal Life OS.

• Document: National ID / Passport renewal check
• Rent: Flat collection reminders active
• Vehicle: BRTA Fitness token tracking active

Your WhatsApp alert integration is active and verified!`;

  // Mode 1: Open directly in WhatsApp Web or Mobile App
  const handleLaunchWhatsApp = () => {
    const fullNumber = getCleanFullNumber();
    if (!fullNumber) {
      setApiNotice({ type: "error", msg: "Please enter your WhatsApp phone number first." });
      return;
    }
    const encoded = encodeURIComponent(sampleAlertText);
    const waUrl = `https://wa.me/${fullNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
    setApiNotice({
      type: "success",
      msg: `WhatsApp launched for +${fullNumber}! Click "Send" in WhatsApp to deliver the message.`,
    });
  };

  // Mode 2: Direct background dispatch via CallMeBot free API
  const handleDirectApiDispatch = async () => {
    const fullNumber = getCleanFullNumber();
    if (!fullNumber) {
      setApiNotice({ type: "error", msg: "Please enter your WhatsApp phone number first." });
      return;
    }
    if (!settings.callmebotApiKey) {
      setApiNotice({
        type: "info",
        msg: "To receive silent messages in WhatsApp without opening the app, get your free 1-click CallMeBot API key below.",
      });
      return;
    }

    setSendingDirect(true);
    setApiNotice(null);

    try {
      const encodedText = encodeURIComponent(sampleAlertText);
      const apiUrl = `https://api.callmebot.com/whatsapp.php?phone=${fullNumber}&text=${encodedText}&apikey=${settings.callmebotApiKey.trim()}`;
      
      // CallMeBot supports HTTP GET
      await fetch(apiUrl, { mode: "no-cors" });
      setApiNotice({
        type: "success",
        msg: `Test alert dispatched directly to +${fullNumber}! Check your WhatsApp inbox.`,
      });
    } catch {
      setApiNotice({
        type: "error",
        msg: "Failed to connect to WhatsApp dispatch gateway. Check your phone number and internet connection.",
      });
    } finally {
      setSendingDirect(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          WhatsApp Reminders & Notifications
        </h1>
        <p className="text-xs text-slate-500">
          Configure automated alerts for expiring documents, pending tasks, vehicle fitness, and rent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Settings Form */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Notification Preferences
            </span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/50">
              WhatsApp Integration
            </span>
          </div>

          <form onSubmit={handleSave} className="mt-3 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-slate-50/60 p-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Enable WhatsApp Alerts
                </div>
                <div className="text-[11px] text-slate-500">
                  Trigger alerts on scheduled reminder dates
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsappEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, whatsappEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700">
                WhatsApp Phone Number *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={settings.countryCode}
                  onChange={(e) =>
                    setSettings({ ...settings, countryCode: e.target.value })
                  }
                  placeholder="+880"
                  className="w-16 rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-center text-xs font-mono outline-none focus:border-slate-400"
                />
                <input
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="01712345678"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs font-mono outline-none focus:border-slate-400"
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Include your local mobile number (e.g., 017xxxxxxxx or 018xxxxxxxx).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">
                  CallMeBot Free API Key (For silent background alerts)
                </label>
                <a
                  href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan-700 hover:underline flex items-center gap-0.5"
                >
                  Get free key in 10s <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <input
                value={settings.callmebotApiKey || ""}
                onChange={(e) =>
                  setSettings({ ...settings, callmebotApiKey: e.target.value })
                }
                placeholder="Enter CallMeBot API key (optional)"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs font-mono outline-none focus:border-slate-400"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Allows LifeNest to deliver notifications directly to your phone without opening WhatsApp Web.
              </p>
            </div>

            <div>
              <FormControl size="small" fullWidth>
                <InputLabel id="reminder-lead-time-label" sx={{ fontSize: "0.8125rem" }}>
                  Reminder Lead Time
                </InputLabel>
                <Select
                  labelId="reminder-lead-time-label"
                  value={settings.reminderDaysBefore}
                  label="Reminder Lead Time"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderDaysBefore: Number(e.target.value),
                    })
                  }
                  sx={{
                    fontSize: "0.8125rem",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    borderRadius: "0.5rem",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <MenuItem value={1} sx={{ fontSize: "0.8125rem" }}>1 day before due date</MenuItem>
                  <MenuItem value={3} sx={{ fontSize: "0.8125rem" }}>3 days before due date</MenuItem>
                  <MenuItem value={7} sx={{ fontSize: "0.8125rem" }}>7 days before due date (Standard)</MenuItem>
                  <MenuItem value={14} sx={{ fontSize: "0.8125rem" }}>14 days before due date</MenuItem>
                  <MenuItem value={30} sx={{ fontSize: "0.8125rem" }}>30 days before due date</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" /> Save Preferences
              </button>

              <button
                type="button"
                onClick={handleLaunchWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                title="Opens WhatsApp Web or App with pre-filled message"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                <span>Open in WhatsApp</span>
              </button>

              {settings.callmebotApiKey && (
                <button
                  type="button"
                  disabled={sendingDirect}
                  onClick={handleDirectApiDispatch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 shadow-2xs disabled:opacity-50"
                  title="Sends message silently in background"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingDirect ? "Dispatching..." : "Send Silent Alert"}</span>
                </button>
              )}
            </div>

            {saved && (
              <div className="rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-800 border border-emerald-200/50 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Preferences saved to your cloud profile.
              </div>
            )}

            {apiNotice && (
              <div
                className={`rounded-md p-2.5 text-[11px] border flex items-start gap-1.5 ${
                  apiNotice.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : apiNotice.type === "error"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-blue-50 text-blue-900 border-blue-200"
                }`}
              >
                {apiNotice.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : apiNotice.type === "error" ? (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span>{apiNotice.msg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Setup guide */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              WhatsApp Alert Setup Options
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="font-semibold text-emerald-900 text-xs flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Option A: Instant Launch (Zero setup)
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Enter your phone number above, then click <strong>"Open in WhatsApp"</strong>. LifeNest instantly launches WhatsApp Web or your desktop app with the alert filled in and addressed to your phone number.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-cyan-700" />
                Option B: Silent Background Delivery (Free CallMeBot API)
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                To receive alerts directly to your phone <strong>silently in the background</strong> without opening any browser tab:
              </p>
              <ol className="mt-1.5 list-decimal list-inside text-[11px] text-slate-600 space-y-1">
                <li>
                  Add the CallMeBot bot phone number to your WhatsApp contacts.
                </li>
                <li>
                  Send this exact message in WhatsApp to the bot: <br />
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-800">
                    I allow callmebot to send me messages
                  </code>
                </li>
                <li>
                  The bot will reply immediately with your personal <strong>API Key</strong>.
                </li>
                <li>
                  Paste that key into the <strong>CallMeBot API Key</strong> field above and click <strong>Save</strong>.
                </li>
              </ol>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-700">Sample Dispatched Alerts:</div>
            <div className="mt-1 font-mono text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">
              🔔 [LifeNest] 🚗 Toyota Premio Fitness expires on Oct 14, 2026. Please renew with BRTA.<br/>
              🔔 [LifeNest] 🏢 Flat 3A rent (৳25,000) is scheduled for collection today.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
