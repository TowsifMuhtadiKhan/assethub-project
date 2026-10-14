import { useEffect, useState, useMemo } from "react";
import {
  Circle,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  CheckSquare,
  Car,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listTasks, updateTaskStatus } from "../services/taskService";
import { listDocuments } from "../services/documentService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import { listWarranties } from "../services/warrantyService";
import { listFamilyMembers, getCurrentUserAccess } from "../services/familyService";
import type {
  TaskItem,
  DocumentItem,
  Vehicle,
  Property,
  WarrantyItem,
  FamilyMember,
} from "../types";
import { MobileHomePage } from "../components/mobile/MobileHomePage";

export function DashboardPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Schedule filtering state
  const [scheduleTimeframe, setScheduleTimeframe] = useState<"7days" | "30days" | "all">("30days");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "task" | "document" | "vehicle" | "warranty">("all");
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    getCurrentUserAccess().then(({ isHead, access }) => {
      if (!isHead && access.canAccessDashboard === false) {
        setIsLocked(true);
      }
    });

    Promise.all([
      listTasks(),
      listDocuments(),
      listVehicles(),
      listProperties(),
      listWarranties(),
      listFamilyMembers(),
    ])
      .then(([t, d, v, p, w, f]) => {
        setTasks(t);
        setDocuments(d);
        setVehicles(v);
        setProperties(p);
        setWarranties(w);
        setFamilyMembers(f);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      await updateTaskStatus(task.id, nextStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "Completed");
  const expiringDocs = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return days > 0 && days <= 30;
  });
  const expiringWarranties = warranties.filter((w) => {
    if (!w.expiryDate) return false;
    const days = (new Date(w.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return days > 0 && days <= 60;
  });

  // Aggregate unified schedule from tasks, document renewals, vehicle fitness, and warranties
  const scheduleEvents = useMemo(() => {
    const evs: Array<{
      id: string;
      title: string;
      date: string;
      time?: string;
      type: "task" | "document" | "vehicle" | "warranty";
      categoryLabel: string;
      details: string;
      link: string;
      priority?: string;
    }> = [];

    // 1. Pending Tasks with due dates
    tasks.forEach((t) => {
      if (t.dueDate && t.status !== "Completed") {
        evs.push({
          id: `task-${t.id}`,
          title: t.title,
          date: t.dueDate,
          time: t.dueTime,
          type: "task",
          categoryLabel: "Task",
          details: `Priority: ${t.priority || "Medium"}${t.familyMemberName ? ` · ${t.familyMemberName}` : ""}`,
          link: "/my-life/tasks",
          priority: t.priority,
        });
      }
    });

    // 2. Documents Expiring
    documents.forEach((d) => {
      if (d.expiryDate) {
        evs.push({
          id: `doc-${d.id}`,
          title: d.name,
          date: d.expiryDate,
          type: "document",
          categoryLabel: "Document",
          details: `${d.category}${d.issuingAuthority ? ` · ${d.issuingAuthority}` : ""}`,
          link: "/documents/vault",
        });
      }
    });

    // 3. Warranties Expiring
    warranties.forEach((w) => {
      if (w.expiryDate) {
        evs.push({
          id: `war-${w.id}`,
          title: w.productName,
          date: w.expiryDate,
          type: "warranty",
          categoryLabel: "Warranty",
          details: `Warranty · ${w.seller || "Active"}`,
          link: "/assets/warranties",
        });
      }
    });

    // 4. Vehicles Next Fitness Renewal
    vehicles.forEach((v) => {
      const hasReminder = Boolean(v.notes && /\[Reminder:[^\]]+\]/i.test(v.notes));
      if (v.fitnessExpiry && hasReminder) {
        evs.push({
          id: `veh-${v.id}`,
          title: `${v.name} - Fitness Renewal`,
          date: v.fitnessExpiry,
          type: "vehicle",
          categoryLabel: "Vehicle",
          details: `${v.brand} ${v.model} (${v.registrationNumber || "Vehicle"})`,
          link: "/assets/vehicles",
        });
      }
    });

    // Sort chronologically ascending
    evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return evs;
  }, [tasks, documents, warranties, vehicles]);

  // Filter schedule by timeframe and category
  const filteredSchedule = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return scheduleEvents.filter((ev) => {
      if (scheduleFilter !== "all" && ev.type !== scheduleFilter) return false;

      const evDate = new Date(ev.date).getTime();
      const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24));

      if (scheduleTimeframe === "7days" && (diffDays < -1 || diffDays > 7)) return false;
      if (scheduleTimeframe === "30days" && (diffDays < -3 || diffDays > 30)) return false;

      return true;
    });
  }, [scheduleEvents, scheduleTimeframe, scheduleFilter]);

  const getRelativeDateLabel = (dateStr: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(dateStr).getTime();
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false };
    }
    if (diffDays === 0) {
      return { label: "Today", isOverdue: false, isToday: true };
    }
    if (diffDays === 1) {
      return { label: "Tomorrow", isOverdue: false, isToday: false };
    }
    return { label: `In ${diffDays}d`, isOverdue: false, isToday: false };
  };

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto">
          <LayoutDashboard className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Dashboard Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to view the workspace overview and metrics. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 1. Dedicated Mobile Home Page (Mobile Screen) */}
      <div className="block lg:hidden">
        <MobileHomePage />
      </div>

      {/* 2. Desktop Workspace Dashboard (Desktop Screens) */}
      <div className="hidden lg:block space-y-4 w-full">
      {/* Top Bar Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Overview
          </h1>
          <p className="text-xs text-slate-500">
            Summary of your papers, cars & bikes, houses, and pending tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/my-life/tasks")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" /> Task
          </button>
          <button
            onClick={() => navigate("/documents/vault")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5" /> Document
          </button>
        </div>
      </div>

      {/* 6 Clean Metric Boxes with warm family & asset accents */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <div
          onClick={() => navigate("/my-life/tasks")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-indigo-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
            Tasks to Do
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {pendingTasks.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tasks.length - pendingTasks.length} finished
          </div>
        </div>

        <div
          onClick={() => navigate("/documents/vault")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-amber-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition-colors">
            Expiring Papers
          </div>
          <div className={`mt-1 text-2xl font-bold tracking-tight ${expiringDocs.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {expiringDocs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">within 30 days</div>
        </div>

        <div
          onClick={() => navigate("/assets/vehicles")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-blue-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
            Cars & Bikes
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {vehicles.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">cars & motorbikes</div>
        </div>

        <div
          onClick={() => navigate("/rentals/properties")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-purple-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-600 transition-colors">
            Houses & Flats
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {properties.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {properties.reduce((a, b) => a + (b.unitsCount || 0), 0)} rented units
          </div>
        </div>

        <div
          onClick={() => navigate("/assets/warranties")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-teal-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-teal-600 transition-colors">
            Warranty Cards
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {warranties.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {expiringWarranties.length} expiring soon
          </div>
        </div>

        <div
          onClick={() => navigate("/family/profiles")}
          className="group cursor-pointer rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
            Family Members
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-indigo-950">
            {familyMembers.length}
          </div>
          <div className="text-[11px] text-indigo-600/80 mt-0.5">members added</div>
        </div>
      </div>
    </div>

      {/* Main Dual Panels (Things to Do checklist & Deadlines Timeline - Active on both Mobile and Desktop) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
        {/* Panel 1: Active To-Do Checklist */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Things to Do ({pendingTasks.length})
              </span>
            </div>
            <button
              onClick={() => navigate("/my-life/tasks")}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium inline-flex items-center gap-1"
            >
              All tasks <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No pending tasks. Click "+ Task" to add a reminder.
              </div>
            ) : (
              pendingTasks.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2.5 px-1 text-xs hover:bg-slate-50/80 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="text-slate-400 hover:text-slate-700 shrink-0"
                    >
                      <Circle className="h-4 w-4" />
                    </button>
                    <span className="font-medium text-slate-800 truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-400">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        task.priority === "Urgent"
                          ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                          : task.priority === "High"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-slate-50 text-slate-600 border border-slate-200/60"
                      }`}
                    >
                      {task.priority}
                    </span>
                    {task.dueDate && <span>{task.dueDate}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Upcoming Schedule & Deadlines Timeline */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Schedule & Deadlines ({filteredSchedule.length})
              </span>
            </div>

            {/* Timeframe Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setScheduleTimeframe("7days")}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  scheduleTimeframe === "7days"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setScheduleTimeframe("30days")}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  scheduleTimeframe === "30days"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setScheduleTimeframe("all")}
                className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                  scheduleTimeframe === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar border-b border-slate-100/70 text-[11px]">
            {[
              { id: "all", label: "All Types" },
              { id: "task", label: "Tasks" },
              { id: "document", label: "Documents" },
              { id: "vehicle", label: "Vehicles" },
              { id: "warranty", label: "Warranties" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setScheduleFilter(cat.id as any)}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition cursor-pointer ${
                  scheduleFilter === cat.id
                    ? "bg-slate-900 text-white font-medium"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chronological Event Rows */}
          <div className="mt-2 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[340px]">
            {filteredSchedule.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No scheduled events or deadlines in this window.
              </div>
            ) : (
              filteredSchedule.map((ev) => {
                const rel = getRelativeDateLabel(ev.date);
                const isTask = ev.type === "task";
                const isDoc = ev.type === "document";
                const isVeh = ev.type === "vehicle";

                return (
                  <div
                    key={ev.id}
                    onClick={() => navigate(ev.link)}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Event Type Icon */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                          isTask
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : isDoc
                              ? "bg-sky-50 text-sky-600 border-sky-100"
                              : isVeh
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-purple-50 text-purple-600 border-purple-100"
                        }`}
                      >
                        {isTask && <CheckSquare className="h-3.5 w-3.5" />}
                        {isDoc && <FileText className="h-3.5 w-3.5" />}
                        {isVeh && <Car className="h-3.5 w-3.5" />}
                        {!isTask && !isDoc && !isVeh && <ShieldAlert className="h-3.5 w-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate group-hover:text-slate-950 text-xs">
                          {ev.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {ev.details}
                        </div>
                      </div>
                    </div>

                    {/* Date & Relative Tag */}
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          rel.isOverdue
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : rel.isToday
                              ? "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold"
                              : "bg-slate-100 text-slate-600 border border-slate-200/80"
                        }`}
                      >
                        {rel.label}
                      </span>
                      <span className="text-slate-400 text-[10px] hidden sm:inline">
                        {ev.date}
                        {ev.time ? ` ${ev.time}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
