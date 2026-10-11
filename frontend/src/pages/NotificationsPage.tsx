import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Home,
  Car,
  FileText,
  Clock,
  ShieldCheck,
  CheckCheck,
  HelpCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { getUserSettings, saveUserSettings } from "../services/settingsService";
import {
  sendSystemWhatsAppAlert,
  getWhatsAppSystemStatus,
  sendBatchWhatsAppAlerts,
  getDirectWhatsAppUrl,
  formatRecipientNumber,
  type WhatsAppSystemStatus,
  type BatchAlertItem,
} from "../services/whatsappService";
import { listProperties, listPropertyUnits } from "../services/propertyService";
import { listVehicles } from "../services/vehicleService";
import { tenants as mockTenants } from "../data/mockData";
import type { UserSettings, PropertyUnit } from "../types";

interface PendingAlert {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientRole: "Tenant" | "System Owner" | "Vehicle Owner";
  category: "Rent" | "Vehicle BRTA" | "Document";
  itemTitle: string;
  dueDate: string;
  daysRemaining: number;
  messageText: string;
  status: "pending" | "sent" | "failed";
  error?: string;
}

export function NotificationsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    fullName: "",
    whatsappNumber: "",
    countryCode: "+880",
    whatsappEnabled: true,
    reminderDaysBefore: 7,
    callmebotApiKey: "",
  });

  const [gatewayStatus, setGatewayStatus] = useState<WhatsAppSystemStatus>({
    configured: false,
    provider: "baileys_qr",
    status: "idle",
  });

  const [activeTab, setActiveTab] = useState<"composer" | "scanner" | "preferences" | "guideline">("composer");
  const [saved, setSaved] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Composer State
  const [templateType, setTemplateType] = useState<"rent" | "vehicle" | "document" | "custom">("rent");
  const [recipientChoice, setRecipientChoice] = useState<string>("owner");
  const [customPhone, setCustomPhone] = useState<string>("");
  const [customRecipientName, setCustomRecipientName] = useState<string>("");
  const [composedMessage, setComposedMessage] = useState<string>("");
  const [sendingComposer, setSendingComposer] = useState(false);
  const [composerResult, setComposerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Scanner & Auto-Dispatch State
  const [pendingAlerts, setPendingAlerts] = useState<PendingAlert[]>([]);
  const [scanningAlerts, setScanningAlerts] = useState(false);
  const [dispatchingBatch, setDispatchingBatch] = useState(false);
  const [batchSummary, setBatchSummary] = useState<{ total: number; sent: number } | null>(null);

  // Properties & Units
  const [propertyUnits, setPropertyUnits] = useState<PropertyUnit[]>([]);

  // Refresh WhatsApp live gateway status
  const checkStatus = async () => {
    setLoadingStatus(true);
    try {
      const s = await getWhatsAppSystemStatus();
      setGatewayStatus(s);
    } catch {
      // offline
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    getUserSettings().then((s) => setSettings(s));
    checkStatus();
    loadUnitsAndScan();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUnitsAndScan = async () => {
    setScanningAlerts(true);
    try {
      const props = await listProperties().catch(() => []);
      const allUnits: PropertyUnit[] = [];
      for (const p of props) {
        const u = await listPropertyUnits(p.id).catch(() => []);
        allUnits.push(...u);
      }
      setPropertyUnits(allUnits);

      const vehs = await listVehicles().catch(() => []);
      generatePendingAlerts(allUnits, vehs);
    } catch {
      // fallback
    } finally {
      setScanningAlerts(false);
    }
  };

  // Generate automated pending alerts for registered system users
  const generatePendingAlerts = (units: PropertyUnit[], vehs: any[]) => {
    const alerts: PendingAlert[] = [];
    const today = new Date();
    const curMonth = today.toLocaleString("en-US", { month: "long", year: "numeric" });

    // 1. Tenant Rent Dues
    const occupiedUnits = units.filter(
      (u): u is PropertyUnit & { tenantName: string } =>
        typeof u.tenantName === "string" && u.tenantName.trim().length > 0
    );
    if (occupiedUnits.length > 0) {
      occupiedUnits.forEach((u, idx) => {
        const tName = u.tenantName;
        const tenantMatch = mockTenants.find((t) => t.name.toLowerCase() === tName.toLowerCase());
        const phone = tenantMatch?.phone || "01711223344";
        const rentDueAlert: PendingAlert = {
          id: `rent-${u.id || idx}`,
          recipientName: tName,
          recipientPhone: phone,
          recipientRole: "Tenant",
          category: "Rent",
          itemTitle: `${u.unitName || u.unitNumber || "Flat"} Monthly Rent`,
          dueDate: `${curMonth} 10th`,
          daysRemaining: 1,
          messageText: `🔔 *LifeNest Rent Due Notice*\n\nDear ${tName},\nThis is a friendly reminder that the rent for *${u.unitName || "Unit " + u.unitNumber}* (Amount: *৳${Number(u.monthlyRent).toLocaleString()}*) for the month of *${curMonth}* is due.\n\nPlease remit via bKash / Bank transfer and share the transaction slip.\n\nThank you,\n_LifeNest Asset Management_`,
          status: "pending",
        };
        alerts.push(rentDueAlert);
      });
    } else {
      // Default sample tenants if db is fresh
      mockTenants.slice(0, 2).forEach((t, idx) => {
        alerts.push({
          id: `sample-rent-${idx}`,
          recipientName: t.name,
          recipientPhone: t.phone || "01711223344",
          recipientRole: "Tenant",
          category: "Rent",
          itemTitle: `Flat ${idx === 0 ? "4B" : "2A"} Rent (৳25,000)`,
          dueDate: `${curMonth} 10th`,
          daysRemaining: 2,
          messageText: `🔔 *LifeNest Rent Due Notice*\n\nDear ${t.name},\nThis is a friendly reminder that the rent for *Flat ${idx === 0 ? "4B" : "2A"}* (Amount: *৳25,000*) for the month of *${curMonth}* is due.\n\nPlease remit at your earliest convenience.\n\nThank you,\n_LifeNest Asset Management_`,
          status: "pending",
        });
      });
    }

    // 2. Vehicle BRTA Tax Token & Fitness Expiry alerts
    if (vehs.length > 0) {
      vehs.forEach((v) => {
        alerts.push({
          id: `veh-${v.id}`,
          recipientName: settings.fullName || "Vehicle Owner",
          recipientPhone: settings.whatsappNumber || "01711353028",
          recipientRole: "Vehicle Owner",
          category: "Vehicle BRTA",
          itemTitle: `${v.name} BRTA Fitness & Tax Token`,
          dueDate: "Within 14 Days",
          daysRemaining: 14,
          messageText: `🔔 *LifeNest BRTA Vehicle Document Alert*\n\nHello ${settings.fullName || "Owner"},\nThe BRTA Fitness & Tax Token for your vehicle *${v.name} (${v.registrationNumber || "Reg: Pending"})* is approaching expiry.\n\n• Vehicle: ${v.brand || ""} ${v.model || v.name}\n• Action: Renew via BRTA Service Portal\n\n_LifeNest Automated Asset OS_`,
          status: "pending",
        });
      });
    } else {
      // Sample vehicle alert
      alerts.push({
        id: "sample-veh-1",
        recipientName: settings.fullName || "Towsif",
        recipientPhone: settings.whatsappNumber || "01711353028",
        recipientRole: "Vehicle Owner",
        category: "Vehicle BRTA",
        itemTitle: "Toyota Premio Fitness Token",
        dueDate: "October 28, 2026",
        daysRemaining: 17,
        messageText: `🔔 *LifeNest BRTA Vehicle Alert*\n\nHello ${settings.fullName || "User"},\nThe BRTA Fitness Certificate for your vehicle *Toyota Premio (Dhaka Metro Ga-21-4455)* is expiring in 17 days.\n\nPlease complete inspection to avoid fines.\n\n_LifeNest Automated Asset OS_`,
        status: "pending",
      });
    }

    setPendingAlerts(alerts);
  };

  // Update composed message when template or recipient changes
  useEffect(() => {
    const recipientName =
      recipientChoice === "owner"
        ? settings.fullName || "User"
        : recipientChoice.startsWith("tenant-")
          ? recipientChoice.replace("tenant-", "")
          : customRecipientName || "Valued User";

    const curMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    if (templateType === "rent") {
      setComposedMessage(
        `🔔 *LifeNest Rent Due Notice*\n\nDear ${recipientName},\nThis is an automated reminder that the rent for *Apartment Unit* (Amount: *৳25,000*) for the month of *${curMonth}* is now due.\n\nPlease remit via bKash / Bank transfer and confirm payment.\n\nThank you,\n_LifeNest Property Management_`
      );
    } else if (templateType === "vehicle") {
      setComposedMessage(
        `🔔 *LifeNest BRTA Document Reminder*\n\nHello ${recipientName},\nYour vehicle *Toyota Premio (Dhaka Metro Ga-21-4455)* has an upcoming renewal deadline:\n\n• Document: *BRTA Fitness & Tax Token*\n• Due Date: *Within 14 Days*\n\nPlease complete your renewal to avoid BRTA penalties.\n\n_LifeNest Personal Life OS_`
      );
    } else if (templateType === "document") {
      setComposedMessage(
        `🔔 *LifeNest Document Renewal Alert*\n\nHello ${recipientName},\nYour *Driving License / Passport* is scheduled for expiration soon.\n\nPlease review your LifeNest Document Vault and begin the renewal process.\n\n_LifeNest Personal Life OS_`
      );
    } else if (templateType === "custom" && !composedMessage) {
      setComposedMessage(
        `🔔 *LifeNest Important Notice*\n\nHello ${recipientName},\n\n[Write your custom announcement or reminder message here]\n\nBest regards,\n_LifeNest Asset OS_`
      );
    }
  }, [templateType, recipientChoice, customRecipientName, settings.fullName]);

  // Target number for composer
  const activeRecipientPhone = useMemo(() => {
    if (recipientChoice === "owner") {
      return formatRecipientNumber(settings.countryCode || "+880", settings.whatsappNumber || "");
    }
    if (recipientChoice.startsWith("tenant-")) {
      const name = recipientChoice.replace("tenant-", "");
      const found = mockTenants.find((t) => t.name.toLowerCase() === name.toLowerCase());
      return formatRecipientNumber("+880", found?.phone || "01711223344");
    }
    return formatRecipientNumber("+880", customPhone);
  }, [recipientChoice, settings.countryCode, settings.whatsappNumber, customPhone]);

  // Send single composed message via LifeNest WhatsApp Bot
  const handleSendComposedMessage = async () => {
    if (!activeRecipientPhone || activeRecipientPhone.length < 8) {
      alert("Please specify a valid recipient phone number.");
      return;
    }
    if (!composedMessage.trim()) {
      alert("Please write a message to send.");
      return;
    }
    if (!gatewayStatus.configured && gatewayStatus.status !== "connected") {
      setComposerResult({
        success: false,
        message: "LifeNest WhatsApp Bot is not linked yet. Please link it in Settings first, or click 'Open in WhatsApp' below.",
      });
      return;
    }

    setSendingComposer(true);
    setComposerResult(null);
    try {
      const res = await sendSystemWhatsAppAlert({
        to: activeRecipientPhone,
        message: composedMessage,
      });

      if (res.success) {
        setComposerResult({
          success: true,
          message: `Message dispatched successfully to +${activeRecipientPhone} via LifeNest WhatsApp Bot! (ID: ${res.messageId || "delivered"})`,
        });
      } else {
        setComposerResult({
          success: false,
          message: res.error || "Failed to dispatch message.",
        });
      }
    } catch (e) {
      setComposerResult({
        success: false,
        message: e instanceof Error ? e.message : "Error dispatching WhatsApp message",
      });
    } finally {
      setSendingComposer(false);
    }
  };

  // Launch wa.me web link for current composed message
  const handleOpenInWhatsApp = () => {
    if (!activeRecipientPhone) {
      alert("Please enter a recipient phone number first.");
      return;
    }
    const url = getDirectWhatsAppUrl(activeRecipientPhone, composedMessage);
    window.open(url, "_blank");
  };

  // Batch auto-dispatch to all registered recipients
  const handleAutoDispatchAll = async () => {
    if (!gatewayStatus.configured && gatewayStatus.status !== "connected") {
      alert("LifeNest WhatsApp Gateway is not linked yet. Please link your LifeNest sender number in Settings first.");
      return;
    }

    if (pendingAlerts.length === 0) {
      alert("No pending alerts to dispatch.");
      return;
    }

    setDispatchingBatch(true);
    setBatchSummary(null);

    const batchItems: BatchAlertItem[] = pendingAlerts.map((a) => ({
      to: formatRecipientNumber("+880", a.recipientPhone),
      message: a.messageText,
      recipientName: a.recipientName,
      itemTitle: a.itemTitle,
    }));

    try {
      const res = await sendBatchWhatsAppAlerts(batchItems);

      // Update item statuses
      const updated = pendingAlerts.map((a) => {
        const itemResult = res.results.find((r) => r.to === formatRecipientNumber("+880", a.recipientPhone));
        if (itemResult) {
          return {
            ...a,
            status: itemResult.success ? ("sent" as const) : ("failed" as const),
            error: itemResult.error,
          };
        }
        return a;
      });

      setPendingAlerts(updated);
      setBatchSummary({
        total: res.total,
        sent: res.sentCount,
      });
    } catch (err) {
      alert("Batch dispatch encountered an error. Check backend logs.");
    } finally {
      setDispatchingBatch(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await saveUserSettings(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            WhatsApp Notification & Auto-Dispatch Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage LifeNest's dedicated WhatsApp sender, write custom messages, and auto-dispatch alerts to registered users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <SettingsIcon className="h-3.5 w-3.5 text-slate-500" />
            <span>Sender Settings</span>
          </Link>
        </div>
      </div>

      {/* Gateway Live Status Banner */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-xs ${
          gatewayStatus.configured || gatewayStatus.status === "connected"
            ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
            : "border-amber-200 bg-amber-50/70 text-amber-950"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              gatewayStatus.configured || gatewayStatus.status === "connected"
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>LifeNest Dedicated WhatsApp Bot:</span>
              {gatewayStatus.configured || gatewayStatus.status === "connected" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  ONLINE & READY ({gatewayStatus.connectedPhone || "Linked"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  NOT LINKED YET
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 opacity-90">
              {gatewayStatus.configured || gatewayStatus.status === "connected"
                ? `LifeNest dispatches automatic messages from its linked sender (${gatewayStatus.connectedPhone || "Active"}) to all registered tenants and system users.`
                : "Connect LifeNest's dedicated SIM via 8-Digit Pairing Code or QR Code in Settings to enable automated background alerts."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {gatewayStatus.configured || gatewayStatus.status === "connected" ? (
            <button
              type="button"
              onClick={checkStatus}
              disabled={loadingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>
          ) : (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs transition"
            >
              <span>Link LifeNest Number</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("composer")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === "composer"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Write / Send Message</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scanner")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer relative ${
            activeTab === "scanner"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Auto-Dispatch to Registered Users</span>
          {pendingAlerts.length > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {pendingAlerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === "preferences"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          <span>Alert Lead Times & Recipient</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guideline")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === "guideline"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>WhatsApp Architecture Guideline</span>
        </button>
      </div>

      {/* TAB 1: MESSAGE COMPOSER & TEMPLATE STUDIO */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Cols: The Editor */}
          <div className="lg:col-span-2 space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Compose WhatsApp Message
              </span>
              <span className="text-[11px] text-slate-400">
                Dispatches from LifeNest Dedicated Number
              </span>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Message Template
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType("rent")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    templateType === "rent"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <Home className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs">Tenant Rent Due</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType("vehicle")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    templateType === "vehicle"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <Car className="h-4 w-4 text-blue-600" />
                  <span className="text-xs">Vehicle BRTA Token</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType("document")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    templateType === "document"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span className="text-xs">Document Expiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType("custom")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                    templateType === "custom"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-xs">Custom Message</span>
                </button>
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Contact
                </label>
                <select
                  value={recipientChoice}
                  onChange={(e) => setRecipientChoice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="owner">
                    My Personal Number (+{settings.countryCode} {settings.whatsappNumber || "Not configured"})
                  </option>
                  <optgroup label="Registered Tenants">
                    {mockTenants.map((t) => (
                      <option key={t.id} value={`tenant-${t.name}`}>
                        {t.name} (Tenant - {t.phone})
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">Enter Custom WhatsApp Number...</option>
                </select>
              </div>

              {recipientChoice === "custom" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                      placeholder="e.g. Rahim Mia"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Custom Recipient Phone (e.g. 017xxxxxxxx)
                    </label>
                    <input
                      type="tel"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Editable Message Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Message Content (Edit freely below)
                </label>
                <span className="text-[10px] text-slate-400">
                  Supports WhatsApp bold (*bold*) and emojis
                </span>
              </div>
              <textarea
                rows={7}
                value={composedMessage}
                onChange={(e) => setComposedMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 font-mono focus:bg-white focus:border-emerald-500 focus:outline-none shadow-inner leading-relaxed"
                placeholder="Type your WhatsApp notification here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={sendingComposer}
                onClick={handleSendComposedMessage}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingComposer ? "Dispatching via LifeNest..." : "Send via LifeNest Bot"}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                <span>Open in WhatsApp Web / App</span>
              </button>

              <span className="text-[11px] text-slate-400 ml-auto">
                Target: <span className="font-mono text-slate-700 font-bold">+{activeRecipientPhone}</span>
              </span>
            </div>

            {/* Feedback result */}
            {composerResult && (
              <div
                className={`rounded-xl border p-3.5 text-xs flex items-start gap-2.5 animate-in fade-in ${
                  composerResult.success
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {composerResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{composerResult.message}</div>
              </div>
            )}
          </div>

          {/* Right Col: Live WhatsApp Screen Preview */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                    LN
                  </div>
                  <div>
                    <div className="text-xs font-bold">LifeNest Asset Bot</div>
                    <div className="text-[10px] text-emerald-400">Official Sender</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">WhatsApp</span>
              </div>

              {/* Chat Bubble Preview */}
              <div className="my-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-100">
                {composedMessage || "Your formatted message preview will appear here..."}
                <div className="text-right text-[9px] text-emerald-300/60 mt-1 flex items-center justify-end gap-1">
                  <span>Just now</span>
                  <CheckCheck className="h-3 w-3 text-emerald-400" />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                <div className="font-semibold text-slate-200 text-xs">How this delivers:</div>
                <p className="text-[10px] text-slate-300">
                  When you click Send, LifeNest's dedicated background gateway transmits this message directly to WhatsApp servers. The recipient receives it on their phone without opening any browser tabs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTO-DISPATCH TO REGISTERED SYSTEM USERS */}
      {activeTab === "scanner" && (
        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Pending Automated Alerts Queue
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                LifeNest auto-scans expiring documents, BRTA tax tokens, and monthly tenant rents across your database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                ({propertyUnits.length} Units Checked)
              </span>
              <button
                type="button"
                onClick={loadUnitsAndScan}
                disabled={scanningAlerts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scanningAlerts ? "animate-spin" : ""}`} />
                <span>Rescan Assets</span>
              </button>

              <button
                type="button"
                disabled={dispatchingBatch || pendingAlerts.length === 0}
                onClick={handleAutoDispatchAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{dispatchingBatch ? "Dispatching to All..." : `Auto-Dispatch All (${pendingAlerts.length})`}</span>
              </button>
            </div>
          </div>

          {batchSummary && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Batch Dispatch Finished: Successfully delivered <strong>{batchSummary.sent}</strong> of <strong>{batchSummary.total}</strong> notifications!
              </span>
            </div>
          )}

          {/* Queue List */}
          <div className="space-y-3">
            {pendingAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-slate-200/90 p-4 hover:border-slate-300 transition bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alert.category === "Rent"
                          ? "bg-purple-100 text-purple-800"
                          : alert.category === "Vehicle BRTA"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {alert.category}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{alert.itemTitle}</span>
                    <span className="text-xs text-slate-500">
                      &bull; Due: <strong className="text-slate-700">{alert.dueDate}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>
                      Recipient: <strong className="text-slate-800">{alert.recipientName}</strong> ({alert.recipientRole})
                    </span>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-700">Phone: +880 {alert.recipientPhone}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200/60 line-clamp-2 font-mono">
                    {alert.messageText}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === "sent" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Dispatched
                    </span>
                  ) : alert.status === "failed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                      Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      <Clock className="h-3 w-3 text-slate-500" />
                      Ready to Send
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const url = getDirectWhatsAppUrl(alert.recipientPhone, alert.messageText);
                      window.open(url, "_blank");
                    }}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition"
                    title="Open in WhatsApp directly"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PREFERENCES & LEAD TIMES */}
      {activeTab === "preferences" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Delivery Schedule & Recipient
              </span>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">Enable Automated Alerts</div>
                  <div className="text-[11px] text-slate-500">
                    LifeNest will send notifications before due dates.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.whatsappEnabled}
                  onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Personal Recipient WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={settings.countryCode}
                    onChange={(e) => setSettings({ ...settings, countryCode: e.target.value })}
                    className="w-16 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-xs font-mono font-semibold"
                  />
                  <input
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Where you receive alerts about your vehicles, tasks, and document renewals.
                </p>
              </div>

              <div>
                <FormControl size="small" fullWidth>
                  <InputLabel id="lead-time-label" sx={{ fontSize: "0.8125rem" }}>
                    Reminder Lead Time
                  </InputLabel>
                  <Select
                    labelId="lead-time-label"
                    value={settings.reminderDaysBefore}
                    label="Reminder Lead Time"
                    onChange={(e) =>
                      setSettings({ ...settings, reminderDaysBefore: Number(e.target.value) })
                    }
                    sx={{ fontSize: "0.8125rem", borderRadius: "0.5rem", backgroundColor: "#f8fafc" }}
                  >
                    <MenuItem value={1}>1 day before due date</MenuItem>
                    <MenuItem value={3}>3 days before due date</MenuItem>
                    <MenuItem value={7}>7 days before due date (Standard)</MenuItem>
                    <MenuItem value={14}>14 days before due date</MenuItem>
                    <MenuItem value={30}>30 days before due date</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CallMeBot API Key (Optional Backup Channel)
                </label>
                <input
                  value={settings.callmebotApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, callmebotApiKey: e.target.value })}
                  placeholder="Enter CallMeBot API key"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Preferences</span>
                </button>
                {saved && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Saved!
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: ARCHITECTURE GUIDELINE */}
      {activeTab === "guideline" && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              LifeNest WhatsApp Architecture & Management Guideline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Everything you need to know about managing LifeNest's WhatsApp bot and automated alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guide Card 1 */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-700" />
                1. Sender Number vs. Recipient Numbers
              </h4>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                LifeNest operates like an automated corporate assistant:
              </p>
              <ul className="list-disc list-inside text-xs text-emerald-900 space-y-1">
                <li>
                  <strong>LifeNest Sender Number:</strong> Managed in <Link to="/settings" className="underline font-bold">Settings</Link>. This is the phone/SIM that acts as the LifeNest Bot.
                </li>
                <li>
                  <strong>Recipient Numbers:</strong> You (the owner), your tenants (stored in Property Units), and family members. Messages are delivered to them from the LifeNest Bot.
                </li>
              </ul>
            </div>

            {/* Guide Card 2 */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 space-y-2">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-700" />
                2. How Automatic Alerts Work
              </h4>
              <p className="text-xs text-blue-900/90 leading-relaxed">
                When document expiries or rent due dates approach:
              </p>
              <ul className="list-disc list-inside text-xs text-blue-900 space-y-1">
                <li>LifeNest queries the database for records expiring within your lead time (e.g. 7 days).</li>
                <li>It formats a tailored WhatsApp notification with bold text and emojis.</li>
                <li>It dispatches the message via the connected WhatsApp gateway to each recipient's registered phone number.</li>
              </ul>
            </div>
          </div>

          {/* Options Comparison */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Available WhatsApp Deployment Options:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-300 bg-white p-3.5 space-y-1.5 shadow-2xs">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Active in LifeNest
                </span>
                <div className="font-bold text-xs text-slate-900">LifeNest Baileys Gateway</div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Uses a dedicated spare SIM / phone. Pair once via 8-digit code. Zero monthly fees, unlimited messages to any number in Bangladesh.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs">
                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Enterprise / SaaS
                </span>
                <div className="font-bold text-xs text-slate-900">Meta WhatsApp Cloud API</div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Official WhatsApp Business Cloud API. Requires Meta Business Verification and template approval. Paid per conversation.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs">
                <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Managed Cloud
                </span>
                <div className="font-bold text-xs text-slate-900">Green-API / UltraMsg</div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Hosted WhatsApp REST API service. Runs phone instances on cloud servers. Starts at ~$10/month.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
