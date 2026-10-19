import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  HardDrive,
  MessageSquare,
  RefreshCw,
  LogOut,
  Send,
  ExternalLink,
  QrCode,
  Trash2,
  Layers,
  ArrowRight,
  Save,
  Download,
  Crown,
  Server,
  Globe,
  Activity,
} from "lucide-react";
import { AdminSubscriptionTab } from "../components/admin/AdminSubscriptionTab";
import {
  adminLogin,
  getAdminStats,
  getAdminMessages,
  clearAdminMessages,
  getAdminToken,
  getStoredAdminUser,
  clearAdminSession,
  type DispatchedMessageLog,
} from "../services/adminService";
import {
  getWhatsAppSystemStatus,
  getWhatsAppPairingCode,
  restartWhatsAppGateway,
  disconnectWhatsAppGateway,
  sendSystemWhatsAppAlert,
  formatRecipientNumber,
  type WhatsAppSystemStatus,
} from "../services/whatsappService";
import {
  checkMasterDriveStatus,
  requestMasterAuthorization,
  getGoogleDriveDirectDownloadUrl,
  getBackendApiUrl,
  setBackendApiUrl,
} from "../utils/googleDrive";
import {
  getApkConfig,
  saveApkConfig,
  CURRENT_APP_BUILD,
} from "../services/appUpdateService";
import { listProperties, listPropertyUnits } from "../services/propertyService";
import { listVehicles } from "../services/vehicleService";
import { tenants as mockTenants } from "../data/mockData";
import type { PropertyUnit, Vehicle } from "../types";

interface DriveStatusState {
  configured: boolean;
  authorized: boolean;
  accountEmail?: string | null;
  folderId?: string;
}

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getAdminToken()));
  const [adminUser, setAdminUser] = useState(() => getStoredAdminUser());

  // Login Form State
  const [loginId, setLoginId] = useState("Towsif");
  const [loginPass, setLoginPass] = useState("Admin");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<"whatsapp" | "drive" | "messages" | "queue" | "apk" | "subscriptions">(() => {
    if (tabParam === "subscriptions" || tabParam === "users" || tabParam === "plans") return "subscriptions";
    if (tabParam === "apk" || tabParam === "app" || tabParam === "mobile") return "apk";
    if (tabParam === "whatsapp") return "whatsapp";
    if (tabParam === "drive") return "drive";
    if (tabParam === "queue") return "queue";
    return "messages";
  });

  const switchTab = (tab: "whatsapp" | "drive" | "messages" | "queue" | "apk" | "subscriptions") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Mobile App & APK Distribution State
  const [apkConfig] = useState(() => getApkConfig());
  const [apkDriveUrl, setApkDriveUrl] = useState(apkConfig.driveUrl);
  const [apkVersion, setApkVersion] = useState(apkConfig.latestVersion);
  const [apkReleaseNotes, setApkReleaseNotes] = useState(apkConfig.releaseNotes);
  const [apkUrlSaved, setApkUrlSaved] = useState(false);
  const [apkMetadata, setApkMetadata] = useState<{
    version?: string;
    fileId?: string;
    fileSizeMb?: string;
    updatedAt?: string;
    viewUrl?: string;
    downloadUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/apk-version.json")
      .then((res) => res.json())
      .then((data) => {
        setApkMetadata(data);
        if (data.viewUrl) {
          setApkDriveUrl(data.viewUrl);
        }
        if (data.version) {
          setApkVersion(data.version);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveApkConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveApkConfig(apkDriveUrl.trim(), apkVersion.trim(), apkReleaseNotes.trim());
    setApkUrlSaved(true);
    setTimeout(() => setApkUrlSaved(false), 3000);
  };

  // Telemetry Health
  const [loadingStats, setLoadingStats] = useState(false);

  // WhatsApp Gateway State
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppSystemStatus>({
    configured: false,
    provider: "baileys_qr",
    status: "idle",
  });
  const [senderSimNumber, setSenderSimNumber] = useState<string>(
    () => localStorage.getItem("lifenest_sender_number") || ""
  );
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingPairing, setRequestingPairing] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [refreshingGateway, setRefreshingGateway] = useState(false);
  const [linkMethod, setLinkMethod] = useState<"pairing_code" | "qr">("pairing_code");
  const [gatewayProvider, setGatewayProvider] = useState(() => {
    return localStorage.getItem("lifenest_alert_gateway") || "meta_cloud";
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("lifenest_gateway_api_key") || "wh_sec_live_9421873910";
  });
  const [dailyDispatchTime, setDailyDispatchTime] = useState(() => {
    return localStorage.getItem("lifenest_alert_delivery_time") || "09:00";
  });
  const [savedGatewayNotice, setSavedGatewayNotice] = useState(false);

  // Backend & Scheduler State
  const [backendUrlInput, setBackendUrlInput] = useState(() => getBackendApiUrl());
  const [backendSaveSuccess, setBackendSaveSuccess] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<{
    active?: boolean;
    whatsappStatus?: string;
    connectedPhone?: string;
  } | null>(null);
  const [triggeringScheduler, setTriggeringScheduler] = useState(false);

  // Google Drive State
  const [driveStatus, setDriveStatus] = useState<DriveStatusState>({
    configured: false,
    authorized: false,
  });
  const [authorizingDrive, setAuthorizingDrive] = useState(false);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);

  // Message Dashboard State
  const [messageLogs, setMessageLogs] = useState<DispatchedMessageLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DELIVERED" | "FAILED">("ALL");

  // Quick Dispatcher from Admin
  const [quickRecipient, setQuickRecipient] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickText, setQuickText] = useState("");
  const [sendingQuick, setSendingQuick] = useState(false);
  const [quickResult, setQuickResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Queue Monitor State
  const [queueItems, setQueueItems] = useState<Array<{
    id: string;
    type: "Rent" | "Vehicle" | "Document";
    title: string;
    recipientName: string;
    phone: string;
    due: string;
  }>>([]);

  const fetchSchedulerStatus = async () => {
    try {
      const apiUrl = (backendUrlInput.trim() || getBackendApiUrl()).replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const res = await fetch(`${apiUrl}/api/scheduler/status`);
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
      } else {
        setSchedulerStatus(null);
      }
    } catch {
      setSchedulerStatus(null);
    }
  };

  const refreshAll = async () => {
    if (!isAuthenticated) return;
    setLoadingStats(true);
    try {
      const [, wa, drv, msgs] = await Promise.all([
        getAdminStats(),
        getWhatsAppSystemStatus(),
        checkMasterDriveStatus(),
        getAdminMessages(),
      ]);
      setWhatsappStatus(wa);
      setDriveStatus(drv);
      setMessageLogs(msgs);
      fetchSchedulerStatus();
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
      loadQueue();
      const interval = setInterval(refreshAll, 6000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadQueue = async () => {
    try {
      const props = await listProperties().catch(() => []);
      const units: PropertyUnit[] = [];
      for (const p of props) {
        const u = await listPropertyUnits(p.id).catch(() => []);
        units.push(...u);
      }
      const vehs: Vehicle[] = await listVehicles().catch(() => []);

      const items: Array<{
        id: string;
        type: "Rent" | "Vehicle" | "Document";
        title: string;
        recipientName: string;
        phone: string;
        due: string;
      }> = [];

      // Add occupied units
      units
        .filter((u) => u.tenantName && u.tenantName.trim())
        .forEach((u) => {
          const t = mockTenants.find((m) => m.name.toLowerCase() === u.tenantName?.toLowerCase());
          items.push({
            id: `unit_${u.id}`,
            type: "Rent",
            title: `${u.unitName || u.unitNumber} Rent (৳${Number(u.monthlyRent).toLocaleString()})`,
            recipientName: u.tenantName || "Tenant",
            phone: t?.phone || "01711223344",
            due: "10th of this month",
          });
        });

      // Add sample tenants if units empty
      if (items.length === 0) {
        mockTenants.slice(0, 3).forEach((t, i) => {
          items.push({
            id: `sample_${i}`,
            type: "Rent",
            title: `Flat ${i === 0 ? "4B" : "2A"} Rent (৳25,000)`,
            recipientName: t.name,
            phone: t.phone || "01711223344",
            due: "10th of this month",
          });
        });
      }

      // Add vehicle documents
      vehs.forEach((v) => {
        items.push({
          id: `veh_${v.id}`,
          type: "Vehicle",
          title: `${v.name} BRTA Fitness & Tax Token`,
          recipientName: "Owner (Towsif)",
          phone: "01711353028",
          due: "Within 14 Days",
        });
      });

      setQueueItems(items);
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await adminLogin(loginId, loginPass);
      if (res.success && res.admin) {
        setIsAuthenticated(true);
        setAdminUser(res.admin);
      } else {
        setLoginError(res.message || "Invalid Admin ID or Password");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  // WhatsApp Admin Actions
  const handleRequestPairingCode = async () => {
    const fullNumber = formatRecipientNumber("+880", senderSimNumber);
    if (!fullNumber || fullNumber.length < 10) {
      alert("Enter Likhe Rakho's sender phone number (e.g. 017xxxxxxxx).");
      return;
    }
    localStorage.setItem("lifenest_sender_number", senderSimNumber);
    setRequestingPairing(true);
    setPairingError(null);
    try {
      const res = await getWhatsAppPairingCode(fullNumber);
      if (res.success && res.code) {
        setPairingCode(res.code);
      } else {
        setPairingError(res.error || "Failed to generate pairing code.");
      }
    } catch (err) {
      setPairingError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRequestingPairing(false);
      refreshAll();
    }
  };

  const handleRestartGateway = async () => {
    setRefreshingGateway(true);
    try {
      await restartWhatsAppGateway();
      await new Promise((r) => setTimeout(r, 800));
      await refreshAll();
    } finally {
      setRefreshingGateway(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm("Disconnect WhatsApp sender socket?")) return;
    await disconnectWhatsAppGateway();
    setPairingCode(null);
    refreshAll();
  };

  const handleSaveGatewaySettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("lifenest_alert_gateway", gatewayProvider);
    localStorage.setItem("lifenest_gateway_api_key", apiKey);
    localStorage.setItem("lifenest_alert_delivery_time", dailyDispatchTime);
    setSavedGatewayNotice(true);
    setTimeout(() => setSavedGatewayNotice(false), 3000);
  };

  const handleSaveBackendUrl = () => {
    setBackendApiUrl(backendUrlInput);
    setBackendSaveSuccess(true);
    setTimeout(() => setBackendSaveSuccess(false), 3000);
    refreshAll();
  };

  const handleTriggerScheduler = async () => {
    setTriggeringScheduler(true);
    try {
      const apiUrl = (backendUrlInput.trim() || getBackendApiUrl()).replace(/\/api\/?$/, "").replace(/\/+$/, "");
      const res = await fetch(`${apiUrl}/api/scheduler/trigger`, { method: "POST" });
      const data = await res.json();
      alert(`Autonomous Scheduler Ran!\nDispatched: ${data.dispatched ?? 0} reminders.`);
      refreshAll();
    } catch (e) {
      alert(`Scheduler Trigger Failed: ${e instanceof Error ? e.message : "Backend unreachable"}`);
    } finally {
      setTriggeringScheduler(false);
    }
  };

  // Drive Admin Actions
  const handleAuthorizeDrive = async () => {
    setAuthorizingDrive(true);
    setDriveNotice(null);
    try {
      await requestMasterAuthorization();
      setDriveNotice("Google Drive Master OAuth flow completed.");
      const updated = await checkMasterDriveStatus();
      setDriveStatus(updated);
    } catch (err) {
      setDriveNotice(err instanceof Error ? err.message : "Drive authorization failed.");
    } finally {
      setAuthorizingDrive(false);
    }
  };

  // Message Actions
  const handleClearLogs = async () => {
    if (!window.confirm("Clear all message dispatch history?")) return;
    await clearAdminMessages();
    setMessageLogs([]);
  };

  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRecipient || !quickText.trim()) {
      alert("Please enter recipient phone number and message text.");
      return;
    }
    const full = formatRecipientNumber("+880", quickRecipient);
    setSendingQuick(true);
    setQuickResult(null);
    try {
      const res = await sendSystemWhatsAppAlert({
        to: full,
        message: quickText,
      });
      if (res.success) {
        setQuickResult({
          success: true,
          msg: `Dispatched to +${full} (ID: ${res.messageId || "sent"})`,
        });
        setQuickText("");
        setTimeout(refreshAll, 500);
      } else {
        setQuickResult({
          success: false,
          msg: res.error || "Failed to dispatch message.",
        });
      }
    } catch (err) {
      setQuickResult({
        success: false,
        msg: err instanceof Error ? err.message : "Error dispatching",
      });
    } finally {
      setSendingQuick(false);
    }
  };

  // Filtered message logs
  const filteredMessages = messageLogs.filter((m) => {
    if (filterStatus !== "ALL" && m.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.to.toLowerCase().includes(q) ||
        (m.recipientName && m.recipientName.toLowerCase().includes(q)) ||
        (m.itemTitle && m.itemTitle.toLowerCase().includes(q)) ||
        m.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // =========================================================================
  // VIEW 1: PRIVATE ADMIN LOGIN GATE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mx-auto mb-1">
              <img
                src="/logo.png"
                alt="Likhe Rakho"
                className="h-14 w-14 rounded-2xl object-contain shadow-md shadow-emerald-500/20"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-mono">
              Likhe Rakho Core Command
            </h1>
            <p className="text-xs text-slate-500">
              Restricted Admin Panel for WhatsApp, Google Drive & Dispatch Console
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Admin Identifier
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Admin ID (Towsif)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                Admin Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Password (Admin)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none font-mono"
                required
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>{isLoggingIn ? "Verifying Credentials..." : "Authenticate & Enter Console"}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Privileged Access Only</span>
            <Link to="/" className="text-emerald-700 font-semibold hover:underline">
              Return to User App &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED COMMAND CENTER
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans pb-16">
      {/* Top SuperAdmin Bar */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Likhe Rakho"
              className="h-9 w-9 rounded-xl object-contain shadow-md shadow-emerald-500/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900 font-mono">
                  Likhe Rakho Core Command
                </span>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  SUPERADMIN
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Secluded Gateway & Automated Messaging Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>{adminUser?.name || "Towsif"}</span>
            </div>

            <button
              type="button"
              onClick={refreshAll}
              disabled={loadingStats}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
            </button>

            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition"
            >
              User App
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
              title="Lock Admin Console"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Telemetry Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: WhatsApp Status */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>WhatsApp Gateway</span>
              <Smartphone className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2 font-mono">
              {whatsappStatus.configured || whatsappStatus.status === "connected" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700">ONLINE</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700">{whatsappStatus.status.toUpperCase()}</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {whatsappStatus.connectedPhone ? `Sender: ${whatsappStatus.connectedPhone}` : "No SIM Linked"}
            </div>
          </div>

          {/* Card 2: Google Drive Status */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Master Google Drive</span>
              <HardDrive className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2 font-mono">
              {driveStatus.authorized ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700">AUTHORIZED</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700">UNLINKED</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {driveStatus.folderId ? `Folder: ${driveStatus.folderId.slice(0, 10)}...` : "Default Storage"}
            </div>
          </div>

          {/* Card 3: Total Dispatches */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Total Dispatches</span>
              <MessageSquare className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {messageLogs.length} Messages
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              {messageLogs.filter((m) => m.status === "DELIVERED").length} Delivered successfully
            </div>
          </div>

          {/* Card 4: Automated Queue */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>System Triggers Due</span>
              <Layers className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {queueItems.length} Triggers
            </div>
            <div className="text-[11px] text-slate-500">
              Tenants & Vehicle BRTA docs
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3">
          <button
            type="button"
            onClick={() => switchTab("messages")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "messages"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Message Audit Dashboard ({messageLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("whatsapp")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>WhatsApp Gateway & SIM</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("drive")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "drive"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Google Drive Master</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>System Queue Monitor ({queueItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("apk")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "apk"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            <span>Mobile App & APK Distribution</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("subscriptions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "subscriptions"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 shadow-2xs"
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span>Users & Subscriptions (প্ল্যান অ্যাক্সেস)</span>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: MESSAGE AUDIT DASHBOARD ("dashboard of message")
            =================================================================== */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Message Audit Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Live WhatsApp Dispatch Logs
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every automated or manual notification sent through LifeNest
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-900"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DELIVERED">Delivered Only</option>
                    <option value="FAILED">Failed Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                    title="Clear history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by recipient phone, name, or message text..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />

              {/* Logs Table */}
              <div className="overflow-x-auto">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/30">
                    <MessageSquare className="h-6 w-6 mx-auto text-slate-400" />
                    <p className="font-semibold text-slate-700">No dispatched messages matching filter.</p>
                    <p className="text-[11px] text-slate-500">
                      Dispatched alerts to tenants or vehicles will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                msg.status === "DELIVERED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {msg.status}
                            </span>
                            <span className="text-xs font-bold text-emerald-800">
                              জীবননীড়
                            </span>
                            <span className="text-slate-400 text-[11px]">→</span>
                            <span className="font-mono text-slate-900 font-bold">
                              +{msg.to}
                            </span>
                            {msg.recipientName && (
                              <span className="text-slate-500 text-[11px]">
                                ({msg.recipientName})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 font-mono bg-white p-2.5 rounded-lg border border-slate-200/90 whitespace-pre-wrap leading-relaxed shadow-2xs">
                          {msg.message}
                        </p>

                        {msg.error && (
                          <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>Error: {msg.error}</span>
                          </div>
                        )}
                        {msg.messageId && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            WhatsApp Message ID: {msg.messageId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Admin Instant Dispatcher */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs h-fit">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                  <Send className="h-4 w-4 text-emerald-600" />
                  Admin Quick Dispatch
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send a WhatsApp message directly from the LifeNest Bot to any phone
                </p>
              </div>

              <form onSubmit={handleSendQuickMessage} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Phone Number (e.g. 017xxxxxxxx)
                  </label>
                  <input
                    type="tel"
                    value={quickRecipient}
                    onChange={(e) => setQuickRecipient(e.target.value)}
                    placeholder="01711223344"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Name / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="e.g. Rahim Mia (Flat 4B)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={4}
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    placeholder="Type official notification..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingQuick}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingQuick ? "Dispatching..." : "Transmit WhatsApp Message"}</span>
                </button>
              </form>

              {quickResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    quickResult.success
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {quickResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{quickResult.msg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: WHATSAPP GATEWAY & SENDER SIM CONTROL
            =================================================================== */}
        {activeTab === "whatsapp" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-mono">
                  <Smartphone className="h-5 w-5 text-emerald-600" />
                  LifeNest WhatsApp Bot & SIM Manager
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect LifeNest's dedicated sender phone via 8-digit code or QR code.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartGateway}
                  disabled={refreshingGateway}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingGateway ? "animate-spin" : ""}`} />
                  <span>Reset Socket</span>
                </button>

                {whatsappStatus.configured && (
                  <button
                    type="button"
                    onClick={handleDisconnectWhatsApp}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition cursor-pointer"
                  >
                    Disconnect SIM
                  </button>
                )}
              </div>
            </div>

            {/* Backend Service & 24/7 Scheduler Status Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Backend Service & Autonomous 24/7 Reminder Scheduler
                  </span>
                  {schedulerStatus?.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active 24/7
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Checking / Offline
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerScheduler}
                    disabled={triggeringScheduler}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`h-3 w-3 ${triggeringScheduler ? "animate-spin" : ""}`} />
                    <span>{triggeringScheduler ? "Checking..." : "Trigger Due Reminders Now"}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Globe className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="url"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    placeholder="https://likherakho-backend.onrender.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveBackendUrl}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Save URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackendUrlInput("http://localhost:4000");
                    setBackendApiUrl("http://localhost:4000");
                    setBackendSaveSuccess(true);
                    setTimeout(() => setBackendSaveSuccess(false), 3000);
                    refreshAll();
                  }}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
                  title="Reset to local port 4000"
                >
                  Localhost
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackendUrlInput("https://likherakho-backend.onrender.com");
                    setBackendApiUrl("https://likherakho-backend.onrender.com");
                    setBackendSaveSuccess(true);
                    setTimeout(() => setBackendSaveSuccess(false), 3000);
                    refreshAll();
                  }}
                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
                  title="Use default Render backend"
                >
                  Render Production
                </button>
              </div>

              {backendSaveSuccess && (
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Backend endpoint updated and saved!
                </div>
              )}
            </div>

            {/* WhatsApp Gateway Status Banner (Shown when connected) */}
            {whatsappStatus.status === "connected" ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                      WhatsApp Web Gateway Linked & Active
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 block mt-1 font-mono">
                      Sender Device: <code className="bg-white border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-semibold">+{whatsappStatus.connectedPhone || "Connected"}</code>. All alerts dispatch silently in the background.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-semibold text-rose-700 transition cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-600" />
                  <span>Disconnect / Re-link</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                {/* Method Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-200/80 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLinkMethod("pairing_code")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                        linkMethod === "pairing_code"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      8-Digit Code (No Camera Needed)
                    </button>

                    <button
                      type="button"
                      onClick={() => setLinkMethod("qr")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                        linkMethod === "qr"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Scan QR Code
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={refreshingGateway}
                    onClick={handleRestartGateway}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 bg-white px-2.5 py-1 rounded-md hover:border-slate-300 disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingGateway ? "animate-spin" : ""}`} />
                    {refreshingGateway ? "Resetting..." : "Reset / Refresh"}
                  </button>
                </div>

                {whatsappStatus.error && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{whatsappStatus.error}</span>
                  </div>
                )}

                {/* TAB 1: 8-DIGIT PAIRING CODE */}
                {linkMethod === "pairing_code" ? (
                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          Link Dedicated SIM with 8-Character Pairing Code
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                            100% Reliable
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          No camera scanning required! Enter LifeNest's dedicated WhatsApp phone number to generate a secure pairing code:
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <div className="flex-1 flex gap-2">
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-semibold text-slate-600">
                            +880
                          </span>
                          <input
                            type="tel"
                            value={senderSimNumber}
                            onChange={(e) => setSenderSimNumber(e.target.value)}
                            placeholder="Likhe Rakho Sender Number (e.g. 017xxxxxxxx)"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono shadow-inner"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={requestingPairing || !senderSimNumber.trim()}
                          onClick={handleRequestPairingCode}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer shrink-0"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          {requestingPairing ? "Generating Code..." : "Generate Pairing Code"}
                        </button>
                      </div>
                    </div>

                    {pairingError && (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{pairingError}</span>
                      </div>
                    )}

                    {pairingCode && (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl text-slate-900 space-y-3 shadow-xs border border-slate-200">
                        <span className="text-[11px] tracking-widest uppercase text-emerald-700 font-bold">
                          Your One-Time WhatsApp Pairing Code
                        </span>
                        <div className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-emerald-700 bg-white px-6 py-2.5 rounded-xl border border-emerald-300 shadow-xs select-all">
                          {pairingCode.length === 8
                            ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
                            : pairingCode}
                        </div>
                        <p className="text-[11px] text-slate-600 text-center max-w-md">
                          Open WhatsApp on your phone &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong> &rarr; tap <strong>"Link with phone number instead"</strong> &rarr; type this code.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAB 2: QR CODE SCAN */
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-white rounded-xl border border-slate-200">
                    <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner shrink-0">
                      {whatsappStatus.status === "qr_ready" && whatsappStatus.qrDataUrl ? (
                        <img
                          src={whatsappStatus.qrDataUrl}
                          alt="WhatsApp Web QR Code"
                          className="w-56 h-56 rounded-lg shadow-xs object-contain bg-white p-1 border border-slate-200"
                        />
                      ) : whatsappStatus.status === "connecting" || refreshingGateway ? (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                          <span>Connecting to WhatsApp...</span>
                        </div>
                      ) : (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-center text-slate-500 text-xs gap-3 px-3">
                          <button
                            type="button"
                            disabled={refreshingGateway}
                            onClick={handleRestartGateway}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                          >
                            <QrCode className="h-4 w-4" />
                            <span>Show QR Code</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs text-slate-700 flex-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Scan QR Code with Camera
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Point your camera at this QR code to connect LifeNest as the background sender:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                        <li>Tap <strong>Settings</strong> (iOS) or <strong>Three dots ⋮</strong> (Android)</li>
                        <li>Select <strong>Linked Devices</strong> &rarr; tap <strong>Link a Device</strong></li>
                        <li>Point your camera at this QR code to connect</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GATEWAY & WEBHOOK INTEGRATION */}
            <form onSubmit={handleSaveGatewaySettings} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Gateway & Webhook Integration
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure official Meta WhatsApp Cloud API credentials, Green API, or Twilio webhook dispatchers.
                  </p>
                </div>
                {savedGatewayNotice && (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Gateway preferences saved
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Provider Engine
                  </label>
                  <select
                    value={gatewayProvider}
                    onChange={(e) => setGatewayProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-medium"
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
                    placeholder="Enter API token or secret key..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Digest Dispatch Time
                  </label>
                  <input
                    type="time"
                    value={dailyDispatchTime}
                    onChange={(e) => setDailyDispatchTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Automated background run time.
                  </span>
                </div>
              </div>

              {/* Setup Guide Options (Option A & Option B) */}
              <div className="grid gap-3 sm:grid-cols-2 text-xs pt-1">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1.5">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                    Option A: Instant Launch (Zero setup)
                  </div>
                  <p className="text-[11px] text-emerald-950/80 leading-relaxed">
                    Enter your WhatsApp mobile number above, then click <strong>"Open in WhatsApp"</strong>. LifeNest instantly prepares the alert and launches WhatsApp Web or app with the message pre-filled.
                  </p>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 space-y-1.5">
                  <div className="font-bold text-sky-800 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-sky-600" />
                    Option B: Silent Background Delivery
                  </div>
                  <p className="text-[11px] text-sky-950/80 leading-relaxed">
                    To receive alerts directly to your phone <em>silently in the background</em> without opening browser tabs, obtain your free 1-click CallMeBot API key and paste it in the field above.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Gateway Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MASTER GOOGLE DRIVE INFRASTRUCTURE
            =================================================================== */}
        {activeTab === "drive" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-mono">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                  Master Google Drive Storage Infrastructure
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the master Google Drive account that stores vehicle documents, property deeds, and tenant slips.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAuthorizeDrive}
                disabled={authorizingDrive}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{authorizingDrive ? "Authorizing..." : "Authorize Master Drive Account"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-500 font-medium">OAuth Refresh Token Health</div>
                <div className="text-sm font-bold font-mono">
                  {driveStatus.authorized ? (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Permanent Refresh Token Saved
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600" /> Authorization Code Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Allows automatic document uploads without asking users to log into Google Drive individually.
                </p>
              </div>

              <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-500 font-medium">Master Storage Folder</div>
                <div className="text-sm font-bold text-slate-900 font-mono truncate">
                  {driveStatus.folderId || "LifeNest-Vault-Root"}
                </div>
                <p className="text-[11px] text-slate-500">
                  Auto-creates subfolders per user: <code className="text-slate-700 font-semibold">/Vehicles</code>, <code className="text-slate-700 font-semibold">/Properties</code>, <code className="text-slate-700 font-semibold">/Licenses</code>.
                </p>
              </div>
            </div>

            {driveNotice && (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-800">
                {driveNotice}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 4: SYSTEM QUEUE MONITOR
            =================================================================== */}
        {activeTab === "queue" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                  <Layers className="h-4 w-4 text-amber-600" />
                  Upcoming System Dispatch Triggers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitors expiring documents, BRTA tax tokens, and tenant rents across all assets
                </p>
              </div>

              <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold">
                {queueItems.length} Registered Targets
              </span>
            </div>

            <div className="space-y-2.5">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                        {item.type}
                      </span>
                      <span className="text-xs font-bold text-slate-900 font-mono">{item.title}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Target: <strong className="text-slate-800">{item.recipientName}</strong></span>
                      <span>&bull;</span>
                      <span className="font-mono text-emerald-700">+{item.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Due: {item.due}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickRecipient(item.phone);
                        setQuickName(item.recipientName);
                        setQuickText(`🌿 *জীবননীড় (LifeNest)*\n\nআসসালামু আলাইকুম ${item.recipientName}, আশা করি ভালো আছেন।\nআপনার জন্য একটি প্রয়োজনীয় অনুস্মারক রয়েছে।\n\n*বিষয়:* ${item.title}\n*নির্ধারিত সময়:* ${item.due}\n\nঅনুগ্রহ করে প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ করা হলো।\n— *জীবননীড়* (আপনার বিশ্বস্ত পারিবারিক সঙ্গী)`);
                        setActiveTab("messages");
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Draft</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: MOBILE APP & APK DISTRIBUTION (SUPERADMIN CONSOLE)
            =================================================================== */}
        {activeTab === "apk" && (
          <div className="space-y-6">
            {/* Card 1: Google Drive APK Distribution */}
            <form
              onSubmit={handleSaveApkConfig}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
            >
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>Android App (.apk) Distribution via Google Drive</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Host your compiled LifeNest.apk on Google Drive and allow Android users to download and install updates seamlessly.
                  </p>
                </div>
                {apkMetadata && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold font-mono self-start sm:self-auto">
                    Active Release: v{apkMetadata.version || apkVersion} • {apkMetadata.fileSizeMb || "8.57"} MB
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Drive APK File Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={apkDriveUrl}
                    onChange={(e) => setApkDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1A2B3C4D.../view?usp=sharing"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white font-mono"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save & Publish</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload your <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">LifeNest.apk</code> to Google Drive, right-click ➔ Share ➔ set to <strong>"Anyone with the link can view"</strong>, and paste the URL here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Latest APK Version / Build
                  </label>
                  <input
                    type="text"
                    value={apkVersion}
                    onChange={(e) => setApkVersion(e.target.value)}
                    placeholder="1.0.1"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Installed build baseline: <strong>v{CURRENT_APP_BUILD}</strong>. Increase this version to trigger update notifications for mobile users.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    What's New / Release Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={apkReleaseNotes}
                    onChange={(e) => setApkReleaseNotes(e.target.value)}
                    placeholder="Unified access control, sidebar module alignment, vehicle renewals..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Shown inside the in-app mobile update prompt when users are notified.
                  </p>
                </div>
              </div>

              {apkUrlSaved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Google Drive APK link and version saved! Mobile devices will now receive update prompts.
                </div>
              )}

              {apkDriveUrl && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const directUrl = getGoogleDriveDirectDownloadUrl(apkDriveUrl);
                      window.open(directUrl, "_blank");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>Test Direct APK Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("lifenest:check-for-updates"));
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span>Test Update Notification Popup</span>
                  </button>

                  <a
                    href={apkDriveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
                  >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </form>

            {/* Card 2: Instant Progressive Web App (PWA) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-orange-500" />
                <span>Instant Web App (Android & iOS Home Screen)</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Users can also install LifeNest directly onto their phone's home screen without downloading an APK file. This provides instant fullscreen loading, offline asset caching, and an app icon.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <div className="text-xs font-bold text-slate-800">🤖 For Android:</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Open LifeNest in Chrome ➔ tap the install prompt or menu (⋮) ➔ select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <div className="text-xs font-bold text-slate-800">🍏 For Apple iOS (iPhone/iPad):</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Open in Safari ➔ tap the <strong>Share</strong> button (⎋) ➔ scroll down and select <strong>"Add to Home Screen"</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: USER SUBSCRIPTIONS & ACCESS CONTROL
            =================================================================== */}
        {activeTab === "subscriptions" && (
          <AdminSubscriptionTab />
        )}
      </main>
    </div>
  );
}
