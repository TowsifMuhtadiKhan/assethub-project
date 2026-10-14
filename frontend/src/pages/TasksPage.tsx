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
  Search,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Car,
  Building,
  Send,
  Edit2,
  X,
  XCircle,
  Filter,
  CheckSquare,
} from "lucide-react";
import {
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import {
  listTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  cleanExpiredCancelledTasks,
} from "../services/taskService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import { listFamilyMembers, getCurrentUserAccess } from "../services/familyService";
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
  parseLeadMinutes,
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

// Jira card left-border priority accent
function getPriorityCardBorder(priority: TaskPriority) {
  switch (priority) {
    case "Urgent":
      return "border-l-4 border-l-rose-500 hover:border-l-rose-600";
    case "High":
      return "border-l-4 border-l-orange-500 hover:border-l-orange-600";
    case "Medium":
      return "border-l-4 border-l-amber-400 hover:border-l-amber-500";
    case "Low":
    default:
      return "border-l-4 border-l-sky-500 hover:border-l-sky-600";
  }
}

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

export function getCancelledCountdown(task: TaskItem): string {
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const refTime = task.cancelledAt
    ? new Date(task.cancelledAt).getTime()
    : task.updatedAt
    ? new Date(task.updatedAt).getTime()
    : task.completedAt
    ? new Date(task.completedAt).getTime()
    : task.createdAt
    ? new Date(task.createdAt).getTime()
    : Date.now();
  const remaining = THREE_DAYS_MS - (Date.now() - refTime);
  if (remaining <= 0) return "Auto-deleting now";
  const hours = Math.max(1, Math.floor(remaining / (1000 * 60 * 60)));
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `Deletes in ${days}d`;
  }
  return `Deletes in ${hours}h`;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // Drag and Drop State
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterAssignee, setFilterAssignee] = useState<string>("All");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskStatus>("Pending");

  const activeFilterCount =
    (filterPriority !== "All" ? 1 : 0) +
    (filterAssignee !== "All" ? 1 : 0) +
    (onlyUrgent ? 1 : 0);

  // Modals & form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"general" | "advanced">("general");
  const [editModalTab, setEditModalTab] = useState<"general" | "advanced">("general");
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

  // Edit & Details Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("Medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>("None");
  const [editFamilyMemberId, setEditFamilyMemberId] = useState("");
  const [editVehicleId, setEditVehicleId] = useState("");
  const [editPropertyId, setEditPropertyId] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("Pending");
  const [editReminderWhatsapp, setEditReminderWhatsapp] = useState(true);
  const [editReminderLead, setEditReminderLead] = useState("15 minutes before");
  const [editCustomLeadMinutes, setEditCustomLeadMinutes] = useState(15);
  const [editCustomLeadUnit, setEditCustomLeadUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [editRecipients, setEditRecipients] = useState<string[]>(["Personal"]);
  const [isUpdating, setIsUpdating] = useState(false);

  const openTaskDetails = (task: TaskItem) => {
    setSelectedTask(task);
    setEditModalTab("general");
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "Medium");
    setEditDueDate(task.dueDate || "");
    setEditDueTime(task.dueTime || "");
    setEditCategory(task.category || "General");
    setEditRecurrence(task.recurrence || "None");
    setEditFamilyMemberId(task.familyMemberId || "");
    setEditVehicleId(task.vehicleId || "");
    setEditPropertyId(task.propertyId || "");
    setEditStatus(task.status || "Pending");
    setEditReminderWhatsapp(task.reminderWhatsapp ?? true);

    const minutes = parseLeadMinutes(task.notes);
    if (minutes === 0) setEditReminderLead("At due time");
    else if (minutes === 5) setEditReminderLead("5 minutes before");
    else if (minutes === 10) setEditReminderLead("10 minutes before");
    else if (minutes === 15) setEditReminderLead("15 minutes before");
    else if (minutes === 30) setEditReminderLead("30 minutes before");
    else if (minutes === 45) setEditReminderLead("45 minutes before");
    else if (minutes === 60) setEditReminderLead("1 hour before");
    else if (minutes === 120) setEditReminderLead("2 hours before");
    else if (minutes === 1440) setEditReminderLead("1 day before");
    else if (minutes === 2880) setEditReminderLead("2 days before");
    else {
      setEditReminderLead("custom");
      setEditCustomLeadMinutes(minutes);
      setEditCustomLeadUnit("minutes");
    }

    const recMatch = task.notes?.match(/Recipients:\s*([^\]\n]+)/i);
    if (recMatch) {
      const parsed = recMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      setEditRecipients(parsed.length > 0 ? parsed : ["Personal"]);
    } else {
      setEditRecipients(["Personal"]);
    }
  };

  const editReminderPreviewText = useMemo(() => {
    if (!editDueDate) return null;
    const baseDate = new Date(editDueDate);
    if (editDueTime) {
      const [hh, mm] = editDueTime.split(":").map(Number);
      baseDate.setHours(hh, mm, 0, 0);
    } else {
      baseDate.setHours(9, 0, 0, 0);
    }
    if (isNaN(baseDate.getTime())) return null;

    const triggerDate = new Date(baseDate);
    if (editReminderLead === "custom") {
      const val = Number(editCustomLeadMinutes) || 0;
      if (editCustomLeadUnit === "minutes") triggerDate.setMinutes(triggerDate.getMinutes() - val);
      else if (editCustomLeadUnit === "hours") triggerDate.setHours(triggerDate.getHours() - val);
      else triggerDate.setDate(triggerDate.getDate() - val);
    } else if (editReminderLead === "At due time") {
      // 0 min
    } else if (editReminderLead === "5 minutes before") triggerDate.setMinutes(triggerDate.getMinutes() - 5);
    else if (editReminderLead === "10 minutes before") triggerDate.setMinutes(triggerDate.getMinutes() - 10);
    else if (editReminderLead === "15 minutes before") triggerDate.setMinutes(triggerDate.getMinutes() - 15);
    else if (editReminderLead === "30 minutes before") triggerDate.setMinutes(triggerDate.getMinutes() - 30);
    else if (editReminderLead === "45 minutes before") triggerDate.setMinutes(triggerDate.getMinutes() - 45);
    else if (editReminderLead === "1 hour before") triggerDate.setHours(triggerDate.getHours() - 1);
    else if (editReminderLead === "2 hours before") triggerDate.setHours(triggerDate.getHours() - 2);
    else if (editReminderLead === "1 day before") triggerDate.setDate(triggerDate.getDate() - 1);
    else if (editReminderLead === "2 days before") triggerDate.setDate(triggerDate.getDate() - 2);

    const timeStr = triggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = triggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [editDueDate, editDueTime, editReminderLead, editCustomLeadMinutes, editCustomLeadUnit]);

  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsUpdating(true);
    setError("");

    try {
      const rawLead = editReminderLead === "custom"
        ? `${editCustomLeadMinutes} ${editCustomLeadUnit} before`
        : editReminderLead;
      const timeNote = editDueTime ? `, Due Time: ${formatTime12h(editDueTime)}` : "";
      const rec = editRecipients.length > 0 ? `, Recipients: ${editRecipients.join(", ")}` : "";
      const reminderNote = editReminderWhatsapp ? ` [Reminder: ${rawLead}${timeNote}${rec}]` : "";

      const cleanExistingNotes = (selectedTask.notes || "").replace(/\s*\[Reminder:[^\]]+\]/gi, "").trim();
      const updatedNotes = `${cleanExistingNotes}${reminderNote}`.trim();

      const updated = await updateTask(selectedTask.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        dueDate: editDueDate || undefined,
        dueTime: editDueTime || undefined,
        category: editCategory,
        recurrence: editRecurrence,
        familyMemberId: editFamilyMemberId || undefined,
        vehicleId: editVehicleId || undefined,
        propertyId: editPropertyId || undefined,
        status: editStatus,
        reminderWhatsapp: editReminderWhatsapp,
        notes: updatedNotes,
      });

      localStorage.removeItem(`lifenest_task_dispatched_${selectedTask.id}`);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(null);

      checkAndDispatchDueReminders().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [{ isHead, access }, [t, v, p, m]] = await Promise.all([
        getCurrentUserAccess(),
        Promise.all([
          listTasks(),
          listVehicles(),
          listProperties(),
          listFamilyMembers(),
        ]),
      ]);

      if (!isHead && access.canAccessTasks === false) {
        setIsLocked(true);
      }

      const deletedIds = await cleanExpiredCancelledTasks(t);
      const activeTasks = deletedIds.length ? t.filter((item) => !deletedIds.includes(item.id)) : t;
      setTasks(activeTasks);
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
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: newStatus,
                cancelledAt: newStatus === "Cancelled" ? now : undefined,
                completedAt: newStatus === "Completed" ? now : undefined,
                updatedAt: now,
              }
            : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverColumn(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusChange(task, targetStatus);
    }
  };

  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (id: string, title?: string) => {
    const task = tasks.find((t) => t.id === id);
    setTaskToDelete({ id, title: title || task?.title || "this task" });
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null);
      }
      setTaskToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddWithStatus = (status: TaskStatus) => {
    setDefaultAddStatus(status);
    setAddModalTab("general");
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
    (t) => t.status === "Pending" || !t.status,
  );
  const inProgressTasks = filteredTasks.filter((t) => t.status === "In Progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "Completed");
  const cancelledTasks = filteredTasks.filter((t) => t.status === "Cancelled");

  // Sprint Progress %
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <CheckSquare className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">To-Do List Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You do not currently have permission to access family tasks and to-do lists. Please contact your Family Head to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 font-display truncate">
            To-Do List & Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Write down your daily tasks, bills to pay, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Create Button */}
          <button
            type="button"
            onClick={() => openAddWithStatus("Pending")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Jira Control & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto flex-1">
          {/* Quick Search + Mobile Filter Toggle Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
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

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className={`sm:hidden inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition shrink-0 ${
                mobileFiltersOpen || activeFilterCount > 0
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options - Collapsible on Mobile, always inline on Desktop */}
          <div className={`w-full sm:w-auto flex-wrap items-center gap-2.5 ${mobileFiltersOpen ? "flex" : "hidden sm:flex"}`}>
            {/* Priority Filter */}
            <FormControl size="small" sx={{ minWidth: 130 }} className="w-full sm:w-auto">
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
            <FormControl size="small" sx={{ minWidth: 150 }} className="w-full sm:w-auto">
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

      {/* 4-COLUMN KANBAN BOARD WITH DRAG & DROP (Segmented Tabs on Mobile, Full Grid on Desktop) */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading tasks...</div>
      ) : (
        <div className="w-full">
          {/* Mobile Status Segmented Tabs */}
          <div className="md:hidden flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setMobileStatusTab("Pending")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center whitespace-nowrap cursor-pointer ${
                mobileStatusTab === "Pending"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              To Do ({todoTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileStatusTab("In Progress")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center whitespace-nowrap cursor-pointer ${
                mobileStatusTab === "In Progress"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              In Progress ({inProgressTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileStatusTab("Completed")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center whitespace-nowrap cursor-pointer ${
                mobileStatusTab === "Completed"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Done ({doneTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileStatusTab("Cancelled")}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition text-center whitespace-nowrap cursor-pointer ${
                mobileStatusTab === "Cancelled"
                  ? "bg-white text-rose-700 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cancelled ({cancelledTasks.length})
            </button>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
            {/* COLUMN 1: TO DO */}
            <div
              onDragOver={(e) => handleDragOver(e, "Pending")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "Pending")}
              className={`${
                mobileStatusTab === "Pending" ? "flex" : "hidden md:flex"
              } flex-col w-full rounded-2xl border transition-all p-3 shadow-2xs min-h-[350px] md:min-h-[580px] ${
                dragOverColumn === "Pending"
                  ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-300"
                  : "border-slate-200/90 bg-slate-100/70"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <h2 className="text-xs font-semibold text-slate-700">
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
                    <span className="text-[10px] text-slate-400/80 mt-0.5">Click + to add a task</span>
                  </div>
                ) : (
                  todoTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onSelect={openTaskDetails}
                      onSendWhatsApp={handleSendTaskWhatsApp}
                      isSendingWA={sendingTaskId === task.id}
                      wasSentWA={sendSuccessId === task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div
              onDragOver={(e) => handleDragOver(e, "In Progress")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "In Progress")}
              className={`${
                mobileStatusTab === "In Progress" ? "flex" : "hidden md:flex"
              } flex-col w-full rounded-2xl border transition-all p-3 shadow-2xs min-h-[350px] md:min-h-[580px] ${
                dragOverColumn === "In Progress"
                  ? "border-indigo-500 bg-indigo-100/70 ring-2 ring-indigo-400"
                  : "border-indigo-200/90 bg-indigo-50/40"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <h2 className="text-xs font-semibold text-indigo-900">
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
                    <span className="text-[10px] text-indigo-400/70 mt-0.5">Tasks currently being worked on</span>
                  </div>
                ) : (
                  inProgressTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onSelect={openTaskDetails}
                      onSendWhatsApp={handleSendTaskWhatsApp}
                      isSendingWA={sendingTaskId === task.id}
                      wasSentWA={sendSuccessId === task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: DONE */}
            <div
              onDragOver={(e) => handleDragOver(e, "Completed")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "Completed")}
              className={`${
                mobileStatusTab === "Completed" ? "flex" : "hidden md:flex"
              } flex-col w-full rounded-2xl border transition-all p-3 shadow-2xs min-h-[350px] md:min-h-[580px] ${
                dragOverColumn === "Completed"
                  ? "border-emerald-400 bg-emerald-100/70 ring-2 ring-emerald-300"
                  : "border-emerald-200/90 bg-emerald-50/40"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-semibold text-emerald-900">
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
                    <span className="text-[10px] text-emerald-400/70 mt-0.5">Finished tasks appear here</span>
                  </div>
                ) : (
                  doneTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onSelect={openTaskDetails}
                      onSendWhatsApp={handleSendTaskWhatsApp}
                      isSendingWA={sendingTaskId === task.id}
                      wasSentWA={sendSuccessId === task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 4: CANCELLED */}
            <div
              onDragOver={(e) => handleDragOver(e, "Cancelled")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "Cancelled")}
              className={`${
                mobileStatusTab === "Cancelled" ? "flex" : "hidden md:flex"
              } flex-col w-full rounded-2xl border transition-all p-3 shadow-2xs min-h-[350px] md:min-h-[580px] ${
                dragOverColumn === "Cancelled"
                  ? "border-rose-400 bg-rose-100/70 ring-2 ring-rose-400"
                  : "border-rose-200/80 bg-rose-50/30"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <h2 className="text-xs font-semibold text-rose-900">
                      Cancelled
                    </h2>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      {cancelledTasks.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-600/80 font-medium mt-0.5">
                    Auto-purges after 3 days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAddWithStatus("Cancelled")}
                  className="rounded-lg p-1 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  title="Add task directly to Cancelled"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1">
                {cancelledTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-rose-400/80 border border-dashed border-rose-200 rounded-xl bg-white/40">
                    <XCircle className="h-6 w-6 text-rose-300 mb-1" />
                    <span>No cancelled tasks</span>
                    <span className="text-[10px] text-rose-400/70 mt-0.5">Cancelled tasks appear here</span>
                  </div>
                ) : (
                  cancelledTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onSelect={openTaskDetails}
                      onSendWhatsApp={handleSendTaskWhatsApp}
                      isSendingWA={sendingTaskId === task.id}
                      wasSentWA={sendSuccessId === task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
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
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                New Task
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: General vs Advanced */}
            <div className="flex border-b border-slate-200/90 px-6 bg-white">
              <button
                type="button"
                onClick={() => setAddModalTab("general")}
                className={`py-2.5 text-xs font-semibold border-b-2 mr-6 transition cursor-pointer flex items-center gap-1.5 ${
                  addModalTab === "general"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>General Info</span>
              </button>
              <button
                type="button"
                onClick={() => setAddModalTab("advanced")}
                className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  addModalTab === "advanced"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Advanced & Notifications</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200">
                  Optional
                </span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* TAB 1: GENERAL (Summary, Description, Priority, Due Date, Due Time, Status) */}
              <div className={addModalTab === "general" ? "space-y-4" : "hidden"}>
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

                {/* Due Date & Due Time in First Tab */}
                <div className="grid grid-cols-2 gap-3.5">
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
                </div>
              </div>

              {/* TAB 2: ADVANCED (Recurrence, Category, Assignee, Vehicle, Property, WhatsApp) */}
              <div className={addModalTab === "advanced" ? "space-y-4" : "hidden"}>
                {/* Recurrence & Category */}
                <div className="grid grid-cols-2 gap-3.5">
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
                </div>

                {/* Assignee */}
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

                {/* Simplified WhatsApp Alert Card */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="reminderWhatsapp" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="reminderWhatsapp"
                        name="reminderWhatsapp"
                        defaultChecked={false}
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-950">
                        Send WhatsApp reminder for this task
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600 font-medium">Remind:</span>
                      <select
                        name="taskReminderLead"
                        value={modalReminderLead}
                        onChange={(e) => setModalReminderLead(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium shadow-2xs"
                      >
                        <option value="At due time">At due time</option>
                        <option value="15 minutes before">15 mins before</option>
                        <option value="1 hour before">1 hour before</option>
                        <option value="1 day before">1 day before</option>
                      </select>
                    </div>
                  </div>

                  {reminderPreviewText && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/90 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{reminderPreviewText}</span>
                    </div>
                  )}

                  <ItemRecipientSelector
                    selectedRecipients={taskRecipients}
                    onChange={setTaskRecipients}
                    label="Send Alert To:"
                    helperText="Select which phone alias receives the reminder."
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  {addModalTab === "general" ? (
                    <button
                      type="button"
                      onClick={() => setAddModalTab("advanced")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Configure Advanced &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddModalTab("general")}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      &larr; Back to General
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Edit Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onMouseDown={() => setSelectedTask(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    TASK-{selectedTask.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadgeStyle(editPriority)}`}>
                    {editPriority}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    editStatus === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : editStatus === "In Progress"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {editStatus}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Task Details & Edit</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendTaskWhatsApp(selectedTask)}
                  disabled={sendingTaskId === selectedTask.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    sendSuccessId === selectedTask.id
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                  title="Send WhatsApp alert now"
                >
                  <Send className={`h-3.5 w-3.5 ${sendingTaskId === selectedTask.id ? "animate-spin" : ""}`} />
                  {sendingTaskId === selectedTask.id
                    ? "Sending..."
                    : sendSuccessId === selectedTask.id
                    ? "Alert Sent!"
                    : "WA Alert Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs: General vs Advanced */}
            <div className="flex border-b border-slate-200/90 px-6 bg-white">
              <button
                type="button"
                onClick={() => setEditModalTab("general")}
                className={`py-2.5 text-xs font-semibold border-b-2 mr-6 transition cursor-pointer flex items-center gap-1.5 ${
                  editModalTab === "general"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>General Info</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab("advanced")}
                className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  editModalTab === "advanced"
                    ? "border-slate-900 text-slate-900 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Advanced & Notifications</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200">
                  Optional
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* TAB 1: GENERAL (Title, Description, Status, Priority, Due Date, Due Time) */}
              <div className={editModalTab === "general" ? "space-y-4" : "hidden"}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Detailed instructions or context..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 resize-none"
                  />
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Status
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
                        }}
                      >
                        <MenuItem value="Pending" sx={{ fontSize: "0.75rem" }}>Pending (To Do)</MenuItem>
                        <MenuItem value="In Progress" sx={{ fontSize: "0.75rem" }}>In Progress</MenuItem>
                        <MenuItem value="Completed" sx={{ fontSize: "0.75rem" }}>Completed (Done)</MenuItem>
                        <MenuItem value="Cancelled" sx={{ fontSize: "0.75rem" }}>Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
                        }}
                      >
                        {priorities.map((p) => (
                          <MenuItem key={p} value={p} sx={{ fontSize: "0.75rem" }}>
                            {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>
                </div>

                {/* Due Date & Due Time in First Tab */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      Due Time (Hour & Min)
                    </label>
                    <input
                      type="time"
                      value={editDueTime}
                      onChange={(e) => setEditDueTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* TAB 2: ADVANCED (Recurrence, Category, Assignee, Vehicle, Property, WhatsApp) */}
              <div className={editModalTab === "advanced" ? "space-y-4" : "hidden"}>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5 text-slate-400" />
                      Recurrence
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editRecurrence}
                        onChange={(e) => setEditRecurrence(e.target.value as TaskRecurrence)}
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category
                    </label>
                    <input
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="e.g. Bills, Vehicle, Family"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assignee
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={editFamilyMemberId}
                      onChange={(e) => setEditFamilyMemberId(e.target.value)}
                      displayEmpty
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
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

                {/* Linked Records (Optional) */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Linked Vehicle
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editVehicleId}
                        onChange={(e) => setEditVehicleId(e.target.value)}
                        displayEmpty
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
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
                      Linked Property
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editPropertyId}
                        onChange={(e) => setEditPropertyId(e.target.value)}
                        displayEmpty
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { fontSize: "0.75rem", py: "8px" },
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

                {/* Simplified WhatsApp Notification Card */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="editReminderWhatsapp" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="editReminderWhatsapp"
                        checked={editReminderWhatsapp}
                        onChange={(e) => setEditReminderWhatsapp(e.target.checked)}
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-950">
                        Send WhatsApp reminder for this task
                      </span>
                    </label>

                    {editReminderWhatsapp && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 font-medium">Remind:</span>
                        <select
                          value={editReminderLead}
                          onChange={(e) => setEditReminderLead(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium shadow-2xs"
                        >
                          <option value="At due time">At due time</option>
                          <option value="15 minutes before">15 mins before</option>
                          <option value="1 hour before">1 hour before</option>
                          <option value="1 day before">1 day before</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {editReminderWhatsapp && (
                    <>
                      {editReminderPreviewText && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/90 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{editReminderPreviewText}</span>
                        </div>
                      )}

                      <ItemRecipientSelector
                        selectedRecipients={editRecipients}
                        onChange={setEditRecipients}
                        label="Send Alert To:"
                        helperText="Select which phone alias receives the reminder."
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedTask.id, selectedTask.title)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Task
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isUpdating}
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {taskToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onMouseDown={() => !isDeleting && setTaskToDelete(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Task
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete this task? This action cannot be undone and will remove any associated reminders.
                </p>
                {taskToDelete.title && (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Task
                    </span>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {taskToDelete.title}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTaskToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting..." : "Yes, Delete Task"}
              </button>
            </div>
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
  onSelect?: (task: TaskItem) => void;
  onSendWhatsApp?: (task: TaskItem) => void;
  isSendingWA?: boolean;
  wasSentWA?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

function TaskCard({
  task,
  index,
  onStatusChange,
  onDelete,
  onSelect,
  onSendWhatsApp,
  isSendingWA,
  wasSentWA,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}: TaskCardProps) {
  const dueMeta = getDueDateStyle(task.dueDate);
  const isDone = task.status === "Completed";
  const isCancelled = task.status === "Cancelled";
  const cancelledCountdown = isCancelled ? getCancelledCountdown(task) : null;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onSelect?.(task)}
      className={`group rounded-xl border bg-white p-3 shadow-2xs hover:shadow-xs transition space-y-2.5 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "opacity-40 border-dashed border-indigo-400 scale-[0.98]"
          : isCancelled
          ? "border-rose-200/90 bg-rose-50/20 border-l-4 border-l-rose-400"
          : `border-slate-200/90 hover:border-slate-300 ${getPriorityCardBorder(task.priority)}`
      }`}
    >
      {/* Top Tag Row: Key + Category */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
            TSK-{String(index + 1).padStart(2, "0")}
          </span>

          {task.category && (
            <span className="rounded-md bg-slate-100/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/70">
              {task.category}
            </span>
          )}

          {/* Auto-delete countdown for Cancelled tasks */}
          {cancelledCountdown && (
            <span
              className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold border border-rose-200 flex items-center gap-1"
              title="This task will be automatically deleted when timer expires"
            >
              <Clock className="h-2.5 w-2.5 text-rose-600" />
              {cancelledCountdown}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(task);
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 rounded transition cursor-pointer"
            title="Edit task details"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
            title="Delete task immediately"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <h3
          className={`text-xs font-bold leading-snug ${
            isDone || isCancelled ? "text-slate-400 line-through" : "text-slate-900"
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

      {/* Footer: Due date + Assignee + Transition Buttons */}
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

        {/* 1-Click Status Transitions (Great for Mobile Touch!) */}
        <div className="flex items-center gap-1">
          {task.status === "Pending" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, "In Progress");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                title="Start Progress"
              >
                <span>Start</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, "Cancelled");
                }}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
                title="Cancel Task (auto-deletes in 3 days)"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </>
          )}

          {task.status === "In Progress" && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, "Completed");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                title="Mark Complete"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task, "Cancelled");
                }}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
                title="Cancel Task"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </>
          )}

          {task.status === "Completed" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task, "Pending");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Reopen Task"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reopen</span>
            </button>
          )}

          {task.status === "Cancelled" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task, "Pending");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              title="Restore Task to To Do"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Restore</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
