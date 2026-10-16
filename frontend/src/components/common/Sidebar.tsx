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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  getCurrentUserAccess,
  type CurrentUserAccessResult,
} from "../../services/familyService";
import { useLanguage } from "../../context/LanguageContext";

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
};

export function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();
  const { t } = useLanguage();

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

  // Track user access for granular permissions
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult>({
    member: null,
    access: {
      canLogin: true,
      loginRole: "Admin",
      canAccessDashboard: true,
      canAccessVehicles: true,
      assignedVehicleIds: [],
      canWriteFuel: true,
      canWriteMaintenance: true,
      canWriteDocuments: true,
      canAccessVault: true,
      canAccessProperties: true,
      canAccessWarranties: true,
      canAccessTasks: true,
      canAccessSchedule: true,
      canAccessDailyExpenses: true,
    },
    isHead: true,
  });

  useEffect(() => {
    getCurrentUserAccess().then((res) => {
      setUserAccess(res);
    });
  }, []);

  const isItemLocked = (to: string) => {
    if (userAccess.isHead) return false;
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
      {/* DESKTOP SIDEBAR (>= lg screens only) - Starts vertically below the full-width header */}
      <aside
        className={`hidden lg:fixed lg:left-0 lg:top-14 lg:flex lg:flex-col lg:h-[calc(100dvh-3.5rem)] transition-all duration-300 ease-in-out border-r border-[#043e30] bg-[#064e3b] text-emerald-100 z-20 select-none ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Desktop Navigation"
      >
        {/* Navigation Content */}
        {isCollapsed ? renderCollapsedNavigation() : renderFullNavigation()}

        {/* Footer: Sidebar Collapse / Expand Toggle */}
        <div className="border-t border-[#043e30] p-2.5">
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
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-emerald-200/80 hover:text-white hover:bg-[#073f32] active:scale-[0.99] transition cursor-pointer text-xs font-semibold"
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
        </div>
      </aside>
    </>
  );
}
