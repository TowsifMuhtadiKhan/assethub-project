import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Wrench,
  FileText,
  ShieldCheck,
  CheckSquare,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listTasks } from "../services/taskService";
import { listDocuments } from "../services/documentService";
import { listWarranties } from "../services/warrantyService";
import { listVehicles } from "../services/vehicleService";
import { getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { Tabs, FilterChips } from "../components/common";
import type { CalendarEvent } from "../types";

export type ScheduleCategory =
  | "all"
  | "issues"
  | "vehicle_service"
  | "documents"
  | "warranties";

export type ScheduleTimeframe = "all" | "7days" | "30days" | "90days";

export function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [_userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<ScheduleCategory>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<ScheduleTimeframe>("30days");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAllSchedule();
  }, []);

  const loadAllSchedule = async () => {
    setLoading(true);
    try {
      const userAcc = await getCurrentUserAccess();
      setUserAccess(userAcc);
      if (!userAcc.isHead && userAcc.access.canAccessSchedule === false) {
        setIsLocked(true);
        setLoading(false);
        return;
      }

      const canTasks = userAcc.isHead || userAcc.access.canAccessTasks !== false;
      const canDocs = userAcc.isHead || userAcc.access.canAccessVault !== false;
      const canWarranties = userAcc.isHead || userAcc.access.canAccessWarranties !== false;
      const canVehicles = userAcc.isHead || userAcc.access.canAccessVehicles !== false;

      const [tasks, docs, war, vehs] = await Promise.all([
        canTasks ? listTasks().catch(() => []) : Promise.resolve([]),
        canDocs ? listDocuments().catch(() => []) : Promise.resolve([]),
        canWarranties ? listWarranties().catch(() => []) : Promise.resolve([]),
        canVehicles ? listVehicles().catch(() => []) : Promise.resolve([]),
      ]);

      const evs: CalendarEvent[] = [];

      // 1. Issues & Tasks
      tasks.forEach((t) => {
        if (t.dueDate) {
          evs.push({
            id: `task-${t.id}`,
            title: t.title,
            date: t.dueDate,
            time: t.dueTime,
            type: "task",
            details: `Priority: ${t.priority || "Medium"} · Assignee: ${t.familyMemberName || "Unassigned"}`,
          });
        }
      });

      // 2. Documents Expiring (BRTA & Vault)
      docs.forEach((d) => {
        if (d.expiryDate) {
          evs.push({
            id: `doc-${d.id}`,
            title: `Expiry: ${d.name}`,
            date: d.expiryDate,
            type: "document_expiry",
            details: `Category: ${d.category} · Authority: ${d.issuingAuthority || "BRTA"}`,
          });
        }
      });

      // 3. Warranties Expiring
      war.forEach((w) => {
        if (w.expiryDate) {
          evs.push({
            id: `war-${w.id}`,
            title: `Warranty Expiry: ${w.productName}`,
            date: w.expiryDate,
            type: "warranty_expiry",
            details: `Seller: ${w.seller} · Status: ${w.status}`,
          });
        }
      });

      // 4. Vehicles Next Fitness / Tax Token from vehicle records
      vehs.forEach((v) => {
        // Only include if vehicle actually has an active reminder configured in notes
        const hasReminder = Boolean(v.notes && /\[Reminder:[^\]]+\]/i.test(v.notes));
        if (v.fitnessExpiry && hasReminder) {
          evs.push({
            id: `veh-fit-${v.id}`,
            title: `${v.name} - BRTA Fitness Renewal Due`,
            date: v.fitnessExpiry,
            type: "document_expiry",
            details: `${v.brand} ${v.model} (${v.registrationNumber || "Unregistered"})`,
          });
        }
      });

      // Sort by date ascending
      evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(evs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return events.filter((ev) => {
      // 1. Category Filter
      if (selectedCategory === "issues" && ev.type !== "task") return false;
      if (selectedCategory === "vehicle_service" && !ev.title.toLowerCase().includes("fitness") && !ev.title.toLowerCase().includes("service")) return false;
      if (selectedCategory === "documents" && ev.type !== "document_expiry") return false;
      if (selectedCategory === "warranties" && ev.type !== "warranty_expiry") return false;

      // 2. Timeframe Filter
      if (selectedTimeframe !== "all") {
        const evDate = new Date(ev.date).getTime();
        const diffDays = Math.ceil((evDate - todayTimestamp) / (1000 * 60 * 60 * 24));
        if (selectedTimeframe === "7days" && (diffDays < -1 || diffDays > 7)) return false;
        if (selectedTimeframe === "30days" && (diffDays < -3 || diffDays > 30)) return false;
        if (selectedTimeframe === "90days" && (diffDays < -10 || diffDays > 90)) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const combined = `${ev.title} ${ev.details || ""} ${ev.date}`.toLowerCase();
        return combined.includes(q);
      }

      return true;
    });
  }, [events, selectedCategory, selectedTimeframe, searchQuery]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    return {
      all: events.length,
      issues: events.filter((e) => e.type === "task").length,
      vehicle_service: events.filter((e) => e.title.toLowerCase().includes("fitness") || e.title.toLowerCase().includes("service")).length,
      documents: events.filter((e) => e.type === "document_expiry").length,
      warranties: events.filter((e) => e.type === "warranty_expiry").length,
    };
  }, [events]);

  const getEventBadge = (type: string, title: string) => {
    if (title.toLowerCase().includes("fitness") || title.toLowerCase().includes("service")) {
      return {
        label: "Vehicle & BRTA",
        icon: Wrench,
        className: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
      };
    }
    if (type === "task") {
      return {
        label: "Task",
        icon: CheckSquare,
        className: "bg-blue-50 text-blue-800 border-blue-200/60",
      };
    }
    if (type === "document_expiry") {
      return {
        label: "Document Expiry",
        icon: FileText,
        className: "bg-purple-50 text-purple-800 border-purple-200/60",
      };
    }
    return {
      label: "Warranty Deadline",
      icon: ShieldCheck,
      className: "bg-amber-50 text-amber-800 border-amber-200/60",
    };
  };

  const getDayDiff = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)}d Overdue`, color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (diff === 0) return { label: "Today", color: "text-rose-700 bg-rose-100 border-rose-300 font-bold" };
    if (diff === 1) return { label: "Tomorrow", color: "text-amber-700 bg-amber-50 border-amber-300 font-bold" };
    if (diff <= 7) return { label: `In ${diff} days`, color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: `In ${diff} days`, color: "text-slate-600 bg-slate-100 border-slate-200" };
  };

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Schedule Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to access family schedules and calendar events. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Schedule & Deadlines
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified chronological schedule for vehicle renewals, task deadlines, and warranty expirations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/my-life/tasks")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <CheckSquare className="h-3.5 w-3.5" /> View Tasks Board
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
        {/* Category Pills */}
        <FilterChips
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val as ScheduleCategory)}
          size="sm"
          variant="theme"
          items={[
            { id: "all", label: "All Items", count: categoryCounts.all },
            { id: "issues", label: "Tasks", count: categoryCounts.issues },
            { id: "vehicle_service", label: "Vehicle & BRTA", count: categoryCounts.vehicle_service },
            { id: "documents", label: "Documents", count: categoryCounts.documents },
            { id: "warranties", label: "Warranties", count: categoryCounts.warranties },
          ]}
        />

        {/* Timeframe + Search */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={selectedTimeframe}
            onChange={(val) => setSelectedTimeframe(val as ScheduleTimeframe)}
            size="xs"
            variant="segmented"
            items={[
              { id: "7days", label: "7 Days" },
              { id: "30days", label: "30 Days" },
              { id: "90days", label: "90 Days" },
              { id: "all", label: "All Time" },
            ]}
          />

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Schedule Items List */}
      {loading ? (
        <BrandLogoLoader
          message="Loading Calendar & Schedule..."
          subtitle="Syncing upcoming bills, expiry dates, and events"
        />
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No scheduled events found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {searchQuery
              ? `No events match "${searchQuery}".`
              : "No upcoming deadlines or tasks for the selected filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSelectedTimeframe("all");
              setSearchQuery("");
            }}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((ev) => {
            const badge = getEventBadge(ev.type, ev.title);
            const BadgeIcon = badge.icon;
            const diff = getDayDiff(ev.date);

            return (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
              >
                <div className="flex items-start gap-3">
                  {/* Date badge */}
                  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center min-w-[54px] shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 leading-tight">
                      {new Date(ev.date).toLocaleString("en-US", { month: "short" })}
                    </span>
                    <span className="text-base font-extrabold text-slate-900 leading-tight font-mono">
                      {new Date(ev.date).getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-md border px-1.5 py-0.2 text-[10px] font-mono font-semibold ${diff.color}`}
                      >
                        {diff.label}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 mt-1">
                      {ev.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ev.details || "Scheduled deadline"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 text-right">
                  <span className="font-mono text-xs text-slate-500">
                    {ev.date} {ev.time ? `at ${ev.time}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
