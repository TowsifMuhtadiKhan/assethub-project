import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Save,
  MessageSquare,
  CheckCircle2,
  Send,
  Smartphone,
  Bell,
  ExternalLink,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import { getUserEmail } from "../services/api";
import {
  getWhatsAppSystemStatus,
  sendSystemWhatsAppAlert,
  formatRecipientNumber,
  type WhatsAppSystemStatus,
} from "../services/whatsappService";
import type { UserSettings } from "../types";
import { WhatsAppContactsManager } from "../components/common/WhatsAppContactsManager";

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [settings, setSettings] = useState<UserSettings>({
    fullName: "",
    whatsappNumber: "",
    countryCode: "+880",
    whatsappEnabled: true,
    reminderDaysBefore: 7,
    googleDriveFolderId: "",
    callmebotApiKey: "",
  });

  const [activeTab, setActiveTab] = useState<"whatsapp" | "profile">(() => {
    if (tabParam === "profile") return "profile";
    return "whatsapp";
  });

  const [saved, setSaved] = useState(false);

  // Sync with URL query parameter ?tab=notifications / ?tab=whatsapp
  useEffect(() => {
    if (tabParam === "profile") setActiveTab("profile");
    else if (tabParam === "whatsapp" || tabParam === "notifications") setActiveTab("whatsapp");
  }, [tabParam]);

  const switchTab = (tab: "whatsapp" | "profile") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Extended WhatsApp Trigger Preferences
  const [alertTriggers, setAlertTriggers] = useState({
    brtaExpiry: true,
    vehicleMaintenance: true,
    rentDue: true,
    warrantyExpiry: true,
    issuesDeadline: true,
  });

  const [systemWhatsApp, setSystemWhatsApp] = useState<WhatsAppSystemStatus>({
    configured: false,
    provider: "baileys_qr",
    status: "idle",
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    getUserSettings().then((s) => {
      setSettings(s);
      try {
        const raw = localStorage.getItem("lifenest_alert_triggers");
        if (raw) setAlertTriggers(JSON.parse(raw));
      } catch {}
    });
    getWhatsAppSystemStatus().then((s) => setSystemWhatsApp(s)).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    try {
      localStorage.setItem("lifenest_alert_triggers", JSON.stringify(alertTriggers));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSendTestAlert = async () => {
    const fullNumber = formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "");
    if (!fullNumber || fullNumber.length < 8) {
      alert("Please enter a valid recipient WhatsApp number first.");
      return;
    }

    if (!systemWhatsApp.configured && systemWhatsApp.status !== "connected") {
      setTestResponse({
        success: false,
        error: "WhatsApp Web Gateway is not linked yet. Scan the QR code below using WhatsApp on your phone first (or click 'Open in WhatsApp' to test dispatch right away).",
      });
      return;
    }

    setSendingTest(true);
    setTestResponse(null);
    try {
      const sampleAlertText = `🔔 *LifeNest Automated Alert Test*\n\nHello ${settings.fullName || "User"},\nThis is a test notification from your LifeNest Personal Life OS.\n\n• Document: BRTA Tax Token / Driving License checks active\n• Tasks: High-priority deadlines tracked\n• Rent: Monthly unit collection reminders active\n\nYour WhatsApp alert integration is active and verified!`;

      const result = await sendSystemWhatsAppAlert({
        to: fullNumber,
        message: sampleAlertText,
      });

      if (result.success) {
        setTestResponse({
          success: true,
          message: `Test alert dispatched directly to +${fullNumber}! Delivered via linked WhatsApp Web Gateway. (ID: ${result.messageId || "sent"})`,
        });
      } else {
        setTestResponse({
          success: false,
          error: result.error || "Failed to dispatch WhatsApp message.",
        });
      }
    } catch (err) {
      setTestResponse({
        success: false,
        error: err instanceof Error ? err.message : "Failed to connect to backend WhatsApp service",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleLaunchWhatsApp = () => {
    const fullNumber = formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "");
    if (!fullNumber || fullNumber.length < 8) {
      alert("Please enter a valid recipient WhatsApp number first.");
      return;
    }
    const sampleAlertText = `🔔 *LifeNest Automated Alert Test*\n\nHello ${settings.fullName || "User"},\nThis is a test notification from your LifeNest Personal Life OS.\n\n• Document: BRTA Tax Token / Driving License checks active\n• Tasks: High-priority deadlines tracked\n• Rent: Monthly unit collection reminders active\n\nYour WhatsApp alert integration is active and verified!`;
    const encoded = encodeURIComponent(sampleAlertText);
    const waUrl = `https://wa.me/${fullNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            System & Alerts
          </span>
          <span className="text-xs text-slate-400 font-mono">SETTINGS</span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
          Settings & Notifications
        </h1>
        <p className="text-xs text-slate-500">
          Configure WhatsApp automated alerts, alert triggers, and profile details.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200/80">
        <div className="flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchTab("whatsapp")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "whatsapp"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-emerald-600" />
            <span>Notifications & WhatsApp Alerts</span>
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-mono text-emerald-700 border border-emerald-200/60">
              Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("profile")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "profile"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Profile & Account</span>
          </button>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          Settings and alert triggers saved successfully!
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: WHATSAPP & AUTOMATED ALERTS                                        */}
      {/* ========================================================================= */}
      {activeTab === "whatsapp" && (
        <form onSubmit={handleSave} className="space-y-4">
          {/* WhatsApp Connection Card */}
          <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/50 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    WhatsApp Automated Notifications
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {settings.whatsappEnabled ? "Active & Connected" : "Disabled"}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Receive direct WhatsApp messages for expiring vehicle tax tokens, maintenance due, and rent.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
                  title="Open chat in WhatsApp Web or App"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-700" /> Open in WhatsApp
                </button>
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={handleSendTestAlert}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-slate-600" />
                  {sendingTest ? "Dispatching..." : "Send Test Alert"}
                </button>
              </div>
            </div>

            {testResponse && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 animate-in fade-in ${
                  testResponse.success
                    ? "border-emerald-300 bg-white text-emerald-900 shadow-xs"
                    : "border-rose-200 bg-rose-50/70 text-rose-900"
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {testResponse.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>
                    {testResponse.success
                      ? testResponse.message
                      : `Dispatch Notice: ${testResponse.error}`}
                  </span>
                </div>
                {!testResponse.success && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100 text-[11px]">
                    <span className="text-rose-700">
                      You can also send this test alert immediately via direct WhatsApp Web / App link:
                    </span>
                    <button
                      type="button"
                      onClick={handleLaunchWhatsApp}
                      className="px-2.5 py-1 rounded-md bg-white border border-rose-200 font-semibold text-rose-800 hover:bg-rose-100 transition shrink-0 cursor-pointer"
                    >
                      Open in WhatsApp Web / App
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Enable Toggle Banner */}
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200/60 p-3">
              <div>
                <span className="text-xs font-bold text-emerald-950">Enable WhatsApp Alerts</span>
                <p className="text-[11px] text-emerald-700">Trigger automatic dispatch before due and expiry dates.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsappEnabled}
                onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="pt-1">
              <WhatsAppContactsManager
                contacts={settings.whatsappContacts || []}
                onChange={(updatedContacts) => {
                  const personal = updatedContacts.find((c) => c.alias.toLowerCase() === "personal");
                  setSettings((prev) => ({
                    ...prev,
                    whatsappContacts: updatedContacts,
                    whatsappNumber: personal?.phone || prev.whatsappNumber,
                    countryCode: personal?.countryCode || prev.countryCode,
                  }));
                }}
                onAutoSave={(updatedContacts) => {
                  const personal = updatedContacts.find((c) => c.alias.toLowerCase() === "personal");
                  const toSave = {
                    ...settings,
                    whatsappContacts: updatedContacts,
                    whatsappNumber: personal?.phone || settings.whatsappNumber,
                    countryCode: personal?.countryCode || settings.countryCode,
                  };
                  saveUserSettings(toSave).catch(() => {});
                }}
              />
            </div>
          </div>

          {/* Configurable Alert Triggers */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              Configure Active Notification Triggers
            </h3>
            <p className="text-[11px] text-slate-500">
              Select which events trigger automated WhatsApp messages:
            </p>

            <div className="divide-y divide-slate-100 text-xs">
              <label className="flex items-center justify-between py-2.5 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">
                    🚗 BRTA Tax Token & Fitness Expiry Alerts
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sends reminder 30 days, 15 days, and 3 days before expiry to avoid penalties.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alertTriggers.brtaExpiry}
                  onChange={(e) =>
                    setAlertTriggers({ ...alertTriggers, brtaExpiry: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between py-2.5 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">
                    🔧 Mobil / Maintenance Due Reminders
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Notifies when odometer reading approaches periodic oil change or scheduled date.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alertTriggers.vehicleMaintenance}
                  onChange={(e) =>
                    setAlertTriggers({ ...alertTriggers, vehicleMaintenance: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between py-2.5 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">
                    🏠 Rental Payment & Tenant Due Alerts
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Alerts on the 5th and 10th of each month for unpaid rental units.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alertTriggers.rentDue}
                  onChange={(e) =>
                    setAlertTriggers({ ...alertTriggers, rentDue: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between py-2.5 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">
                    🛡️ Component Warranty & Claim Deadlines
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Alerts prior to battery, tire, or spare parts warranty expiration.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alertTriggers.warrantyExpiry}
                  onChange={(e) =>
                    setAlertTriggers({ ...alertTriggers, warrantyExpiry: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between py-2.5 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">
                    📋 High Priority Tasks & Deadlines
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Instant alerts for tasks tagged as High or Urgent priority.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alertTriggers.issuesDeadline}
                  onChange={(e) =>
                    setAlertTriggers({ ...alertTriggers, issuesDeadline: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>


          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Save Preferences
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILE & ACCOUNT                                                  */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <form onSubmit={handleSave} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Primary Profile
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
                <input
                  disabled
                  value={getUserEmail()}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  value={settings.fullName}
                  onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                  placeholder="Towsif Khan"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
