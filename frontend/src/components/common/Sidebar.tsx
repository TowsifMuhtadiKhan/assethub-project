import { useState, useMemo, useEffect } from "react";
import {
  LayoutGrid,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderLock,
  FileText,
  Car,
  ShieldCheck,
  Building2,
  Users,
  Settings,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pin,
  RefreshCw,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
    id: "consumer",
    title: "Consumer",
    icon: LayoutGrid,
    iconColor: "text-orange-500",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "my-life",
    title: "My Life",
    icon: CheckSquare,
    iconColor: "text-amber-500",
    items: [
      { to: "/my-life/tasks", label: "Tasks", icon: CheckSquare },
      { to: "/my-life/calendar", label: "Schedule", icon: Calendar },
    ],
  },
  {
    id: "vault",
    title: "Vault",
    icon: FolderLock,
    iconColor: "text-sky-500",
    items: [
      { to: "/documents/vault", label: "Document Vault", icon: FileText },
    ],
  },
  {
    id: "assets",
    title: "Assets & Fleet",
    icon: Car,
    iconColor: "text-emerald-500",
    items: [
      { to: "/assets/vehicles", label: "Vehicles & Fuel", icon: Car },
      { to: "/assets/warranties", label: "Warranties & Claims", icon: ShieldCheck },
      { to: "/rentals/properties", label: "Properties & Rent", icon: Building2 },
    ],
  },
  {
    id: "admin",
    title: "Workspace",
    icon: Shield,
    iconColor: "text-indigo-400",
    items: [
      { to: "/family/profiles", label: "Family Profiles", icon: Users },
      { to: "/settings", label: "Settings", icon: Settings },
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
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();

  // Determine which group contains the active route so it starts expanded
  const activeGroupId = useMemo(() => {
    for (const group of MENU_GROUPS) {
      for (const item of group.items) {
        if (
          item.to === location.pathname ||
          (item.to === "/assets/vehicles" &&
            (location.pathname.startsWith("/assets/vehicles") ||
              location.pathname.startsWith("/vehicles"))) ||
          (item.to !== "/" && location.pathname.startsWith(item.to))
        ) {
          return group.id;
        }
      }
    }
    return "consumer";
  }, [location.pathname]);

  // Track expanded groups state in full mode
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    consumer: true,
    "my-life": true,
    vault: true,
    assets: true,
    admin: true,
  });

  // Ensure active group stays open when navigating
  useEffect(() => {
    setExpandedGroups((prev) => ({
      ...prev,
      [activeGroupId]: true,
    }));
  }, [activeGroupId]);

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
  const renderFullNavigation = (onItemClick?: () => void) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
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
                  ? "text-white"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GroupIcon className={`h-4 w-4 shrink-0 ${group.iconColor}`} />
                <span className="text-[13px] font-bold tracking-tight">{group.title}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-300">
                {hasActiveChild && (
                  <Pin className="h-3 w-3 text-slate-500 opacity-60" />
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isExpanded ? "rotate-0" : "-rotate-90 text-slate-600"
                  }`}
                />
              </div>
            </button>

            {/* Collapsible Children hanging off a thin vertical guide line */}
            {isExpanded && (
              <div className="relative ml-4 pl-3.5 border-l border-slate-700/60 space-y-0.5 py-1">
                {group.items.map((item) => {
                  const active = isItemActive(item.to);
                  const SubIcon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onItemClick}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? "bg-orange-500/10 text-orange-400 font-semibold shadow-xs"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      {/* Active Indicator Bar right on the guide line */}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute -left-[18px] top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"
                        />
                      )}

                      {/* Submenu Item Icon */}
                      <SubIcon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          active
                            ? "text-orange-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />

                      {/* Submenu Label */}
                      <span className="truncate">{item.label}</span>
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

  // Render for collapsed mini-rail mode (icon only)
  const renderCollapsedNavigation = () => (
    <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
      {MENU_GROUPS.map((group) => {
        return (
          <div key={group.id} className="space-y-1.5 border-b border-slate-850/60 pb-3 last:border-b-0">
            {group.items.map((item) => {
              const active = isItemActive(item.to);
              const SubIcon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  title={`${group.title}: ${item.label}`}
                  className={`group relative flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all ${
                    active
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <SubIcon className="h-4 w-4" />
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. MOBILE BACKDROP & DRAWER (< lg screens)                            */}
      {/* ===================================================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0f172a] text-slate-200 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-tight">
                LifeNest OS
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                Personal & Fleet OS
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        {renderFullNavigation(onCloseMobile)}

        {/* Mobile Footer */}
        <div className="border-t border-slate-800/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">LifeNest API</span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">v2.4 Online</span>
          </div>
        </div>
      </aside>

      {/* ===================================================================== */}
      {/* 2. DESKTOP SIDEBAR (>= lg screens) - Collapsible Rail / Full Sidebar  */}
      {/* ===================================================================== */}
      <aside
        className={`hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col lg:h-screen transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-[#0f172a] text-slate-200 z-30 select-none ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Desktop Navigation"
      >
        {/* Header with Logo & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-3.5">
          {isCollapsed ? (
            <div className="mx-auto flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight text-white leading-tight">
                    LifeNest OS
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">
                    Personal & Fleet OS
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse navigation"
                title="Collapse sidebar"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Content */}
        {isCollapsed ? renderCollapsedNavigation() : renderFullNavigation()}

        {/* Footer Info / Expand button when collapsed */}
        <div className="border-t border-slate-800/80 p-3">
          {isCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="w-full flex items-center justify-center p-1 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-300 font-medium">LifeNest API</span>
              </div>
              <span className="font-mono text-slate-500 text-[10px]">v2.4 Online</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
