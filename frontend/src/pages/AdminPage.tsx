import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
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
} from "lucide-react";
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
} from "../utils/googleDrive";
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

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<"whatsapp" | "drive" | "messages" | "queue">("messages");

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
      alert("Enter LifeNest's sender phone number (e.g. 017xxxxxxxx).");
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono">
              LifeNest Core Control
            </h1>
            <p className="text-xs text-slate-400">
              Restricted Admin Panel for WhatsApp, Google Drive & Dispatch Console
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Admin Identifier
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Admin ID (Towsif)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                Admin Password
              </label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Password (Admin)"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                required
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>{isLoggingIn ? "Verifying Credentials..." : "Authenticate & Enter Console"}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Privileged Access Only</span>
            <Link to="/" className="text-emerald-400 hover:underline">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top SuperAdmin Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white font-mono">
                  LifeNest Core Command
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  SUPERADMIN
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Secluded Gateway & Automated Messaging Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>{adminUser?.name || "Towsif"}</span>
            </div>

            <button
              type="button"
              onClick={refreshAll}
              disabled={loadingStats}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
            </button>

            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              User App
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>WhatsApp Gateway</span>
              <Smartphone className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              {whatsappStatus.configured || whatsappStatus.status === "connected" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">ONLINE</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">{whatsappStatus.status.toUpperCase()}</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {whatsappStatus.connectedPhone ? `Sender: ${whatsappStatus.connectedPhone}` : "No SIM Linked"}
            </div>
          </div>

          {/* Card 2: Google Drive Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Master Google Drive</span>
              <HardDrive className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              {driveStatus.authorized ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">AUTHORIZED</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">UNLINKED</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {driveStatus.folderId ? `Folder: ${driveStatus.folderId.slice(0, 10)}...` : "Default Storage"}
            </div>
          </div>

          {/* Card 3: Total Dispatches */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Dispatches</span>
              <MessageSquare className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {messageLogs.length} Messages
            </div>
            <div className="text-[11px] text-emerald-400">
              {messageLogs.filter((m) => m.status === "DELIVERED").length} Delivered successfully
            </div>
          </div>

          {/* Card 4: Automated Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>System Triggers Due</span>
              <Layers className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {queueItems.length} Triggers
            </div>
            <div className="text-[11px] text-slate-400">
              Tenants & Vehicle BRTA docs
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "messages"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Message Audit Dashboard ({messageLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>WhatsApp Gateway & SIM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("drive")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "drive"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Google Drive Master</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>System Queue Monitor ({queueItems.length})</span>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: MESSAGE AUDIT DASHBOARD ("dashboard of message")
            =================================================================== */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Message Audit Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    Live WhatsApp Dispatch Logs
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every automated or manual notification sent through LifeNest
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DELIVERED">Delivered Only</option>
                    <option value="FAILED">Failed Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />

              {/* Logs Table */}
              <div className="overflow-x-auto">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <MessageSquare className="h-6 w-6 mx-auto text-slate-600" />
                    <p>No dispatched messages matching filter.</p>
                    <p className="text-[11px] text-slate-600">
                      Dispatched alerts to tenants or vehicles will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 transition space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                msg.status === "DELIVERED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {msg.status}
                            </span>
                            <span className="font-mono text-slate-200 font-bold">
                              +{msg.to}
                            </span>
                            {msg.recipientName && (
                              <span className="text-slate-400 text-[11px]">
                                ({msg.recipientName})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>

                        {msg.error && (
                          <div className="text-[11px] text-rose-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>Error: {msg.error}</span>
                          </div>
                        )}
                        {msg.messageId && (
                          <div className="text-[10px] text-slate-500 font-mono truncate">
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Send className="h-4 w-4 text-emerald-400" />
                  Admin Quick Dispatch
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send a WhatsApp message directly from the LifeNest Bot to any phone
                </p>
              </div>

              <form onSubmit={handleSendQuickMessage} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Phone Number (e.g. 017xxxxxxxx)
                  </label>
                  <input
                    type="tel"
                    value={quickRecipient}
                    onChange={(e) => setQuickRecipient(e.target.value)}
                    placeholder="01711223344"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Name / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="e.g. Rahim Mia (Flat 4B)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={4}
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    placeholder="Type official notification..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingQuick}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingQuick ? "Dispatching..." : "Transmit WhatsApp Message"}</span>
                </button>
              </form>

              {quickResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    quickResult.success
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {quickResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                  <Smartphone className="h-5 w-5 text-emerald-400" />
                  LifeNest WhatsApp Bot & SIM Manager
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect LifeNest's dedicated sender phone via 8-digit code or QR code.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestartGateway}
                  disabled={refreshingGateway}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingGateway ? "animate-spin" : ""}`} />
                  <span>Reset Socket</span>
                </button>

                {whatsappStatus.configured && (
                  <button
                    type="button"
                    onClick={handleDisconnectWhatsApp}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold border border-rose-500/30 transition"
                  >
                    Disconnect SIM
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp Gateway Status Banner (Shown when connected - from user screenshot) */}
            {whatsappStatus.status === "connected" ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-400/40 text-xs text-emerald-200 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2 text-sm">
                      WhatsApp Web Gateway Linked & Active
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 block mt-1 font-mono">
                      Sender Device: <code className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">+{whatsappStatus.connectedPhone || "Connected"}</code>. All alerts dispatch silently in the background.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-300 transition cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>Disconnect / Re-link</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                {/* Method Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLinkMethod("pairing_code")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                        linkMethod === "pairing_code"
                          ? "bg-emerald-600 text-white shadow-xs font-bold"
                          : "text-slate-400 hover:text-white"
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
                          ? "bg-emerald-600 text-white shadow-xs font-bold"
                          : "text-slate-400 hover:text-white"
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
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-md hover:border-emerald-500/40 disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingGateway ? "animate-spin" : ""}`} />
                    {refreshingGateway ? "Resetting..." : "Reset / Refresh"}
                  </button>
                </div>

                {whatsappStatus.error && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{whatsappStatus.error}</span>
                  </div>
                )}

                {/* TAB 1: 8-DIGIT PAIRING CODE */}
                {linkMethod === "pairing_code" ? (
                  <div className="space-y-4 text-xs text-slate-300">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          Link Dedicated SIM with 8-Character Pairing Code
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                            100% Reliable
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No camera scanning required! Enter LifeNest's dedicated WhatsApp phone number to generate a secure pairing code:
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <div className="flex-1 flex gap-2">
                          <span className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-mono font-semibold text-slate-400">
                            +880
                          </span>
                          <input
                            type="tel"
                            value={senderSimNumber}
                            onChange={(e) => setSenderSimNumber(e.target.value)}
                            placeholder="LifeNest Sender Number (e.g. 017xxxxxxxx)"
                            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono shadow-inner"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={requestingPairing || !senderSimNumber.trim()}
                          onClick={handleRequestPairingCode}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer shrink-0"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          {requestingPairing ? "Generating Code..." : "Generate Pairing Code"}
                        </button>
                      </div>
                    </div>

                    {pairingError && (
                      <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>{pairingError}</span>
                      </div>
                    )}

                    {pairingCode && (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl text-white space-y-3 shadow-md border border-slate-800">
                        <span className="text-[11px] tracking-widest uppercase text-emerald-400 font-semibold">
                          Your One-Time WhatsApp Pairing Code
                        </span>
                        <div className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-emerald-300 bg-slate-950 px-6 py-2.5 rounded-xl border border-emerald-500/40 select-all">
                          {pairingCode.length === 8
                            ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
                            : pairingCode}
                        </div>
                        <p className="text-[11px] text-slate-300 text-center max-w-md">
                          Open WhatsApp on your phone &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong> &rarr; tap <strong>"Link with phone number instead"</strong> &rarr; type this code.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAB 2: QR CODE SCAN */
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="flex flex-col items-center justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-inner shrink-0">
                      {whatsappStatus.status === "qr_ready" && whatsappStatus.qrDataUrl ? (
                        <img
                          src={whatsappStatus.qrDataUrl}
                          alt="WhatsApp Web QR Code"
                          className="w-56 h-56 rounded-lg shadow-xs object-contain bg-white p-1"
                        />
                      ) : whatsappStatus.status === "connecting" || refreshingGateway ? (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
                          <span>Connecting to WhatsApp...</span>
                        </div>
                      ) : (
                        <div className="w-56 h-56 flex flex-col items-center justify-center text-center text-slate-400 text-xs gap-3 px-3">
                          <button
                            type="button"
                            disabled={refreshingGateway}
                            onClick={handleRestartGateway}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                          >
                            <QrCode className="h-4 w-4" />
                            <span>Show QR Code</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs text-slate-300 flex-1">
                      <h4 className="text-sm font-bold text-white">
                        Scan QR Code with Camera
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Point your camera at this QR code to connect LifeNest as the background sender:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] font-medium text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
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
          </div>
        )}

        {/* ===================================================================
            TAB 3: MASTER GOOGLE DRIVE INFRASTRUCTURE
            =================================================================== */}
        {activeTab === "drive" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                  Master Google Drive Storage Infrastructure
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure the master Google Drive account that stores vehicle documents, property deeds, and tenant slips.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAuthorizeDrive}
                disabled={authorizingDrive}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{authorizingDrive ? "Authorizing..." : "Authorize Master Drive Account"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-400">OAuth Refresh Token Health</div>
                <div className="text-sm font-bold font-mono">
                  {driveStatus.authorized ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Permanent Refresh Token Saved
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> Authorization Code Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Allows automatic document uploads without asking users to log into Google Drive individually.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-xs text-slate-400">Master Storage Folder</div>
                <div className="text-sm font-bold text-white font-mono truncate">
                  {driveStatus.folderId || "LifeNest-Vault-Root"}
                </div>
                <p className="text-[11px] text-slate-400">
                  Auto-creates subfolders per user: <code className="text-slate-300">/Vehicles</code>, <code className="text-slate-300">/Properties</code>, <code className="text-slate-300">/Licenses</code>.
                </p>
              </div>
            </div>

            {driveNotice && (
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300">
                {driveNotice}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 4: SYSTEM QUEUE MONITOR
            =================================================================== */}
        {activeTab === "queue" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Layers className="h-4 w-4 text-amber-400" />
                  Upcoming System Dispatch Triggers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitors expiring documents, BRTA tax tokens, and tenant rents across all assets
                </p>
              </div>

              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                {queueItems.length} Registered Targets
              </span>
            </div>

            <div className="space-y-2.5">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                        {item.type}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{item.title}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Target: <strong className="text-slate-200">{item.recipientName}</strong></span>
                      <span>&bull;</span>
                      <span className="font-mono text-emerald-400">+{item.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      Due: {item.due}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickRecipient(item.phone);
                        setQuickName(item.recipientName);
                        setQuickText(`🔔 LifeNest Alert: Reminder regarding ${item.title}. Due date: ${item.due}.`);
                        setActiveTab("messages");
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
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
      </main>
    </div>
  );
}
