import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Save,
  MessageSquare,
  CheckCircle2,
  Send,
  Smartphone,
  Sliders,
  Bell,
  ExternalLink,
  QrCode,
  RefreshCw,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import { getUserEmail } from "../services/api";
import {
  checkMasterDriveStatus,
  requestMasterAuthorization,
} from "../utils/googleDrive";
import {
  getWhatsAppSystemStatus,
  sendSystemWhatsAppAlert,
  disconnectWhatsAppGateway,
  restartWhatsAppGateway,
  getWhatsAppPairingCode,
  formatRecipientNumber,
  type WhatsAppSystemStatus,
} from "../services/whatsappService";
import type { UserSettings } from "../types";

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

  const [driveStatus, setDriveStatus] = useState<{
    configured: boolean;
    authorized: boolean;
    accountEmail?: string;
    folderId: string;
  }>({ configured: false, authorized: false, folderId: "" });
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);

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

  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [gatewayProvider, setGatewayProvider] = useState("meta_cloud");
  const [apiKey, setApiKey] = useState("wh_sec_live_9421873910");

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

  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkMasterDriveStatus().then(setDriveStatus);
    getUserSettings().then((s) => {
      setSettings(s);
      try {
        const raw = localStorage.getItem("lifenest_alert_triggers");
        if (raw) setAlertTriggers(JSON.parse(raw));
      } catch {}
    });
  }, []);

  // Poll WhatsApp Gateway status every 2.5s until connected
  const refreshWhatsAppStatus = async () => {
    try {
      const s = await getWhatsAppSystemStatus();
      setSystemWhatsApp(s);
    } catch {}
  };

  useEffect(() => {
    refreshWhatsAppStatus();
    const timer = setInterval(refreshWhatsAppStatus, 2500);
    return () => clearInterval(timer);
  }, []);

  const [linkMethod, setLinkMethod] = useState<"pairing_code" | "qr">("qr");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleRequestPairingCode = async () => {
    const fullNumber = formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "01711353028");
    if (!fullNumber || fullNumber.length < 8) {
      alert("Please enter a valid phone number first.");
      return;
    }
    setRequestingCode(true);
    setCodeError(null);
    try {
      const res = await getWhatsAppPairingCode(fullNumber);
      if (res.success && res.code) {
        setPairingCode(res.code);
      } else {
        setCodeError(res.error || "Failed to generate pairing code. Please try again.");
      }
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : "Failed to generate pairing code");
    } finally {
      setRequestingCode(false);
    }
  };

  const [refreshingQr, setRefreshingQr] = useState(false);
  const handleForceRestartQR = async () => {
    setRefreshingQr(true);
    try {
      await restartWhatsAppGateway();
      await new Promise((r) => setTimeout(r, 600));
      await refreshWhatsAppStatus();
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm("Are you sure you want to unlink WhatsApp? You will need to scan a new QR code to reconnect.")) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnectWhatsAppGateway();
      await refreshWhatsAppStatus();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleAuthorizeMaster = async () => {
    setAuthorizing(true);
    setAuthError("");
    setAuthSuccess(false);
    try {
      await requestMasterAuthorization();
      setAuthSuccess(true);
      const updated = await checkMasterDriveStatus();
      setDriveStatus(updated);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authorization failed");
    } finally {
      setAuthorizing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    try {
      localStorage.setItem("lifenest_alert_triggers", JSON.stringify(alertTriggers));
      localStorage.setItem("lifenest_alert_delivery_time", deliveryTime);
      localStorage.setItem("lifenest_alert_gateway", gatewayProvider);
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

            {/* WhatsApp Gateway Status & QR Code Box */}
            {systemWhatsApp.status === "connected" ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-300 text-xs text-emerald-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900 flex items-center gap-2">
                      WhatsApp Web Gateway Linked & Active
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                      Sender Device: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-semibold text-emerald-900">+{systemWhatsApp.connectedPhone || "Connected"}</code>. All alerts dispatch silently in the background to: <strong className="text-emerald-950 font-mono">+{formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "01711353028")}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={handleDisconnectWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-600" />
                  {disconnecting ? "Unlinking..." : "Disconnect / Re-link"}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-emerald-300 bg-white p-4 shadow-sm space-y-4">
                {/* Method Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLinkMethod("pairing_code")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                        linkMethod === "pairing_code"
                          ? "bg-white text-emerald-800 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                      8-Digit Code (No Camera Needed)
                    </button>

                    <button
                      type="button"
                      onClick={() => setLinkMethod("qr")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                        linkMethod === "qr"
                          ? "bg-white text-emerald-800 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      Scan QR Code
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={refreshingQr}
                    onClick={handleForceRestartQR}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-emerald-700 border border-slate-200 px-2 py-1 rounded-md hover:border-emerald-300 disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingQr ? "animate-spin" : ""}`} />
                    {refreshingQr ? "Resetting..." : "Reset / Refresh"}
                  </button>
                </div>

                {systemWhatsApp.error && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{systemWhatsApp.error}</span>
                  </div>
                )}

                {/* TAB 1: 8-DIGIT PAIRING CODE (NO CAMERA NEEDED) */}
                {linkMethod === "pairing_code" ? (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80">
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                          Link with 8-Character Pairing Code
                          <span className="bg-emerald-200/70 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            100% Reliable
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          No camera scanning required! Enter your phone number to receive an instant pairing code:
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={requestingCode}
                        onClick={handleRequestPairingCode}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60 transition cursor-pointer shrink-0"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        {requestingCode
                          ? "Generating Code..."
                          : `Get Pairing Code for +${formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "01711353028")}`}
                      </button>
                    </div>

                    {codeError && (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{codeError}</span>
                      </div>
                    )}

                    {pairingCode && (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl text-white space-y-3 shadow-md">
                        <span className="text-[11px] tracking-widest uppercase text-emerald-400 font-semibold">
                          Your One-Time WhatsApp Pairing Code
                        </span>
                        <div className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-emerald-300 bg-slate-800/80 px-6 py-2.5 rounded-xl border border-emerald-500/40 select-all">
                          {pairingCode.length === 8
                            ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
                            : pairingCode}
                        </div>
                        <p className="text-[11px] text-slate-300 text-center max-w-md">
                          Open WhatsApp on your phone &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong> &rarr; tap <strong>"Link with phone number instead"</strong> &rarr; type this code.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                          Listening for code entry... LifeNest will connect automatically!
                        </div>
                      </div>
                    )}

                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                      <li>Tap <strong>Settings</strong> (iOS) or <strong>Three dots ⋮</strong> (Android) &rarr; tap <strong>Linked Devices</strong></li>
                      <li>Tap <strong>Link a Device</strong></li>
                      <li>At the bottom of the camera screen, tap <strong>"Link with phone number instead"</strong></li>
                      <li>Enter the 8-character code shown above — LifeNest will pair instantly!</li>
                    </ol>
                  </div>
                ) : (
                  /* TAB 2: QR CODE SCAN */
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner shrink-0">
                      {systemWhatsApp.status === "qr_ready" && systemWhatsApp.qrDataUrl ? (
                        <img
                          src={systemWhatsApp.qrDataUrl}
                          alt="WhatsApp Web QR Code"
                          className="w-56 h-56 rounded-lg shadow-xs object-contain bg-white p-1"
                        />
                      ) : systemWhatsApp.status === "connecting" || refreshingQr ? (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                          <span>Connecting to WhatsApp...</span>
                        </div>
                      ) : (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-center text-slate-600 text-xs gap-3 px-3">
                          {systemWhatsApp.status === "qr_expired" && (
                            <span className="text-rose-700 font-semibold">QR expired</span>
                          )}
                          <button
                            type="button"
                            disabled={refreshingQr}
                            onClick={handleForceRestartQR}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                          >
                            <QrCode className="h-4 w-4" />
                            {systemWhatsApp.status === "qr_expired" ? "Generate new QR" : "Show QR code"}
                          </button>
                          <span className="text-[10px] text-slate-500">
                            Have your phone ready first — you'll have about 2 minutes.
                          </span>
                        </div>
                      )}
                      {systemWhatsApp.status === "qr_ready" && (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700 text-center max-w-[14rem]">
                          The pattern changes every ~20s (WhatsApp security). Just scan what you see.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs text-slate-700 flex-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Scan QR Code with Camera
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Point your camera at this QR code to connect LifeNest as the background sender:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-medium text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                        <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                        <li>Tap <strong>Settings</strong> (iOS) or <strong>Three dots ⋮</strong> (Android)</li>
                        <li>Select <strong>Linked Devices</strong> &rarr; tap <strong>Link a Device</strong></li>
                        <li>Point your camera at this QR code to connect</li>
                      </ol>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium pt-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        Waiting for scan... (If camera scanning fails, switch to the 8-Digit Code tab above!)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-mono font-semibold text-slate-700">
                    {settings.countryCode}
                  </span>
                  <input
                    type="text"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    placeholder="01712345678"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bangladesh numbers: 017..., 018..., 019..., 013...
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reminder Lead Time
                </label>
                <select
                  value={settings.reminderDaysBefore}
                  onChange={(e) => setSettings({ ...settings, reminderDaysBefore: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                >
                  <option value={3}>3 days before due date (Urgent)</option>
                  <option value={7}>7 days before due date (Standard)</option>
                  <option value={14}>14 days before due date (Recommended for BRTA)</option>
                  <option value={30}>30 days before due date (Early warning)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  How many days in advance alerts should start triggering.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    CallMeBot Free API Key (Optional)
                  </label>
                  <a
                    href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    Get free key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={settings.callmebotApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, callmebotApiKey: e.target.value })}
                  placeholder="Enter CallMeBot API key for silent delivery"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Allows LifeNest to deliver notifications silently in background.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Daily Digest Dispatch Time
                </label>
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Alerts are dispatched each morning at this time.
                </span>
              </div>
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

          {/* Gateway Provider Details */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Gateway & Webhook Integration
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provider Engine
                </label>
                <select
                  value={gatewayProvider}
                  onChange={(e) => setGatewayProvider(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800"
                >
                  <option value="meta_cloud">Meta WhatsApp Cloud API (Official)</option>
                  <option value="green_api">Green API / Baileys Gateway</option>
                  <option value="twilio">Twilio Programmable WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Setup Guide Options */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-1.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                Option A: Instant Launch (Zero setup)
              </div>
              <p className="text-[11px] text-slate-600">
                Enter your WhatsApp mobile number above, then click <strong>"Open in WhatsApp"</strong>. LifeNest instantly prepares the alert and launches WhatsApp Web or app with the message pre-filled.
              </p>
            </div>

            <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3.5 space-y-1.5">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-sky-700" />
                Option B: Silent Background Delivery
              </div>
              <p className="text-[11px] text-slate-600">
                To receive alerts directly to your phone <em>silently in the background</em> without opening browser tabs, obtain your free 1-click CallMeBot API key and paste it in the field above.
              </p>
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

          {/* Master Cloud Storage Admin Setup */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>Master Google Drive (One-Time Setup)</span>
              </h2>
              {driveStatus.authorized ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active & Automated for All Users
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  One-Time Connection Required
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Authorize once with your master Google account. Once connected, all users and family members automatically upload documents directly into your Google Drive folder (<code>16nFs8ycnwDKQDAiqpcMsapLPnvvHI6Lf</code>) user-wise with zero prompts.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-500 font-mono">
                Target Vault: {driveStatus.folderId || "16nFs8ycnwDKQDAiqpcMsapLPnvvHI6Lf"}
              </div>

              <button
                type="button"
                onClick={handleAuthorizeMaster}
                disabled={authorizing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <span>
                  {authorizing
                    ? "Connecting to Google..."
                    : driveStatus.authorized
                    ? "Re-Authorize Master Drive"
                    : "Authorize Master Google Drive"}
                </span>
              </button>
            </div>

            {authSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Master Google Drive successfully authorized! All users will now upload directly into the drive.
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {authError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
