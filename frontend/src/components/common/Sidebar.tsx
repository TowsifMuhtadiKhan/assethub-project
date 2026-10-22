import { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid,
  LayoutDashboard,
  CheckSquare,
  FolderLock,
  FileText,
  Car,
  ShieldCheck,
  Building2,
  Wallet,
  ChevronDown,
  Pin,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  User,
  CircleUserRound,
  Settings,
  LogOut,
  Globe,
  Smartphone,
  Download,
  ShieldAlert,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  getCurrentUserAccess,
  type CurrentUserAccessResult,
} from "../../services/familyService";
import { useLanguage } from "../../context/LanguageContext";
import {
  downloadApkFromConfiguredDrive,
  isNativeApk,
} from "../../services/appUpdateService";

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type MenuGroup = {
  id: string;
  title: string;
  icon: typeof LayoutGrid;
  iconColor: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "my-life",
    title: "Daily Life",
    icon: CheckSquare,
    iconColor: "text-emerald-400",
    items: [
      { to: "/my-life/tasks", label: "To-Do List", icon: CheckSquare },
      { to: "/my-life/expenses", label: "Daily Expenses", icon: Wallet },
    ],
  },
  {
    id: "vault",
    title: "Important Papers",
    icon: FolderLock,
    iconColor: "text-teal-300",
    items: [{ to: "/documents/vault", label: "All Documents", icon: FileText }],
  },
  {
    id: "assets",
    title: "Vehicles & Houses",
    icon: Car,
    iconColor: "text-lime-300",
    items: [
      { to: "/assets/vehicles", label: "Cars & Bikes", icon: Car },
      {
        to: "/rentals/properties",
        label: "Houses, Flats & Rent",
        icon: Building2,
      },
      {
        to: "/assets/warranties",
        label: "Warranty Cards",
        icon: ShieldCheck,
      },
    ],
  },
];

export type SidebarProps = {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  userProfile?: { fullName: string; email: string };
  userAccess?: CurrentUserAccessResult | null;
  displayName?: string;
  onSignOut?: () => void;
  isSigningOut?: boolean;
};

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
  userProfile,
  userAccess: propUserAccess,
  displayName: propDisplayName,
  onSignOut,
  isSigningOut = false,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [desktopQuickAddOpen, setDesktopQuickAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [localUserAccess, setLocalUserAccess] = useState<CurrentUserAccessResult | null>(null);

  const userAccess = propUserAccess ?? localUserAccess;
  const displayName = propDisplayName || userProfile?.fullName || "Family Admin";

  const quickAddItems = [
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
      icon: Building2,
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
  ];

  const getGroupTitle = (groupId: string, defaultTitle: string) => {
    switch (groupId) {
      case "my-life":
        return t("group_my_life", defaultTitle);
      case "vault":
        return t("group_vault", defaultTitle);
      case "assets":
        return t("group_assets", defaultTitle);
      default:
        return defaultTitle;
    }
  };

  const getItemLabel = (to: string, defaultLabel: string) => {
    switch (to) {
      case "/my-life/tasks":
        return t("item_todo", defaultLabel);
      case "/my-life/expenses":
        return t("item_expenses", defaultLabel);
      case "/documents/vault":
        return t("item_docs", defaultLabel);
      case "/assets/vehicles":
        return t("item_vehicles", defaultLabel);
      case "/rentals/properties":
        return t("item_houses", defaultLabel);
      case "/assets/warranties":
        return t("item_warranties", defaultLabel);
      default:
        return defaultLabel;
    }
  };

  // Determine which group contains the active route so it starts expanded
  const activeGroupId = useMemo(() => {
    for (const group of MENU_GROUPS) {
      for (const item of group.items) {
        if (
          item.to === location.pathname ||
          (item.to === "/assets/vehicles" &&
            ((location.pathname.startsWith("/assets/vehicles") &&
              location.pathname !== "/assets/vehicles/dashboard") ||
              location.pathname.startsWith("/vehicles"))) ||
          (item.to !== "/" && location.pathname.startsWith(item.to))
        ) {
          return group.id;
        }
      }
    }
    return "my-life";
  }, [location.pathname]);

  // Track expanded groups state in full mode
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      "my-life": true,
      vault: true,
      assets: true,
    },
  );

  // Ensure active group stays open when navigating
  useEffect(() => {
    setExpandedGroups((prev) => ({
      ...prev,
      [activeGroupId]: true,
    }));
  }, [activeGroupId]);

  useEffect(() => {
    if (!propUserAccess) {
      getCurrentUserAccess().then((res) => {
        setLocalUserAccess(res);
      });
    }
  }, [propUserAccess]);

  const isItemLocked = (to: string) => {
    if (!userAccess || userAccess.isHead) return false;
    const acc = userAccess.access;
    if (to === "/" && acc.canAccessDashboard === false) return true;
    if (to === "/my-life/tasks" && acc.canAccessTasks === false) return true;
    if (to === "/my-life/calendar" && acc.canAccessSchedule === false)
      return true;
    if (to === "/my-life/expenses" && acc.canAccessDailyExpenses === false)
      return true;
    if (to === "/documents/vault" && acc.canAccessVault === false) return true;
    if (to === "/assets/vehicles" && acc.canAccessVehicles === false)
      return true;
    if (to === "/rentals/properties" && acc.canAccessProperties === false)
      return true;
    if (to === "/assets/warranties" && acc.canAccessWarranties === false)
      return true;
    return false;
  };

  // Close mobile menu whenever location changes
  useEffect(() => {
    onCloseMobile?.();
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/assets/vehicles") {
      return (
        location.pathname.startsWith("/assets/vehicles") ||
        location.pathname.startsWith("/vehicles")
      );
    }
    return location.pathname.startsWith(to);
  };

  // Reusable render for full menu navigation
  const renderFullNavigation = (onItemClick?: () => void) => {
    const isDashboardActive = location.pathname === "/";

    return (
      <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1.5">
        {/* Direct Top-Level Dashboard Link */}
        <NavLink
          to="/"
          end
          onClick={onItemClick}
          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
            isDashboardActive
              ? "bg-[#0d825c] text-white font-bold shadow-md shadow-emerald-950/40"
              : "text-emerald-100/75 hover:bg-[#073f32] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard
              className={`h-4 w-4 shrink-0 ${
                isDashboardActive ? "text-white" : "text-emerald-300"
              }`}
            />
            <span className="text-[13px] tracking-tight">
              {t("nav_dashboard", "Dashboard")}
            </span>
          </div>
          {isItemLocked("/") && (
            <Lock className="h-3 w-3 text-emerald-300/40 shrink-0" />
          )}
        </NavLink>

        <div className="my-1 border-t border-[#043e30]" />

        {MENU_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const isExpanded = expandedGroups[group.id] ?? false;
          const hasActiveChild = group.items.some((it) => isItemActive(it.to));

          return (
            <div key={group.id} className="space-y-1">
              {/* Parent Category Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer group ${
                  hasActiveChild
                    ? "text-white font-bold"
                    : "text-emerald-100/75 hover:bg-[#073f32] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon
                    className={`h-4 w-4 shrink-0 ${group.iconColor}`}
                  />
                  <span className="text-[13px] font-bold tracking-tight">
                    {getGroupTitle(group.id, group.title)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-200/50 group-hover:text-emerald-100">
                  {hasActiveChild && (
                    <Pin className="h-3 w-3 text-emerald-400 opacity-80" />
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isExpanded ? "rotate-0" : "-rotate-90 text-emerald-300/50"
                    }`}
                  />
                </div>
              </button>

              {/* Collapsible Children hanging off a thin vertical guide line */}
              {isExpanded && (
                <div className="relative ml-4 pl-3.5 border-l border-emerald-700/40 space-y-0.5 py-1">
                  {group.items.map((item) => {
                    const active = isItemActive(item.to);
                    const SubIcon = item.icon;
                    const locked = isItemLocked(item.to);

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={(e) => {
                          if (locked) {
                            e.preventDefault();
                            alert(
                              "Access to this section is restricted for your account by the Family Head.",
                            );
                            return;
                          }
                          onItemClick?.();
                        }}
                        className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                          locked
                            ? "opacity-40 cursor-not-allowed hover:bg-transparent text-emerald-300/40"
                            : active
                              ? "bg-[#0d825c] text-white font-semibold shadow-xs"
                              : "text-emerald-100/75 hover:bg-[#073f32] hover:text-white"
                        }`}
                      >
                        {/* Active Indicator Bar right on the guide line */}
                        {active && !locked && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-[18px] top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
                          />
                        )}

                        {/* Submenu Item Icon */}
                        <SubIcon
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            locked
                              ? "text-emerald-300/40"
                              : active
                                ? "text-white"
                                : "text-emerald-300/70 group-hover:text-white"
                          }`}
                        />

                        {/* Submenu Label */}
                        <span className="truncate">
                          {getItemLabel(item.to, item.label)}
                        </span>
                        {locked && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-300 font-semibold bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                            <Lock className="h-2.5 w-2.5 shrink-0" />
                            <span>Locked</span>
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  // Render for collapsed mini-rail mode (icon only)
  const renderCollapsedNavigation = () => {
    const isDashboardActive = location.pathname === "/";
    const isDashLocked = isItemLocked("/");

    return (
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {/* Direct Dashboard Icon */}
        <NavLink
          to="/"
          end
          onClick={(e) => {
            if (isDashLocked) {
              e.preventDefault();
              alert("Access to Dashboard is restricted by the Family Head.");
            }
          }}
          title={t("nav_dashboard", "Dashboard")}
          className={`group relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all ${
            isDashLocked
              ? "opacity-35 cursor-not-allowed text-emerald-300/40"
              : isDashboardActive
                ? "bg-[#0d825c] text-white shadow-md shadow-emerald-950/40"
                : "text-emerald-200/70 hover:bg-[#073f32] hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
        </NavLink>

        <div className="border-b border-[#043e30] pb-1" />

        {MENU_GROUPS.map((group) => {
          return (
            <div
              key={group.id}
              className="space-y-1.5 border-b border-[#043e30] pb-3 last:border-b-0"
            >
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const SubIcon = item.icon;
                const locked = isItemLocked(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={(e) => {
                      if (locked) {
                        e.preventDefault();
                        alert(
                          "Access to this section is restricted for your account by the Family Head.",
                        );
                      }
                    }}
                    title={`${getGroupTitle(group.id, group.title)}: ${getItemLabel(item.to, item.label)}${locked ? " (Locked)" : ""}`}
                    className={`group relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all ${
                      locked
                        ? "opacity-35 cursor-not-allowed text-emerald-300/40"
                        : active
                          ? "bg-[#0d825c] text-white shadow-md shadow-emerald-950/40"
                          : "text-emerald-200/70 hover:bg-[#073f32] hover:text-white"
                    }`}
                  >
                    <SubIcon className="h-4 w-4" />
                    {locked && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-emerald-950" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <>
      {/* DESKTOP SIDEBAR (>= lg screens only) - Pinned from top:0 to bottom */}
      <aside
        className={`hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col lg:h-screen lg:h-dvh transition-all duration-300 ease-in-out border-r border-[#043e30] bg-[#064e3b] text-emerald-100 z-30 select-none ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Desktop Navigation"
      >
        {/* Top Header inside Sidebar: Brand Logo & Quick Add */}
        {isCollapsed ? (
          <div className="p-3 border-b border-[#043e30] flex flex-col items-center gap-3 shrink-0">
            <NavLink
              to="/"
              className="flex items-center justify-center group"
              title="Likhe Rakho"
            >
              <img
                src="/logo.png"
                alt="Likhe Rakho"
                className="h-9 w-9 rounded-xl object-contain shadow-xs group-hover:scale-105 transition"
              />
            </NavLink>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDesktopQuickAddOpen((prev) => !prev)}
                title={t("quick_add", "Add New")}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>

              {desktopQuickAddOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDesktopQuickAddOpen(false)}
                  />
                  <div className="absolute left-12 top-0 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/10 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-emerald-50 mb-1">
                      <div className="text-xs font-bold text-[#064e3b]">
                        Add Something New
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Quickly save a task, paper, car, or house
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {quickAddItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => {
                              setDesktopQuickAddOpen(false);
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
          </div>
        ) : (
          <div className="p-3 border-b border-[#043e30] space-y-3 shrink-0">
            <NavLink
              to="/"
              className="flex items-center gap-2.5 transition shrink-0 group"
            >
              <img
                src="/logo.png"
                alt="Likhe Rakho"
                className="h-8.5 w-8.5 rounded-xl object-contain shadow-xs group-hover:scale-105 transition"
              />
              <div className="flex flex-col min-w-0">
                <div className="text-[15px] font-extrabold tracking-tight leading-tight flex items-center gap-0.5">
                  <span className="text-white">Likhe</span>
                  <span className="text-emerald-400">Rakho</span>
                </div>
                <div className="text-[9.5px] font-medium text-emerald-200/80 leading-none mt-0.5 truncate">
                  মনে রাখার ঝামেলা শেষ, লিখে রাখো।
                </div>
              </div>
            </NavLink>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDesktopQuickAddOpen((prev) => !prev)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>{t("quick_add", "Add New")}</span>
              </button>

              {desktopQuickAddOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDesktopQuickAddOpen(false)}
                  />
                  <div className="absolute left-0 top-11 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/10 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-emerald-50 mb-1">
                      <div className="text-xs font-bold text-[#064e3b]">
                        Add Something New
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Quickly save a task, paper, car, or house
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {quickAddItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => {
                              setDesktopQuickAddOpen(false);
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
          </div>
        )}

        {/* Navigation Content */}
        {isCollapsed ? renderCollapsedNavigation() : renderFullNavigation()}

        {/* Footer: User Profile at Bottom Left + Collapse Toggle */}
        <div className="mt-auto border-t border-[#043e30] p-2 space-y-1 shrink-0">
          {/* Collapse / Expand Toggle Button */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar (Ctrl+B)"
              className="w-full flex items-center justify-center p-2 rounded-xl text-emerald-200/80 hover:text-white hover:bg-[#073f32] active:scale-95 transition cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4 text-emerald-300" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-emerald-200/70 hover:text-white hover:bg-[#073f32] active:scale-[0.99] transition cursor-pointer text-xs font-semibold"
              title="Collapse sidebar (Ctrl+B)"
            >
              <span className="flex items-center gap-2">
                <PanelLeftClose className="h-4 w-4 text-emerald-300" />
                <span>Collapse sidebar</span>
              </span>
              <kbd className="text-[10px] font-mono text-emerald-300/70 bg-[#043e30] px-1.5 py-0.5 rounded border border-emerald-800/60">
                Ctrl+B
              </kbd>
            </button>
          )}

          {/* User Profile Trigger at Bottom Left */}
          <div className="relative">
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                title={`${displayName} (${userAccess?.isHead ? "Family Head" : "Family Member"})`}
                className="relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl hover:bg-[#073f32] active:scale-95 transition cursor-pointer group"
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700/80 text-white font-bold text-xs ring-1 ring-emerald-400/40 group-hover:ring-emerald-300">
                  <User className="h-4 w-4 text-emerald-100" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#064e3b] ${
                      userAccess?.isHead ? "bg-emerald-400" : "bg-teal-400"
                    }`}
                  />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#073f32] active:scale-[0.99] transition cursor-pointer group"
              >
                <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-emerald-700/80 text-white font-bold text-xs ring-1 ring-emerald-400/40 group-hover:ring-emerald-300">
                  <User className="h-4 w-4 text-emerald-100" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#064e3b] ${
                      userAccess?.isHead ? "bg-emerald-400" : "bg-teal-400"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate capitalize group-hover:text-emerald-200">
                    {displayName}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-300/80 truncate">
                    {userAccess?.isHead
                      ? t("family_head", "Family Head")
                      : userAccess?.member?.relationship
                        ? `${userAccess.member.relationship}`
                        : userAccess?.access?.loginRole || "Family Member"}
                  </div>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-emerald-300/70 group-hover:text-white transition-transform duration-200 ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Profile Popover opening upwards from Bottom Left */}
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  className={`absolute bottom-full mb-2 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl ring-1 ring-slate-950/10 text-slate-900 animate-in fade-in zoom-in-95 duration-100 ${
                    isCollapsed ? "left-12" : "left-0"
                  }`}
                >
                  {/* Profile Card Header */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/80 mb-1.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] text-white shadow-xs ring-1 ring-emerald-300/60">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate capitalize">
                          {displayName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                            userAccess?.isHead
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-teal-50 text-teal-800 border-teal-200"
                          }`}
                        >
                          {userAccess?.isHead
                            ? "HEAD"
                            : (
                                userAccess?.access?.loginRole || "MEMBER"
                              ).toUpperCase()}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-slate-500 font-mono">
                        {userProfile?.email}
                      </div>
                    </div>
                  </div>

                  {/* Language Switcher Bar inside dropdown */}
                  <div className="p-2 mb-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Globe className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{t("language", "Language")}</span>
                    </div>
                    <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setLanguage("en")}
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
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
                        className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                          language === "bn"
                            ? "bg-white text-slate-900 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        বাংলা
                      </button>
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
                      <span>{t("my_profile", "My Profile & Details")}</span>
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
                      <span>{t("settings", "Settings")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        window.dispatchEvent(
                          new CustomEvent("lifenest:open-install-prompt"),
                        );
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
                    {isNativeApk() && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          window.dispatchEvent(
                            new CustomEvent("lifenest:check-for-updates"),
                          );
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition text-left cursor-pointer"
                      >
                        <Smartphone className="h-4 w-4 text-slate-400" />
                        <span>Check for App Update</span>
                      </button>
                    )}
                  </div>

                  <div className="my-1.5 border-t border-slate-100" />

                  {/* Sign Out Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut?.();
                    }}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>
                      {isSigningOut
                        ? t("loading", "Signing out...")
                        : t("sign_out", "Sign Out")}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
