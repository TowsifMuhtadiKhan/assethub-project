import {
  CircleUserRound,
  Plus,
  Search,
  CheckSquare,
  FileText,
  Car,
  Building,
  ShieldAlert,
  Users,
  PanelLeft,
  ChevronDown,
  LogOut,
  Settings,
  Smartphone,
  Download,
  X,
} from "lucide-react";
import { useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar } from "../common/Sidebar";
import { PwaInstallPrompt } from "../common/PwaInstallPrompt";
import { AskAiAssistant } from "../common/AskAiAssistant";
import { ApkUpdateNotificationModal } from "../common/ApkUpdateNotificationModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";
import { downloadApkFromConfiguredDrive } from "../../services/appUpdateService";
import { clearToken, getUserEmail } from "../../services/api";
import { getUserSettings } from "../../services/settingsService";

export function AppLayout() {
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Desktop sidebar collapse state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("lifenest_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Mobile sidebar drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User profile information
  const [userProfile, setUserProfile] = useState<{
    fullName: string;
    email: string;
  }>({
    fullName: "",
    email: getUserEmail() || "Signed In",
  });

  useEffect(() => {
    getUserSettings().then((s) => {
      if (s.fullName) {
        setUserProfile((prev) => ({ ...prev, fullName: s.fullName }));
      }
    });

    const handleOpenQuickAdd = () => setQuickAddOpen(true);
    window.addEventListener("lifenest:open-quick-add", handleOpenQuickAdd);
    return () => window.removeEventListener("lifenest:open-quick-add", handleOpenQuickAdd);
  }, []);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lifenest_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Helper to extract 1 or 2 letter initials
  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email && email.includes("@")) {
      const user = email.split("@")[0];
      return user.substring(0, 2).toUpperCase();
    }
    return "LN";
  };

  const displayName =
    userProfile.fullName ||
    (userProfile.email && userProfile.email.includes("@")
      ? userProfile.email.split("@")[0].replace(/[._]/g, " ")
      : "Family Admin");

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 w-full overflow-x-hidden">
      <div className="flex min-h-screen w-full">
        {/* Sidebar Component (collapsible on desktop, drawer on mobile) */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area (dynamic margin according to sidebar state) */}
        <div
          className={`ml-0 flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out w-full ${
            sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
          }`}
        >
          {/* Dedicated Native Mobile Header */}
          <MobileHeader
            onOpenQuickAdd={() => setQuickAddOpen((prev) => !prev)}
            onOpenProfile={() => setProfileOpen((prev) => !prev)}
            userInitials={getInitials(userProfile.fullName, userProfile.email)}
          />

          {/* Desktop Top Header Bar */}
          <header className="sticky top-0 z-20 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md safe-area-top hidden lg:block">
            <div className="flex h-14 items-center justify-between px-3.5 sm:px-6 w-full">
              <div className="flex items-center gap-2">

              {/* Desktop Sidebar Collapse Toggle */}
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer shadow-2xs"
                title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              >
                <PanelLeft className="h-4 w-4" />
              </button>

              {/* Global Quick Search Bar */}
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 md:flex">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  className="w-56 lg:w-72 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search documents, cars, bills... (Ctrl+K)"
                />
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Quick Create Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Quick create menu"
                  onClick={() => setQuickAddOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add New</span>
                </button>

                {quickAddOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setQuickAddOpen(false)}
                    />
                    <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <div className="text-xs font-bold text-slate-900">Add Something New</div>
                        <div className="text-[11px] text-slate-500">Quickly save a task, paper, car, or house</div>
                      </div>

                      <div className="space-y-0.5">
                        {[
                          {
                            label: "New Task",
                            description: "To-do list and reminders",
                            path: "/my-life/tasks",
                            icon: CheckSquare,
                            color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                          },
                          {
                            label: "Upload Document",
                            description: "National ID, Passport, Certificates",
                            path: "/documents/vault",
                            icon: FileText,
                            color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                          },
                          {
                            label: "Add Vehicle",
                            description: "Car, bike, petrol/gas & repairs",
                            path: "/assets/vehicles",
                            icon: Car,
                            color: "text-amber-600 bg-amber-50 border-amber-100",
                          },
                          {
                            label: "House & Rent",
                            description: "Flats, shops, deeds & tenant rent",
                            path: "/rentals/properties",
                            icon: Building,
                            color: "text-purple-600 bg-purple-50 border-purple-100",
                          },
                          {
                            label: "Warranty & Receipt",
                            description: "Warranty card & purchase bill",
                            path: "/assets/warranties",
                            icon: ShieldAlert,
                            color: "text-cyan-600 bg-cyan-50 border-cyan-100",
                          },
                          {
                            label: "Family Member",
                            description: "Add spouse, children, parents",
                            path: "/family/profiles",
                            icon: Users,
                            color: "text-rose-600 bg-rose-50 border-rose-100",
                          },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.path}
                              type="button"
                              onClick={() => {
                                setQuickAddOpen(false);
                                navigate(item.path);
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50 transition group cursor-pointer"
                            >
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${item.color}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">
                                  {item.label}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {item.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Professional User Profile */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open profile menu"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-1 sm:pl-1 sm:pr-2.5 hover:border-slate-300 hover:bg-slate-50/90 transition shadow-2xs cursor-pointer group"
                >
                  {/* Avatar with Gradient & Status Indicator */}
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white font-bold text-xs shadow-xs ring-1 ring-slate-200">
                    <span>{getInitials(userProfile.fullName, userProfile.email)}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  {/* User Name & Role Pill */}
                  <div className="hidden text-left sm:block">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-slate-950 capitalize leading-tight">
                      {displayName}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 leading-none">
                      Family Head
                    </div>
                  </div>

                  <ChevronDown
                    className={`hidden sm:block h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/5 animate-in fade-in zoom-in-95 duration-100">
                      {/* Profile Card Header */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 mb-1.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white font-bold text-sm shadow-xs ring-1 ring-slate-200">
                          {getInitials(userProfile.fullName, userProfile.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate capitalize">
                              {displayName}
                            </span>
                            <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                              HEAD
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-slate-500 font-mono">
                            {userProfile.email}
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu Items */}
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate("/settings?tab=profile");
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition text-left cursor-pointer"
                        >
                          <CircleUserRound className="h-4 w-4 text-slate-400" />
                          <span>My Profile & Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            navigate("/settings");
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition text-left cursor-pointer"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>Settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            window.dispatchEvent(new CustomEvent("lifenest:open-install-prompt"));
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition text-left cursor-pointer"
                        >
                          <Smartphone className="h-4 w-4 text-slate-400" />
                          <span>Install App on Phone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            downloadApkFromConfiguredDrive();
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 hover:text-emerald-950 transition text-left cursor-pointer border border-emerald-200/50"
                        >
                          <Download className="h-4 w-4 text-emerald-600" />
                          <div className="flex-1 min-w-0">
                            <div>Download Android App (APK)</div>
                            <div className="text-[10px] font-normal text-emerald-600/80 truncate">
                              Direct download for your phone
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            window.dispatchEvent(new CustomEvent("lifenest:check-for-updates"));
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition text-left cursor-pointer"
                        >
                          <Smartphone className="h-4 w-4 text-slate-400" />
                          <span>Check for App Update</span>
                        </button>
                      </div>

                      <div className="my-1.5 border-t border-slate-100" />

                      {/* Sign Out Action */}
                      <button
                        type="button"
                        onClick={() => {
                          clearToken();
                          window.location.reload();
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Full-Width Content Container with mobile bottom nav spacing */}
          <main className="flex-1 overflow-y-auto no-scrollbar lg:scrollbar-auto p-3.5 sm:p-5 lg:p-6 bg-slate-50/60 w-full safe-area-bottom pb-6">
            <Outlet />
            {/* Mandatory physical bottom spacer on mobile so that content on EVERY screen can scroll completely clear of the fixed bottom navigation */}
            <div className="h-32 sm:h-36 w-full shrink-0 lg:hidden pointer-events-none" aria-hidden="true" />
          </main>
        </div>
      </div>

      {/* Mobile Quick Add Action Sheet */}
      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden"
          onClick={() => setQuickAddOpen(false)}
        >
          <div
            className="w-full max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl p-4 text-slate-900 animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add Something New</h3>
                <p className="text-[11px] text-slate-400">Save tasks, papers, vehicles, or houses</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {[
                { label: "New Task", description: "To-do list and reminders", path: "/my-life/tasks", icon: CheckSquare, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { label: "Upload Document", description: "National ID, Passport, Certificates", path: "/documents/vault", icon: FileText, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
                { label: "Add Vehicle", description: "Car, bike, petrol/gas & repairs", path: "/assets/vehicles", icon: Car, color: "text-amber-600 bg-amber-50 border-amber-100" },
                { label: "House & Rent", description: "Flats, shops, deeds & tenant rent", path: "/rentals/properties", icon: Building, color: "text-purple-600 bg-purple-50 border-purple-100" },
                { label: "Warranty & Receipt", description: "Warranty card & purchase bill", path: "/assets/warranties", icon: ShieldAlert, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
                { label: "Family Member", description: "Add spouse, children, parents", path: "/settings?tab=profile", icon: Users, color: "text-rose-600 bg-rose-50 border-rose-100" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setQuickAddOpen(false);
                      navigate(item.path);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition active:scale-[0.99] text-left cursor-pointer"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Profile Action Sheet */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="w-full max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl p-4 text-slate-900 animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white font-bold text-sm shadow-xs ring-1 ring-slate-200">
                  {getInitials(userProfile.fullName, userProfile.email)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate capitalize">{displayName}</div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">{userProfile.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings?tab=profile");
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
              >
                <CircleUserRound className="h-4 w-4 text-slate-400" />
                <span>My Profile & Details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  downloadApkFromConfiguredDrive();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 transition text-left cursor-pointer border border-emerald-200/50"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <div>Download Android App (APK)</div>
                  <div className="text-[10px] font-normal text-emerald-600/80">Direct download for phone</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  window.dispatchEvent(new CustomEvent("lifenest:open-install-prompt"));
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
              >
                <Smartphone className="h-4 w-4 text-slate-400" />
                <span>Install Web App</span>
              </button>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  window.location.reload();
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenQuickAdd={() => setQuickAddOpen((prev) => !prev)}
        onOpenAi={() => window.dispatchEvent(new CustomEvent("lifenest:open-ai"))}
        onOpenProfile={() => setProfileOpen((prev) => !prev)}
      />

      {/* PWA Add to Home Screen Banner & iOS Guide */}
      <PwaInstallPrompt />

      {/* Automatic APK Update Notification (Google Drive Direct Download) */}
      <ApkUpdateNotificationModal />

      {/* Grounded LifeNest AI Assistant */}
      <AskAiAssistant />
    </div>
  );
}
