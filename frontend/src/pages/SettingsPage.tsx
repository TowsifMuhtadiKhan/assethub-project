import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Save,
  MessageSquare,
  CheckCircle2,
  Send,
  Bell,
  AlertCircle,
  Users,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Globe,
} from "lucide-react";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import { getUserEmail } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import {
  getWhatsAppSystemStatus,
  sendSystemWhatsAppAlert,
  formatRecipientNumber,
  type WhatsAppSystemStatus,
} from "../services/whatsappService";
import type { UserSettings } from "../types";
import { WhatsAppContactsManager } from "../components/common/WhatsAppContactsManager";
import { FamilyPage } from "./FamilyPage";
import { AccessControlPage } from "./AccessControlPage";
import {
  getCurrentUserAccess,
  type CurrentUserAccessResult,
} from "../services/familyService";

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const tabParam = searchParams.get("tab");
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(
    null,
  );

  const [settings, setSettings] = useState<UserSettings>({
    fullName: "",
    whatsappNumber: "",
    countryCode: "+880",
    whatsappEnabled: true,
    reminderDaysBefore: 7,
    googleDriveFolderId: "",
    callmebotApiKey: "",
  });

  const [activeTab, setActiveTab] = useState<
    "profile" | "access" | "notifications"
  >(() => {
    if (tabParam === "access" || tabParam === "permissions") return "access";
    if (tabParam === "notifications" || tabParam === "whatsapp")
      return "notifications";
    return "profile";
  });

  const [saved, setSaved] = useState(false);

  // Sync with URL query parameter
  useEffect(() => {
    if (tabParam === "app" || tabParam === "apk" || tabParam === "mobile") {
      navigate("/admin?tab=apk", { replace: true });
    } else if (tabParam === "access" || tabParam === "permissions") {
      setActiveTab("access");
    } else if (tabParam === "notifications" || tabParam === "whatsapp") {
      setActiveTab("notifications");
    } else if (tabParam === "profile" || tabParam === "profiles") {
      setActiveTab("profile");
    }
  }, [tabParam, navigate]);

  const switchTab = (tab: "profile" | "access" | "notifications") => {
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
    getWhatsAppSystemStatus()
      .then((s) => setSystemWhatsApp(s))
      .catch(() => {});
    getCurrentUserAccess()
      .then((a) => setUserAccess(a))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    try {
      localStorage.setItem(
        "lifenest_alert_triggers",
        JSON.stringify(alertTriggers),
      );
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSendTestAlert = async () => {
    const fullNumber = formatRecipientNumber(
      settings.countryCode || "+880",
      settings.whatsappNumber || "",
    );
    if (!fullNumber || fullNumber.length < 8) {
      alert("Please enter a valid recipient WhatsApp number first.");
      return;
    }

    if (!systemWhatsApp.configured && systemWhatsApp.status !== "connected") {
      setTestResponse({
        success: false,
        error:
          "WhatsApp Web Gateway is not linked yet. Scan the QR code below using WhatsApp on your phone first (or click 'Open in WhatsApp' to test dispatch right away).",
      });
      return;
    }

    setSendingTest(true);
    setTestResponse(null);
    try {
      const sampleAlertText = `🌿 *লিখে রাখো (Likhe Rakho)*\n\nমনে রাখার ঝামেলা শেষ, লিখে রাখো।\n\nআসসালামু আলাইকুম ${settings.fullName || "সুধী"}, শুভেচ্ছা নিন।\nলিখে রাখো স্মার্ট পারিবারিক সহকারীর স্বয়ংক্রিয় হোয়াটসঅ্যাপ নোটিফিকেশন সেবা সফলভাবে সংযুক্ত ও সক্রিয় হয়েছে।\n\n*সেবার অবস্থা:* সক্রিয় ও প্রস্তুত\n*স্বয়ংক্রিয় নোটিশ:* জরুরি কাজ, বাড়ি ভাড়া ও গাড়ির বিআরটিএ নথিপত্র\n*যাচাইয়ের সময়:* ${new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" }) || "আজ"}\n\nআপনার সব গুরুত্বপূর্ণ নোটিফিকেশন সময়মতো এই নম্বরে পৌঁছে দেওয়া হবে।\n— *লিখে রাখো*`;

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
        error:
          err instanceof Error
            ? err.message
            : "Failed to connect to backend WhatsApp service",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleLaunchWhatsApp = () => {
    const fullNumber = formatRecipientNumber(
      settings.countryCode || "+880",
      settings.whatsappNumber || "",
    );
    if (!fullNumber || fullNumber.length < 8) {
      alert("Please enter a valid recipient WhatsApp number first.");
      return;
    }
    const sampleAlertText = `🌿 *Aponjon* (Family Assistant)\n\nHi ${settings.fullName || "there"}, this is a test notification from your family assistant.\nYour automated WhatsApp reminder service is connected and ready.\n\nVerified on *${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}*\nImportant task reminders, rent updates, and vehicle document renewals will be delivered to you here.\n\nHave a great day!`;
    const encoded = encodeURIComponent(sampleAlertText);
    const waUrl = `https://wa.me/${fullNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const canManageAccess = userAccess
    ? userAccess.isHead || userAccess.access?.loginRole === "Admin"
    : true;

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure notifications, WhatsApp automated alerts, and preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200/80">
        <div className="flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchTab("profile")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "profile"
                ? "border-rose-600 text-rose-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Profile</span>
          </button>

          {canManageAccess && (
            <button
              type="button"
              onClick={() => switchTab("access")}
              className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
                activeTab === "access"
                  ? "border-orange-600 text-orange-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Access</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => switchTab("notifications")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "notifications"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="h-4 w-4 text-emerald-600" />
            <span>Notification</span>
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
      {/* TAB 1: PROFILE & FAMILY DIRECTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Primary Account Owner Card */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
          >
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Primary Account Owner
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your primary account identity and login profile.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Email
                </label>
                <input
                  disabled
                  value={getUserEmail()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  value={settings.fullName}
                  onChange={(e) =>
                    setSettings({ ...settings, fullName: e.target.value })
                  }
                  placeholder="e.g. Towsif Khan"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </form>

          {/* Language Preference Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Language Preference
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose your primary language for Likhe Rakho navigation and
                    dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex items-center justify-between rounded-xl border p-4 transition text-left cursor-pointer ${
                  language === "en"
                    ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    English (US)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Default system interface & terms
                  </div>
                </div>
                {language === "en" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setLanguage("bn")}
                className={`flex items-center justify-between rounded-xl border p-4 transition text-left cursor-pointer ${
                  language === "bn"
                    ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    বাংলা (Bengali)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    সহজ বাংলা মেনু, টাস্ক ও ড্যাশবোর্ড
                  </div>
                </div>
                {language === "bn" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Secondary: Family Members & Profiles */}
          <FamilyPage embedMode />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCESS CONTROL & PERMISSIONS                                       */}
      {/* ========================================================================= */}
      {activeTab === "access" && canManageAccess && (
        <div className="pt-1">
          <AccessControlPage embedMode />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NOTIFICATIONS & WHATSAPP ALERTS                                    */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
            {/* WhatsApp Header with Master Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      WhatsApp Notifications
                    </h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        settings.whatsappEnabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {settings.whatsappEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated reminders for expiring vehicle papers, upcoming
                    rent, and tasks.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={handleSendTestAlert}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-slate-500" />
                  <span>{sendingTest ? "Sending..." : "Send Test Alert"}</span>
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                  <input
                    type="checkbox"
                    checked={settings.whatsappEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsappEnabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {testResponse && (
              <div
                className={`rounded-xl border p-3 text-xs space-y-1 ${
                  testResponse.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
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
                      Send test alert via direct web link:
                    </span>
                    <button
                      type="button"
                      onClick={handleLaunchWhatsApp}
                      className="px-2 py-0.5 rounded bg-white border border-rose-200 font-semibold text-rose-800 hover:bg-rose-100 transition shrink-0 cursor-pointer"
                    >
                      Open in WhatsApp Web
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recipient Contacts Manager */}
            <WhatsAppContactsManager
              contacts={settings.whatsappContacts || []}
              onChange={(updatedContacts) => {
                const personal = updatedContacts.find(
                  (c) => c.alias.toLowerCase() === "personal",
                );
                setSettings((prev) => ({
                  ...prev,
                  whatsappContacts: updatedContacts,
                  whatsappNumber: personal?.phone || prev.whatsappNumber,
                  countryCode: personal?.countryCode || prev.countryCode,
                }));
              }}
              onAutoSave={(updatedContacts) => {
                const personal = updatedContacts.find(
                  (c) => c.alias.toLowerCase() === "personal",
                );
                const toSave = {
                  ...settings,
                  whatsappContacts: updatedContacts,
                  whatsappNumber: personal?.phone || settings.whatsappNumber,
                  countryCode: personal?.countryCode || settings.countryCode,
                };
                saveUserSettings(toSave).catch(() => {});
              }}
            />

            {/* Configurable Alert Triggers (Clean, No Emojis, No AI-shouting) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Alert Triggers
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select which automated alerts are dispatched to recipients.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {[
                  {
                    key: "brtaExpiry",
                    title: "Tax Token & Fitness Expiry",
                    desc: "30-day, 15-day, and 3-day reminders before vehicle fitness & tax renewal deadlines.",
                    checked: alertTriggers.brtaExpiry,
                    setter: (v: boolean) =>
                      setAlertTriggers({ ...alertTriggers, brtaExpiry: v }),
                  },
                  {
                    key: "vehicleMaintenance",
                    title: "Vehicle Maintenance & Mobil Due",
                    desc: "Periodic engine oil change and scheduled maintenance reminders based on mileage.",
                    checked: alertTriggers.vehicleMaintenance,
                    setter: (v: boolean) =>
                      setAlertTriggers({
                        ...alertTriggers,
                        vehicleMaintenance: v,
                      }),
                  },
                  {
                    key: "rentDue",
                    title: "Rental Payments",
                    desc: "Due date notifications on the 5th and 10th of each month for active rental units.",
                    checked: alertTriggers.rentDue,
                    setter: (v: boolean) =>
                      setAlertTriggers({ ...alertTriggers, rentDue: v }),
                  },
                  {
                    key: "warrantyExpiry",
                    title: "Warranty & Guarantee Expiry",
                    desc: "Advance alerts before battery, tire, parts, and appliance warranties expire.",
                    checked: alertTriggers.warrantyExpiry,
                    setter: (v: boolean) =>
                      setAlertTriggers({ ...alertTriggers, warrantyExpiry: v }),
                  },
                  {
                    key: "issuesDeadline",
                    title: "High Priority Tasks",
                    desc: "Instant dispatch when a task is tagged as High or Urgent priority.",
                    checked: alertTriggers.issuesDeadline,
                    setter: (v: boolean) =>
                      setAlertTriggers({ ...alertTriggers, issuesDeadline: v }),
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-xs font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SuperAdmin Console Footer Notice */}
      <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2.5 text-slate-700 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Mobile App & APK distribution, WhatsApp Gateways, and System Queues
            are managed exclusively in the Core Command Console.
          </span>
        </div>
        <Link
          to="/admin?tab=apk"
          className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
        >
          <span>Admin Command Console</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
