import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Calendar,
  Trash2,
  Repeat,
  MessageSquare,
  LayoutGrid,
  List,
  Search,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Car,
  Building,
  Send,
} from "lucide-react";
import {
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  listTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} from "../services/taskService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import { listFamilyMembers } from "../services/familyService";
import type {
  TaskItem,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
  Vehicle,
  Property,
  FamilyMember,
} from "../types";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";
import {
  dispatchTaskReminderNow,
  checkAndDispatchDueReminders,
} from "../services/reminderDaemon";

const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];
const recurrences: TaskRecurrence[] = [
  "None",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

// Jira priority colors & icons
function getPriorityBadgeStyle(priority: TaskPriority) {
  switch (priority) {
    case "Urgent":
      return "bg-rose-50 text-rose-700 border border-rose-300 font-bold";
    case "High":
      return "bg-orange-50 text-orange-700 border border-orange-300 font-semibold";
    case "Medium":
      return "bg-amber-50 text-amber-800 border border-amber-300 font-semibold";
    case "Low":
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200/80 font-medium";
  }
}

// Due date urgency helper
function getDueDateStyle(dueDateStr?: string) {
  if (!dueDateStr) return null;
  const target = new Date(dueDateStr);
  const now = new Date();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)}d`,
      className: "bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs animate-pulse",
      isUrgent: true,
    };
  }
  if (diffDays === 0) {
    return {
      label: "Due Today",
      className: "bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs",
      isUrgent: true,
    };
  }
  if (diffDays <= 2) {
    return {
      label: `Due in ${diffDays}d`,
      className: "bg-rose-50 text-rose-700 border border-rose-300 font-bold px-1.5 py-0.5 rounded",
      isUrgent: true,
    };
  }
  if (diffDays <= 7) {
    return {
      label: `Due in ${diffDays}d`,
      className: "bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-1.5 py-0.5 rounded",
      isUrgent: false,
    };
  }
  return {
    label: dueDateStr,
    className: "text-slate-500 font-mono",
    isUrgent: false,
  };
}

export function formatTime12h(timeStr?: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1];
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${mm} ${ampm}`;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Jira View Mode: Board (Kanban) or List (Backlog)
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterAssignee, setFilterAssignee] = useState<string>("All");
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  // Modals & form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [defaultAddStatus, setDefaultAddStatus] = useState<TaskStatus>("Pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [taskRecipients, setTaskRecipients] = useState<string[]>(["Personal"]);

  // Modal Date, Time & Minute-wise Reminder Lead state
  const [modalDueDate, setModalDueDate] = useState("");
  const [modalDueTime, setModalDueTime] = useState("");
  const [modalReminderLead, setModalReminderLead] = useState("15 minutes before");
  const [modalCustomLeadMinutes, setModalCustomLeadMinutes] = useState(15);
  const [modalCustomLeadUnit, setModalCustomLeadUnit] = useState<"minutes" | "hours" | "days">("minutes");

  const reminderPreviewText = useMemo(() => {
    if (!modalDueDate) return null;
    const baseDate = new Date(modalDueDate);
    if (modalDueTime) {
      const [hh, mm] = modalDueTime.split(":").map(Number);
      baseDate.setHours(hh, mm, 0, 0);
    } else {
      baseDate.setHours(9, 0, 0, 0);
    }

    if (isNaN(baseDate.getTime())) return null;

    const triggerDate = new Date(baseDate);

    if (modalReminderLead === "custom") {
      const val = Number(modalCustomLeadMinutes) || 0;
      if (modalCustomLeadUnit === "minutes") {
        triggerDate.setMinutes(triggerDate.getMinutes() - val);
      } else if (modalCustomLeadUnit === "hours") {
        triggerDate.setHours(triggerDate.getHours() - val);
      } else {
        triggerDate.setDate(triggerDate.getDate() - val);
      }
    } else if (modalReminderLead === "At due time") {
      // 0 min
    } else if (modalReminderLead === "5 minutes before") {
      triggerDate.setMinutes(triggerDate.getMinutes() - 5);
    } else if (modalReminderLead === "10 minutes before") {
      triggerDate.setMinutes(triggerDate.getMinutes() - 10);
    } else if (modalReminderLead === "15 minutes before") {
      triggerDate.setMinutes(triggerDate.getMinutes() - 15);
    } else if (modalReminderLead === "30 minutes before") {
      triggerDate.setMinutes(triggerDate.getMinutes() - 30);
    } else if (modalReminderLead === "45 minutes before") {
      triggerDate.setMinutes(triggerDate.getMinutes() - 45);
    } else if (modalReminderLead === "1 hour before") {
      triggerDate.setHours(triggerDate.getHours() - 1);
    } else if (modalReminderLead === "2 hours before") {
      triggerDate.setHours(triggerDate.getHours() - 2);
    } else if (modalReminderLead === "1 day before") {
      triggerDate.setDate(triggerDate.getDate() - 1);
    } else if (modalReminderLead === "2 days before") {
      triggerDate.setDate(triggerDate.getDate() - 2);
    }

    const timeStr = triggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = triggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [modalDueDate, modalDueTime, modalReminderLead, modalCustomLeadMinutes, modalCustomLeadUnit]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [t, v, p, m] = await Promise.all([
        listTasks(),
        listVehicles(),
        listProperties(),
        listFamilyMembers(),
      ]);
      setTasks(t);
      setVehicles(v);
      setProperties(p);
      setMembers(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    const formElement = e.currentTarget;
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const isReminder = Boolean(form.get("reminderWhatsapp"));
      const rawLead = modalReminderLead === "custom"
        ? `${modalCustomLeadMinutes} ${modalCustomLeadUnit} before`
        : modalReminderLead;
      const dueDate = modalDueDate || String(form.get("dueDate") || "");
      const dueTime = modalDueTime || String(form.get("dueTime") || "");
      const timeNote = dueTime ? `, Due Time: ${formatTime12h(dueTime)}` : "";
      const rec = taskRecipients.length > 0 ? `, Recipients: ${taskRecipients.join(", ")}` : "";
      const reminderNote = isReminder ? ` [Reminder: ${rawLead}${timeNote}${rec}]` : "";

      const newTask = await createTask({
        title: String(form.get("title")),
        description: String(form.get("description") || ""),
        priority: String(form.get("priority")) as TaskPriority,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        category: String(form.get("category") || "General"),
        recurrence: String(form.get("recurrence")) as TaskRecurrence,
        familyMemberId: String(form.get("familyMemberId") || "") || undefined,
        vehicleId: String(form.get("vehicleId") || "") || undefined,
        propertyId: String(form.get("propertyId") || "") || undefined,
        status: (String(form.get("status")) as TaskStatus) || defaultAddStatus || "Pending",
        reminderWhatsapp: isReminder,
        notes: `${String(form.get("notes") || "")}${reminderNote}`.trim(),
      });

      setTasks((prev) => [newTask, ...prev]);
      formElement?.reset?.();
      setModalDueDate("");
      setModalDueTime("");
      setModalReminderLead("15 minutes before");
      setModalCustomLeadMinutes(15);
      setModalCustomLeadUnit("minutes");
      setIsAddOpen(false);

      // Trigger reminder scanner immediately in case task is due now
      checkAndDispatchDueReminders().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);
  const [sendSuccessId, setSendSuccessId] = useState<string | null>(null);

  const handleSendTaskWhatsApp = async (task: TaskItem) => {
    setSendingTaskId(task.id);
    try {
      const res = await dispatchTaskReminderNow(task);
      if (res.success) {
        setSendSuccessId(task.id);
        setTimeout(() => setSendSuccessId(null), 3000);
      } else {
        alert(res.error || "WhatsApp gateway could not deliver alert. Check connection.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to dispatch WhatsApp alert");
    } finally {
      setSendingTaskId(null);
    }
  };

  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(task.id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const openAddWithStatus = (status: TaskStatus) => {
    setDefaultAddStatus(status);
    setIsAddOpen(true);
  };

  // Filter tasks based on search, priority, assignee, and flags
  const filteredTasks = tasks.filter((task) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        task.title.toLowerCase().includes(q) ||
        (task.description || "").toLowerCase().includes(q) ||
        (task.category || "").toLowerCase().includes(q) ||
        (task.familyMemberName || "").toLowerCase().includes(q) ||
        (task.vehicleName || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterPriority !== "All" && task.priority !== filterPriority) {
      return false;
    }

    if (filterAssignee !== "All") {
      if (filterAssignee === "Personal" && task.familyMemberId) return false;
      if (filterAssignee !== "Personal" && task.familyMemberId !== filterAssignee) return false;
    }

    if (onlyUrgent && task.priority !== "Urgent" && task.priority !== "High") {
      return false;
    }

    return true;
  });

  // Kanban Column buckets
  const todoTasks = filteredTasks.filter(
    (t) => t.status === "Pending" || !t.status || t.status === "Cancelled",
  );
  const inProgressTasks = filteredTasks.filter((t) => t.status === "In Progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "Completed");

  // Sprint Progress %
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4 w-full">
      {/* Jira Board Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Personal OS • Kanban
            </span>
            <span className="text-xs text-slate-400 font-mono">LN-BOARD</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1 font-display">
            Tasks & Actions
          </h1>
          <p className="text-xs text-slate-500">
            Track and resolve tasks, vehicle maintenance items, renewals, and responsibilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: Board vs List */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                viewMode === "board"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Primary Create Button */}
          <button
            type="button"
            onClick={() => openAddWithStatus("Pending")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Database Setup Banner */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Jira Control & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
          {/* Quick Search */}
          <div className="w-full sm:w-64">
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, bills, tags..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="h-4 w-4 text-slate-400" />
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: "0.75rem",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                  },
                },
              }}
            />
          </div>

          {/* Priority Filter */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              sx={{
                fontSize: "0.75rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.75rem",
                backgroundColor: "#f8fafc",
                "& .MuiSelect-select": {
                  fontSize: "0.75rem",
                  py: "8px",
                },
              }}
            >
              <MenuItem value="All" sx={{ fontSize: "0.75rem" }}>All Priorities</MenuItem>
              {priorities.map((p) => (
                <MenuItem key={p} value={p} sx={{ fontSize: "0.75rem" }}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Assignee Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              sx={{
                fontSize: "0.75rem",
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                borderRadius: "0.75rem",
                backgroundColor: "#f8fafc",
                "& .MuiSelect-select": {
                  fontSize: "0.75rem",
                  py: "8px",
                },
              }}
            >
              <MenuItem value="All" sx={{ fontSize: "0.75rem" }}>All Assignees</MenuItem>
              <MenuItem value="Personal" sx={{ fontSize: "0.75rem" }}>👤 Personal / Self</MenuItem>
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: "0.75rem" }}>
                  👤 {m.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quick Filter: Urgent Only */}
          <button
            type="button"
            onClick={() => setOnlyUrgent((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              onlyUrgent
                ? "border-rose-400 bg-rose-50 text-rose-700 shadow-2xs"
                : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span>Urgent & High</span>
          </button>
        </div>

        {/* Sprint Completion Progress Pill */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
          <div className="text-right">
            <div className="text-[11px] font-bold text-slate-700">
              Sprint Progress: <span className="text-indigo-600">{progressPercent}%</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {completedCount} of {totalCount} completed
            </div>
          </div>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: JIRA KANBAN BOARD VIEW */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading tasks...</div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* COLUMN 1: TO DO */}
          <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-100/70 p-3 shadow-2xs min-h-[580px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700">
                  To Do
                </h2>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {todoTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openAddWithStatus("Pending")}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                title="Add task to To Do"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 flex-1">
              {todoTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-slate-400 border border-dashed border-slate-300/80 rounded-xl bg-white/40">
                  <Circle className="h-6 w-6 text-slate-300 mb-1" />
                  <span>No to-do tasks</span>
                </div>
              ) : (
                todoTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onSendWhatsApp={handleSendTaskWhatsApp}
                    isSendingWA={sendingTaskId === task.id}
                    wasSentWA={sendSuccessId === task.id}
                  />
                ))
              )}
            </div>

            {/* Bottom Add Trigger */}
            <button
              type="button"
              onClick={() => openAddWithStatus("Pending")}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300/80 bg-white/60 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          {/* COLUMN 2: IN PROGRESS */}
          <div className="flex flex-col rounded-2xl border border-indigo-200/90 bg-indigo-50/40 p-3 shadow-2xs min-h-[580px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-indigo-900">
                  In Progress
                </h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                  {inProgressTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openAddWithStatus("In Progress")}
                className="rounded-lg p-1 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                title="Add task to In Progress"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 flex-1">
              {inProgressTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-indigo-400/80 border border-dashed border-indigo-200 rounded-xl bg-white/40">
                  <Clock className="h-6 w-6 text-indigo-300 mb-1" />
                  <span>No tasks in progress</span>
                </div>
              ) : (
                inProgressTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onSendWhatsApp={handleSendTaskWhatsApp}
                    isSendingWA={sendingTaskId === task.id}
                    wasSentWA={sendSuccessId === task.id}
                  />
                ))
              )}
            </div>

            {/* Bottom Add Trigger */}
            <button
              type="button"
              onClick={() => openAddWithStatus("In Progress")}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-white/70 py-2 text-xs font-semibold text-indigo-700 hover:bg-white hover:text-indigo-900 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          {/* COLUMN 3: COMPLETED */}
          <div className="flex flex-col rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-3 shadow-2xs min-h-[580px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-emerald-900">
                  Done
                </h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {doneTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openAddWithStatus("Completed")}
                className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                title="Add task to Done"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 flex-1">
              {doneTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-emerald-400/80 border border-dashed border-emerald-200 rounded-xl bg-white/40">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300 mb-1" />
                  <span>No completed tasks yet</span>
                </div>
              ) : (
                doneTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onSendWhatsApp={handleSendTaskWhatsApp}
                    isSendingWA={sendingTaskId === task.id}
                    wasSentWA={sendSuccessId === task.id}
                  />
                ))
              )}
            </div>

            {/* Bottom Add Trigger */}
            <button
              type="button"
              onClick={() => openAddWithStatus("Completed")}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-200 bg-white/70 py-2 text-xs font-semibold text-emerald-700 hover:bg-white hover:text-emerald-900 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: JIRA LIST / BACKLOG VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No tasks matching current filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-20">Key</th>
                  <th className="py-3 px-3">Summary</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Assignee</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTasks.map((task, idx) => {
                  const dueMeta = getDueDateStyle(task.dueDate);
                  const isDone = task.status === "Completed";

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 text-[11px]">
                        LN-{String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className={isDone ? "line-through text-slate-400" : ""}>
                            {task.title}
                          </span>
                          {task.reminderWhatsapp && (
                            <button
                              type="button"
                              disabled={sendingTaskId === task.id}
                              onClick={() => handleSendTaskWhatsApp(task)}
                              title="Click to Send WhatsApp Alert Now"
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 transition cursor-pointer ${
                                sendSuccessId === task.id
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                              }`}
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>{sendingTaskId === task.id ? "..." : sendSuccessId === task.id ? "Sent!" : "WA"}</span>
                              {sendingTaskId !== task.id && sendSuccessId !== task.id && (
                                <Send className="h-2 w-2 opacity-70" />
                              )}
                            </button>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={task.status || "Pending"}
                          onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer outline-none"
                        >
                          <option value="Pending">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Done</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${getPriorityBadgeStyle(
                            task.priority,
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {task.category || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {task.familyMemberName ? (
                          <span>👤 {task.familyMemberName}</span>
                        ) : (
                          <span className="text-slate-400">Personal</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {dueMeta ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] ${dueMeta.className}`}>
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{dueMeta.label}</span>
                            </span>
                            {task.dueTime && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Clock className="h-2.5 w-2.5 text-emerald-600" />
                                <span>{formatTime12h(task.dueTime)}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE ISSUE MODAL */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/90"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Create Task
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-TASK</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  New Life Task & To-Do
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Summary / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Renew car tax token, Pay DESCO electricity bill"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Notes
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Additional context, account numbers, or steps to complete..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Initial Status
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="status"
                      defaultValue={defaultAddStatus}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      <MenuItem value="Pending" sx={{ fontSize: "0.75rem" }}>To Do</MenuItem>
                      <MenuItem value="In Progress" sx={{ fontSize: "0.75rem" }}>In Progress</MenuItem>
                      <MenuItem value="Completed" sx={{ fontSize: "0.75rem" }}>Done</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="priority"
                      defaultValue="Medium"
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      {priorities.map((p) => (
                        <MenuItem key={p} value={p} sx={{ fontSize: "0.75rem" }}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                p === "Urgent"
                                  ? "bg-rose-600 animate-pulse"
                                  : p === "High"
                                    ? "bg-orange-500"
                                    : p === "Medium"
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                              }`}
                            />
                            <span
                              className={
                                p === "Urgent"
                                  ? "text-rose-700 font-bold"
                                  : p === "High"
                                    ? "text-orange-700 font-semibold"
                                    : p === "Medium"
                                      ? "text-amber-800 font-medium"
                                      : "text-slate-700"
                              }
                            >
                              {p} Priority {p === "Urgent" ? "(Critical)" : ""}
                            </span>
                          </span>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Due Date, Due Time & Recurrence */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Due Date
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    Due Time (Hour & Min)
                  </label>
                  <input
                    name="dueTime"
                    type="time"
                    value={modalDueTime}
                    onChange={(e) => setModalDueTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5 text-slate-400" />
                    Recurrence
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="recurrence"
                      defaultValue="None"
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      {recurrences.map((r) => (
                        <MenuItem key={r} value={r} sx={{ fontSize: "0.75rem" }}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Category & Assignee */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <input
                    name="category"
                    defaultValue="General"
                    placeholder="e.g. Bills, Vehicle, Family"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assignee (Family Member)
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="familyMemberId"
                      defaultValue=""
                      displayEmpty
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.75rem" }}>Personal / Self</MenuItem>
                      {members.map((m) => (
                        <MenuItem key={m.id} value={m.id} sx={{ fontSize: "0.75rem" }}>
                          👤 {m.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* Linked Records (Optional) */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Link Vehicle (Optional)
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="vehicleId"
                      defaultValue=""
                      displayEmpty
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.75rem" }}>None</MenuItem>
                      {vehicles.map((v) => (
                        <MenuItem key={v.id} value={v.id} sx={{ fontSize: "0.75rem" }}>
                          🚗 {v.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Link Property (Optional)
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="propertyId"
                      defaultValue=""
                      displayEmpty
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": {
                          fontSize: "0.75rem",
                          py: "8px",
                        },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.75rem" }}>None</MenuItem>
                      {properties.map((p) => (
                        <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.75rem" }}>
                          🏢 {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </div>

              {/* WhatsApp Alert Checkbox & Lead Time */}
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reminderWhatsapp"
                      name="reminderWhatsapp"
                      defaultChecked
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="reminderWhatsapp" className="text-xs font-bold text-emerald-950 cursor-pointer">
                      Send WhatsApp reminder for this task
                    </label>
                  </div>
                  {modalDueTime && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-white/80 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      ⏰ Due: {formatTime12h(modalDueTime)}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pl-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 shrink-0">
                      Remind Lead:
                    </span>
                    <select
                      name="taskReminderLead"
                      value={modalReminderLead}
                      onChange={(e) => setModalReminderLead(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                    >
                      <option value="At due time">At exact due time (0 min)</option>
                      <option value="5 minutes before">5 minutes before</option>
                      <option value="10 minutes before">10 minutes before</option>
                      <option value="15 minutes before">15 minutes before (Recommended)</option>
                      <option value="30 minutes before">30 minutes before</option>
                      <option value="45 minutes before">45 minutes before</option>
                      <option value="1 hour before">1 hour before</option>
                      <option value="2 hours before">2 hours before</option>
                      <option value="1 day before">1 day before (Morning)</option>
                      <option value="2 days before">2 days before</option>
                      <option value="custom">Custom Minutes / Hours...</option>
                    </select>

                    {modalReminderLead === "custom" && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          name="customReminderMinutes"
                          value={modalCustomLeadMinutes}
                          onChange={(e) => setModalCustomLeadMinutes(Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 font-mono text-center outline-none focus:border-emerald-600"
                        />
                        <select
                          name="customReminderUnit"
                          value={modalCustomLeadUnit}
                          onChange={(e) => setModalCustomLeadUnit(e.target.value as any)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="minutes">Minutes before</option>
                          <option value="hours">Hours before</option>
                          <option value="days">Days before</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Trigger preview indicator */}
                  {reminderPreviewText && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/90 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{reminderPreviewText}</span>
                    </div>
                  )}

                  <ItemRecipientSelector
                    selectedRecipients={taskRecipients}
                    onChange={setTaskRecipients}
                    label="Send Task Alert To:"
                    helperText="Pick which number alias(es) will receive the task reminder."
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// JIRA KANBAN ISSUE CARD COMPONENT
interface TaskCardProps {
  task: TaskItem;
  index: number;
  onStatusChange: (task: TaskItem, newStatus: TaskStatus) => void;
  onDelete: (id: string) => void;
  onSendWhatsApp?: (task: TaskItem) => void;
  isSendingWA?: boolean;
  wasSentWA?: boolean;
}

function TaskCard({
  task,
  index,
  onStatusChange,
  onDelete,
  onSendWhatsApp,
  isSendingWA,
  wasSentWA,
}: TaskCardProps) {
  const dueMeta = getDueDateStyle(task.dueDate);
  const isDone = task.status === "Completed";

  return (
    <div className="group rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition space-y-2.5">
      {/* Top Tag Row: Key + Priority + Category */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
            LN-{String(index + 1).padStart(2, "0")}
          </span>

          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${getPriorityBadgeStyle(
              task.priority,
            )}`}
          >
            {task.priority}
          </span>

          {task.category && (
            <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/60">
              {task.category}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
          title="Delete task"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Title & Description */}
      <div>
        <h3
          className={`text-xs font-bold leading-snug ${
            isDone ? "text-slate-400 line-through" : "text-slate-900"
          }`}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Linked Entity pills */}
      {(task.vehicleName || task.propertyName || task.recurrence !== "None" || task.reminderWhatsapp) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {task.vehicleName && (
            <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 px-1.5 py-0.5 font-medium flex items-center gap-1">
              <Car className="h-3 w-3" /> {task.vehicleName}
            </span>
          )}
          {task.propertyName && (
            <span className="rounded-md bg-purple-50 text-purple-800 border border-purple-200/60 px-1.5 py-0.5 font-medium flex items-center gap-1">
              <Building className="h-3 w-3" /> {task.propertyName}
            </span>
          )}
          {task.recurrence && task.recurrence !== "None" && (
            <span className="rounded-md bg-purple-50 text-purple-700 px-1.5 py-0.5 font-medium flex items-center gap-0.5">
              <Repeat className="h-2.5 w-2.5" /> {task.recurrence}
            </span>
          )}
          {task.reminderWhatsapp && (
            <button
              type="button"
              disabled={isSendingWA}
              onClick={(e) => {
                e.stopPropagation();
                onSendWhatsApp?.(task);
              }}
              title="Click to Send WhatsApp Alert Now"
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                wasSentWA
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/70"
              }`}
            >
              <MessageSquare className="h-2.5 w-2.5 text-current" />
              <span>{isSendingWA ? "Sending..." : wasSentWA ? "Sent!" : "WA Alert"}</span>
              {!isSendingWA && !wasSentWA && <Send className="h-2 w-2 opacity-70" />}
            </button>
          )}
        </div>
      )}

      {/* Footer: Due date + Assignee + Transition Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {/* Due date & time */}
          {dueMeta ? (
            <span className={`inline-flex items-center gap-1.5 text-[11px] ${dueMeta.className}`}>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{dueMeta.label}</span>
              </span>
              {task.dueTime && (
                <span className="inline-flex items-center gap-0.5 opacity-90 font-medium">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <span>{formatTime12h(task.dueTime)}</span>
                </span>
              )}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">No date</span>
          )}

          {/* Assignee Avatar */}
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
            title={task.familyMemberName || "Personal / Self"}
          >
            {task.familyMemberName ? task.familyMemberName.charAt(0) : "S"}
          </span>
        </div>

        {/* Jira-Style 1-Click Status Transitions */}
        <div className="flex items-center gap-1">
          {task.status === "Pending" && (
            <button
              type="button"
              onClick={() => onStatusChange(task, "In Progress")}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              title="Start Progress"
            >
              <span>Start</span>
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}

          {task.status === "In Progress" && (
            <button
              type="button"
              onClick={() => onStatusChange(task, "Completed")}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
              title="Mark Complete"
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>Done</span>
            </button>
          )}

          {task.status === "Completed" && (
            <button
              type="button"
              onClick={() => onStatusChange(task, "Pending")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Reopen Task"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
