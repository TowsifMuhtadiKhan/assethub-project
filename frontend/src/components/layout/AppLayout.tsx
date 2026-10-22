import {
  CircleUserRound,
  CheckSquare,
  FileText,
  Car,
  Building,
  ShieldAlert,
  Users,
  LogOut,
  Settings,
  Smartphone,
  Download,
  X,
  Globe,
} from "lucide-react";
import { useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "../common/Sidebar";
import { PwaInstallPrompt } from "../common/PwaInstallPrompt";
import { AskAiAssistant } from "../common/AskAiAssistant";
import { ApkUpdateNotificationModal } from "../common/ApkUpdateNotificationModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";
import {
  downloadApkFromConfiguredDrive,
} from "../../services/appUpdateService";
import { clearToken, getUserEmail } from "../../services/api";
import { getUserSettings } from "../../services/settingsService";
import {
  getCurrentUserAccess,
  type CurrentUserAccessResult,
} from "../../services/familyService";
import { supabase } from "../../lib/supabase";
import { SignoutOverlay } from "../common/LoadingStates";
import { useLanguage } from "../../context/LanguageContext";

export function AppLayout() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Signout error:", err);
    } finally {
      clearToken();
      setTimeout(() => {
        window.location.href = "/";
      }, 1250);
    }
  };

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

  // User profile and access information
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(
    null,
  );
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

    getCurrentUserAccess().then((acc) => {
      setUserAccess(acc);
      if (acc.member?.fullName) {
        setUserProfile((prev) => ({
          ...prev,
          fullName: acc.member!.fullName,
          email: acc.member!.email || prev.email,
        }));
      }
    });

    const handleOpenQuickAdd = () => setQuickAddOpen(true);
    window.addEventListener("lifenest:open-quick-add", handleOpenQuickAdd);
    return () =>
      window.removeEventListener("lifenest:open-quick-add", handleOpenQuickAdd);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lifenest_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "b" || e.code === "KeyB")
      ) {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebarCollapse]);

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
    <div className="min-h-screen bg-[#f6faf7] text-slate-900 w-full overflow-x-clip flex flex-col">
      {/* Dedicated Native Mobile Header */}
      <MobileHeader
        onOpenQuickAdd={() => setQuickAddOpen((prev) => !prev)}
        onOpenProfile={() => setProfileOpen((prev) => !prev)}
        userInitials={getInitials(userProfile.fullName, userProfile.email)}
      />

      {/* Body Area with Left Sidebar and Main Content */}
      <div className="flex flex-1 w-full min-h-screen">
        {/* Sidebar Component (collapsible on desktop, full viewport height, sticky in-flow) */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          userProfile={userProfile}
          userAccess={userAccess}
          displayName={displayName}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />

        {/* Main Content Area (natural in-flow flex-1, zero margin-left hacks, zero overflow) */}
        <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out">
          {/* Main Full-Width Content Container with zero padding for full-bleed headers and mobile bottom nav spacing */}
          <main className="flex-1 bg-[#f6faf7] w-full pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 flex flex-col">
            <Outlet />
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
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Add Something New
                </h3>
                <p className="text-[11px] text-slate-400">
                  Save tasks, papers, vehicles, or houses
                </p>
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
                  path: "/settings?tab=profile",
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
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition active:scale-[0.99] text-left cursor-pointer"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">
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
            style={{
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#064e3b] to-emerald-700 text-white font-bold text-sm shadow-xs ring-1 ring-emerald-200">
                  {getInitials(userProfile.fullName, userProfile.email)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-bold text-slate-900 truncate capitalize">
                      {displayName}
                    </div>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${
                        userAccess?.isHead
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {userAccess?.isHead
                        ? "HEAD"
                        : (
                            userAccess?.access?.loginRole || "MEMBER"
                          ).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {userProfile.email}
                  </div>
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

            {/* Language Switcher Bar inside Mobile Profile Sheet */}
            <div className="my-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Globe className="h-4 w-4 text-indigo-600" />
                <span>{t("language", "Language")}</span>
              </div>
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    language === "en"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("bn")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    language === "bn"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  বাংলা
                </button>
              </div>
            </div>

            <div className="mt-2 space-y-1">
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
                  <div className="text-[10px] font-normal text-emerald-600/80">
                    Direct download for phone
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  window.dispatchEvent(
                    new CustomEvent("lifenest:open-install-prompt"),
                  );
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
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenQuickAdd={() => setQuickAddOpen((prev) => !prev)}
        onOpenAi={() =>
          window.dispatchEvent(new CustomEvent("lifenest:open-ai"))
        }
        onOpenProfile={() => setProfileOpen((prev) => !prev)}
      />

      {/* PWA Add to Home Screen Banner & iOS Guide */}
      <PwaInstallPrompt />

      {/* Automatic APK Update Notification (Google Drive Direct Download) */}
      <ApkUpdateNotificationModal />

      {/* Grounded LifeNest AI Assistant */}
      <AskAiAssistant />

      {/* Animated Signout Overlay */}
      {isSigningOut && <SignoutOverlay />}
    </div>
  );
}
