import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
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
import { listFamilyMembers, getCurrentUserAccess, type CurrentUserAccessResult } from "../services/familyService";
import { BrandLogoLoader } from "../components/common/LoadingStates";
import { UiPageHeader } from "../components/design-system";
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
  parseLeadMinutes,
  parseTimeString,
  computeReminderDateISO,
  computeExactReminderDateISO,
  extractTaskTriggerTime,
  buildTaskWhatsAppMessage,
  resolveTaskRecipientNumbers,
} from "../services/reminderDaemon";

export function toLocalDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toLocalTimeInputValue(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function getRelativeTriggerBadge(triggerDate: Date | null): { text: string; isPast: boolean } {
  if (!triggerDate || isNaN(triggerDate.getTime())) return { text: "", isPast: false };
  const now = new Date();
  const diffMs = triggerDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { text: "Time in the past (Select a future time)", isPast: true };
  }
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) {
    return { text: `in ${diffMin} min${diffMin === 1 ? "" : "s"}`, isPast: false };
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) {
    return { text: `in ${diffHr} hr${diffHr === 1 ? "" : "s"}`, isPast: false };
  }
  const diffDay = Math.round(diffHr / 24);
  return { text: `in ${diffDay} day${diffDay === 1 ? "" : "s"}`, isPast: false };
}
import { getDirectWhatsAppUrl } from "../services/whatsappService";
import { getUserSettings } from "../services/settingsService";

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
  const [userAccess, setUserAccess] = useState<CurrentUserAccessResult | null>(null);
  const [taskRecipients, setTaskRecipients] = useState<string[]>(["Personal"]);
  const [modalReminderWhatsapp, setModalReminderWhatsapp] = useState(true);

  // Modal Date, Time & Minute-wise Reminder Lead state
  const [modalDueDate, setModalDueDate] = useState("");
  const [modalDueTime, setModalDueTime] = useState("");
  const [modalReminderLead, setModalReminderLead] = useState("15 minutes before");
  const [modalCustomLeadMinutes, setModalCustomLeadMinutes] = useState(15);
  const [modalCustomLeadUnit, setModalCustomLeadUnit] = useState<"minutes" | "hours" | "days">("minutes");
  // Changeable trigger mode & direct exact date/time controls
  const [modalTriggerMode, setModalTriggerMode] = useState<"preset" | "exact">("preset");
  const [modalExactDate, setModalExactDate] = useState("");
  const [modalExactTime, setModalExactTime] = useState("");
  const [modalShowExactEditor, setModalShowExactEditor] = useState(false);

  const modalComputedTriggerDate = useMemo(() => {
    if (modalTriggerMode === "exact" && modalExactDate) {
      const parts = modalExactDate.split("-").map(Number);
      const { hours, minutes } = parseTimeString(modalExactTime || "09:00");
      const d = new Date(parts[0], parts[1] - 1, parts[2], hours, minutes, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    if (!modalDueDate) return null;
    let year = 0, month = 0, day = 0;
    if (modalDueDate.includes("-")) {
      const parts = modalDueDate.split("-").map(Number);
      if (parts.length >= 3) { year = parts[0]; month = parts[1] - 1; day = parts[2]; }
    }
    if (!year || isNaN(year)) return null;

    const { hours, minutes } = parseTimeString(modalDueTime || "09:00");
    const baseDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (isNaN(baseDate.getTime())) return null;

    let leadMinutes = 15;
    if (modalReminderLead === "custom") {
      const val = Number(modalCustomLeadMinutes) || 0;
      if (modalCustomLeadUnit === "minutes") leadMinutes = val;
      else if (modalCustomLeadUnit === "hours") leadMinutes = val * 60;
      else leadMinutes = val * 1440;
    } else {
      leadMinutes = parseLeadMinutes(modalReminderLead);
    }
    return new Date(baseDate.getTime() - leadMinutes * 60 * 1000);
  }, [modalTriggerMode, modalExactDate, modalExactTime, modalDueDate, modalDueTime, modalReminderLead, modalCustomLeadMinutes, modalCustomLeadUnit]);

  useEffect(() => {
    if (modalTriggerMode === "preset" && modalComputedTriggerDate) {
      setModalExactDate(toLocalDateInputValue(modalComputedTriggerDate));
      setModalExactTime(toLocalTimeInputValue(modalComputedTriggerDate));
    }
  }, [modalComputedTriggerDate, modalTriggerMode]);

  const reminderPreviewText = useMemo(() => {
    if (!modalComputedTriggerDate) return null;
    const timeStr = modalComputedTriggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = modalComputedTriggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [modalComputedTriggerDate]);

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
  // Changeable trigger mode & direct exact date/time controls
  const [editTriggerMode, setEditTriggerMode] = useState<"preset" | "exact">("preset");
  const [editExactDate, setEditExactDate] = useState("");
  const [editExactTime, setEditExactTime] = useState("");
  const [editShowExactEditor, setEditShowExactEditor] = useState(false);
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

    const isExact = Boolean(task.notes && /Exact at/i.test(task.notes));
    const extractedTrigger = extractTaskTriggerTime(task);
    if (extractedTrigger) {
      setEditExactDate(toLocalDateInputValue(extractedTrigger));
      setEditExactTime(toLocalTimeInputValue(extractedTrigger));
    } else {
      setEditExactDate(task.dueDate || "");
      setEditExactTime(task.dueTime || "09:00");
    }

    if (isExact) {
      setEditTriggerMode("exact");
      setEditShowExactEditor(true);
    } else {
      setEditTriggerMode("preset");
      setEditShowExactEditor(false);
    }

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

    const recMatch = task.notes?.match(/Recipients:\s*([^\s,\]\n]+)/i);
    if (recMatch) {
      const parsed = recMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      setEditRecipients(parsed.length > 0 ? parsed : ["Personal"]);
    } else {
      setEditRecipients(["Personal"]);
    }
  };

  const editComputedTriggerDate = useMemo(() => {
    if (editTriggerMode === "exact" && editExactDate) {
      const parts = editExactDate.split("-").map(Number);
      const { hours, minutes } = parseTimeString(editExactTime || "09:00");
      const d = new Date(parts[0], parts[1] - 1, parts[2], hours, minutes, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    if (!editDueDate) return null;
    let year = 0, month = 0, day = 0;
    if (editDueDate.includes("-")) {
      const parts = editDueDate.split("-").map(Number);
      if (parts.length >= 3) { year = parts[0]; month = parts[1] - 1; day = parts[2]; }
    }
    if (!year || isNaN(year)) return null;

    const { hours, minutes } = parseTimeString(editDueTime || "09:00");
    const baseDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (isNaN(baseDate.getTime())) return null;

    let leadMinutes = 15;
    if (editReminderLead === "custom") {
      const val = Number(editCustomLeadMinutes) || 0;
      if (editCustomLeadUnit === "minutes") leadMinutes = val;
      else if (editCustomLeadUnit === "hours") leadMinutes = val * 60;
      else leadMinutes = val * 1440;
    } else {
      leadMinutes = parseLeadMinutes(editReminderLead);
    }
    return new Date(baseDate.getTime() - leadMinutes * 60 * 1000);
  }, [editTriggerMode, editExactDate, editExactTime, editDueDate, editDueTime, editReminderLead, editCustomLeadMinutes, editCustomLeadUnit]);

  useEffect(() => {
    if (editTriggerMode === "preset" && editComputedTriggerDate) {
      setEditExactDate(toLocalDateInputValue(editComputedTriggerDate));
      setEditExactTime(toLocalTimeInputValue(editComputedTriggerDate));
    }
  }, [editComputedTriggerDate, editTriggerMode]);

  const editReminderPreviewText = useMemo(() => {
    if (!editComputedTriggerDate) return null;
    const timeStr = editComputedTriggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = editComputedTriggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [editComputedTriggerDate]);

  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsUpdating(true);
    setError("");

    try {
      let calculatedReminderDate: string | undefined = undefined;
      let leadDesc = editReminderLead === "custom"
        ? `${editCustomLeadMinutes} ${editCustomLeadUnit} before`
        : editReminderLead;

      if (editReminderWhatsapp) {
        if (editTriggerMode === "exact" && editExactDate && editExactTime) {
          calculatedReminderDate = computeExactReminderDateISO(editExactDate, editExactTime);
          leadDesc = `Exact at ${editExactDate} ${formatTime12h(editExactTime)}`;
        } else {
          calculatedReminderDate = computeReminderDateISO(editDueDate, editDueTime, leadDesc);
        }
      }

      const timeNote = editDueTime ? `, Due Time: ${formatTime12h(editDueTime)}` : "";
      const trigNote = calculatedReminderDate ? `, Trigger: ${calculatedReminderDate}` : "";
      const tzNote = `, TzOffset: ${new Date().getTimezoneOffset()}`;
      const rec = editRecipients.length > 0 ? `, Recipients: ${editRecipients.join(", ")}` : "";
      const reminderNote = editReminderWhatsapp ? ` [Reminder: ${leadDesc}${timeNote}${trigNote}${tzNote}${rec}]` : "";

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
        reminderDate: calculatedReminderDate,
        notes: updatedNotes,
      });

      // Clear any prior dispatch marker so updated schedule triggers
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`lifenest_task_dispatched_${selectedTask.id}`)) {
          localStorage.removeItem(key);
        }
      }
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  // Mobile Header Portal State
  const [headerPortalEl, setHeaderPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("mobile-header-right");
    if (el) {
      setHeaderPortalEl(el);
      return;
    }
    const interval = setInterval(() => {
      const found = document.getElementById("mobile-header-right");
      if (found) {
        setHeaderPortalEl(found);
        clearInterval(interval);
      }
    }, 50);
    const timeout = setTimeout(() => clearInterval(interval), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [userAcc, [t, v, p, m]] = await Promise.all([
        getCurrentUserAccess(),
        Promise.all([
          listTasks(),
          listVehicles(),
          listProperties(),
          listFamilyMembers(),
        ]),
      ]);
      setUserAccess(userAcc);

      if (!userAcc.isHead && userAcc.access.canAccessTasks === false) {
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
      const isReminder = modalReminderWhatsapp;
      const dueDate = modalDueDate || String(form.get("dueDate") || "");
      const dueTime = modalDueTime || String(form.get("dueTime") || "");

      let calculatedReminderDate: string | undefined = undefined;
      let rawLead = modalReminderLead === "custom"
        ? `${modalCustomLeadMinutes} ${modalCustomLeadUnit} before`
        : modalReminderLead;

      if (isReminder) {
        if (modalTriggerMode === "exact" && modalExactDate && modalExactTime) {
          calculatedReminderDate = computeExactReminderDateISO(modalExactDate, modalExactTime);
          rawLead = `Exact at ${modalExactDate} ${formatTime12h(modalExactTime)}`;
        } else {
          calculatedReminderDate = computeReminderDateISO(dueDate, dueTime, rawLead);
        }
      }

      const timeNote = dueTime ? `, Due Time: ${formatTime12h(dueTime)}` : "";
      const trigNote = calculatedReminderDate ? `, Trigger: ${calculatedReminderDate}` : "";
      const tzNote = `, TzOffset: ${new Date().getTimezoneOffset()}`;
      const rec = taskRecipients.length > 0 ? `, Recipients: ${taskRecipients.join(", ")}` : "";
      const reminderNote = isReminder ? ` [Reminder: ${rawLead}${timeNote}${trigNote}${tzNote}${rec}]` : "";

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
        reminderDate: calculatedReminderDate,
        notes: `${String(form.get("notes") || "")}${reminderNote}`.trim(),
      });

      setTasks((prev) => [newTask, ...prev]);
      formElement?.reset?.();
      setModalDueDate("");
      setModalDueTime("");
      setModalReminderWhatsapp(true);
      setModalReminderLead("15 minutes before");
      setModalCustomLeadMinutes(15);
      setModalCustomLeadUnit("minutes");
      setModalTriggerMode("preset");
      setModalShowExactEditor(false);
      setModalExactDate("");
      setModalExactTime("");
      setIsAddOpen(false);
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
        // Fallback: If automated gateway is unreachable (e.g. on mobile/iOS or offline),
        // seamlessly open WhatsApp directly so the reminder can be sent from the device
        const settings = await getUserSettings().catch(() => null);
        const recipients = resolveTaskRecipientNumbers(
          task,
          settings?.whatsappNumber,
          settings?.countryCode,
        );

        if (recipients.length > 0) {
          const target = recipients[0];
          const msg = buildTaskWhatsAppMessage(task);
          const directUrl = getDirectWhatsAppUrl(target.phone, msg);
          const confirmOpen = window.confirm(
            `Automated background server gateway is unreachable on this device.\n\nOpen WhatsApp directly to send this alert to ${target.alias} (${target.phone})?`
          );
          if (confirmOpen) {
            window.open(directUrl, "_blank");
            setSendSuccessId(task.id);
            setTimeout(() => setSendSuccessId(null), 3000);
          }
        } else {
          alert(res.error || "WhatsApp gateway could not deliver alert. Check connection.");
        }
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
    const target = new Date(Date.now() + 3600 * 1000);
    setModalDueDate(toLocalDateInputValue(target));
    setModalDueTime(toLocalTimeInputValue(target));
    setModalTriggerMode("preset");
    setModalReminderLead("15 minutes before");
    setModalShowExactEditor(false);
    setIsAddOpen(true);
  };

  // Filter tasks based on search, priority, assignee, and flags
  const filteredTasks = tasks.filter((task) => {
    if (userAccess && !userAccess.isHead && userAccess.access.assignedTaskScope === "specific") {
      const memberId = userAccess.member?.id;
      const memberName = (userAccess.member?.fullName || "").toLowerCase().trim();
      const taskAssigneeId = task.familyMemberId;
      const taskAssigneeName = (task.familyMemberName || "").toLowerCase().trim();
      const isAssigned =
        (memberId && taskAssigneeId === memberId) ||
        (memberName && (taskAssigneeName.includes(memberName) || memberName.includes(taskAssigneeName)));
      if (!isAssigned) return false;
    }

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

  const canCreate = !userAccess || userAccess.isHead || userAccess.access.canCreateTasks !== false;
  const canDelete = !userAccess || userAccess.isHead || userAccess.access.canDeleteTasks !== false;

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
      {/* Mobile Top Header Integration via Portal into MobileHeader */}
      {headerPortalEl &&
        canCreate &&
        createPortal(
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => openAddWithStatus("Pending")}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </button>
          </div>,
          headerPortalEl
        )}

      {/* Desktop Header (Enterprise Pattern B Sticky Header) */}
      <UiPageHeader
        title="To-Do List & Tasks"
        helpTooltip="Write down your daily tasks, bills to pay, and automated WhatsApp reminders."
        subtitle="Write down your daily tasks, bills to pay, and reminders."
        sticky={true}
        className="hidden lg:block mb-2"
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => openAddWithStatus("Pending")}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#0d825c] px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-950/20 hover:from-[#073f30] hover:to-[#0b6e4e] active:scale-95 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </button>
          ) : null
        }
      />

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
                      fontFamily: '"Inter", sans-serif',
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
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
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
                  fontFamily: '"Inter", sans-serif',
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
                  fontFamily: '"Inter", sans-serif',
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
              Sprint Progress: <span className="text-emerald-700 font-bold">{progressPercent}%</span>
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
        <BrandLogoLoader
          message="Loading To-Do & Tasks..."
          subtitle="Organizing your checklist, reminders & priorities"
        />
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
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
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
                  ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-300"
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
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => openAddWithStatus("Pending")}
                    className="hidden md:flex rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                    title="Add task to To Do"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
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
                      onDelete={canDelete ? handleDelete : undefined}
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
                  ? "border-blue-500 bg-blue-100/70 ring-2 ring-blue-400"
                  : "border-blue-200/90 bg-blue-50/40"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h2 className="text-xs font-semibold text-blue-900">
                    In Progress
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                    {inProgressTasks.length}
                  </span>
                </div>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => openAddWithStatus("In Progress")}
                    className="hidden md:flex rounded-lg p-1 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                    title="Add task to In Progress"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1">
                {inProgressTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-blue-400/80 border border-dashed border-blue-200 rounded-xl bg-white/40">
                    <Clock className="h-6 w-6 text-blue-300 mb-1" />
                    <span>No tasks in progress</span>
                    <span className="text-[10px] text-blue-400/70 mt-0.5">Tasks currently being worked on</span>
                  </div>
                ) : (
                  inProgressTasks.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onStatusChange={handleStatusChange}
                      onDelete={canDelete ? handleDelete : undefined}
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
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => openAddWithStatus("Completed")}
                    className="hidden md:flex rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                    title="Add task to Done"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
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
                      onDelete={canDelete ? handleDelete : undefined}
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
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => openAddWithStatus("Cancelled")}
                    className="hidden md:flex rounded-lg p-1 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                    title="Add task directly to Cancelled"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
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
                      onDelete={canDelete ? handleDelete : undefined}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-2.5 sm:p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/90 my-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
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
            <div className="flex border-b border-slate-200/90 px-4 sm:px-6 bg-white shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setAddModalTab("general")}
                className={`py-2.5 text-xs font-semibold border-b-2 mr-4 sm:mr-6 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
                className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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

            <form onSubmit={handleCreate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                            fontFamily: '"Inter", sans-serif',
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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

                  {/* Primary WhatsApp Reminder Alert Card */}
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label htmlFor="modalReminderWhatsapp" className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="modalReminderWhatsapp"
                          checked={modalReminderWhatsapp}
                          onChange={(e) => setModalReminderWhatsapp(e.target.checked)}
                          className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          Send WhatsApp reminder for this task
                        </span>
                      </label>

                      {modalReminderWhatsapp && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-600 font-medium">Remind:</span>
                          <select
                            value={modalTriggerMode === "exact" ? "exact" : modalReminderLead}
                            onChange={(e) => {
                              if (e.target.value === "exact") {
                                setModalTriggerMode("exact");
                                setModalShowExactEditor(true);
                              } else {
                                setModalTriggerMode("preset");
                                setModalReminderLead(e.target.value);
                                setModalShowExactEditor(false);
                              }
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium shadow-2xs cursor-pointer"
                          >
                            <option value="At due time">At due time</option>
                            <option value="5 minutes before">5 mins before</option>
                            <option value="15 minutes before">15 mins before</option>
                            <option value="30 minutes before">30 mins before</option>
                            <option value="1 hour before">1 hour before</option>
                            <option value="1 day before">1 day before</option>
                            <option value="exact">Specific Date & Time...</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {modalReminderWhatsapp && (
                      <>
                        {/* Interactive Notification Trigger Banner with [Change] button */}
                        <div className="rounded-lg bg-emerald-100/80 border border-emerald-300/90 p-2.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="text-[11px] text-emerald-900 font-semibold flex items-center flex-wrap gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span>{reminderPreviewText || "Set due date & time above to schedule reminder"}</span>
                              {modalComputedTriggerDate && (
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  getRelativeTriggerBadge(modalComputedTriggerDate).isPast
                                    ? "bg-amber-200 text-amber-900"
                                    : "bg-emerald-200 text-emerald-950"
                                }`}>
                                  {getRelativeTriggerBadge(modalComputedTriggerDate).text}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalShowExactEditor((prev) => !prev);
                                if (!modalShowExactEditor) {
                                  setModalTriggerMode("exact");
                                }
                              }}
                              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white border border-emerald-300 rounded-md px-2 py-0.5 transition cursor-pointer shadow-2xs"
                            >
                              {modalShowExactEditor ? "Hide Direct Pickers" : "Change Time"}
                            </button>
                          </div>

                          {/* Quick Preset Chips */}
                          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-emerald-200/70">
                            <span className="text-[10px] text-emerald-800 font-medium mr-0.5">Quick Presets:</span>
                            {[
                              { label: "At due time", val: "At due time" },
                              { label: "5m before", val: "5 minutes before" },
                              { label: "15m before", val: "15 minutes before" },
                              { label: "30m before", val: "30 minutes before" },
                              { label: "1h before", val: "1 hour before" },
                              { label: "1d before", val: "1 day before" },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setModalTriggerMode("preset");
                                  setModalReminderLead(preset.val);
                                  setModalShowExactEditor(false);
                                }}
                                className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition cursor-pointer ${
                                  modalTriggerMode === "preset" && modalReminderLead === preset.val
                                    ? "bg-emerald-700 text-white shadow-xs"
                                    : "bg-white/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setModalTriggerMode("exact");
                                setModalShowExactEditor(true);
                              }}
                              className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition cursor-pointer ${
                                modalTriggerMode === "exact"
                                  ? "bg-emerald-700 text-white shadow-xs"
                                  : "bg-white/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                              }`}
                            >
                              Exact Time
                            </button>
                          </div>

                          {/* Direct Date & Time Inputs when editing exact trigger */}
                          {modalShowExactEditor && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/80 bg-white/70 p-2 rounded-lg">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                  Exact Trigger Date
                                </label>
                                <input
                                  type="date"
                                  value={modalExactDate}
                                  onChange={(e) => {
                                    setModalExactDate(e.target.value);
                                    setModalTriggerMode("exact");
                                  }}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                  Exact Trigger Time
                                </label>
                                <input
                                  type="time"
                                  value={modalExactTime}
                                  onChange={(e) => {
                                    setModalExactTime(e.target.value);
                                    setModalTriggerMode("exact");
                                  }}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <ItemRecipientSelector
                          selectedRecipients={taskRecipients}
                          onChange={setTaskRecipients}
                          label="Send Alert To:"
                          helperText="Select which phone alias receives the reminder."
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* TAB 2: ADVANCED (Recurrence, Category, Assignee, Vehicle, Property, WhatsApp) */}
                <div className={addModalTab === "advanced" ? "space-y-4" : "hidden"}>
                  {/* Recurrence & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                          fontFamily: '"Inter", sans-serif',
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                            fontFamily: '"Inter", sans-serif',
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
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 p-4 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/40 shrink-0">
                <div className="text-center sm:text-left">
                  {addModalTab === "general" ? (
                    <button
                      type="button"
                      onClick={() => setAddModalTab("advanced")}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer py-1"
                    >
                      Configure Advanced &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddModalTab("general")}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer py-1"
                    >
                      &larr; Back to General
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 sm:flex-none rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    type="submit"
                    className="flex-1 sm:flex-none rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer text-center whitespace-nowrap"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto"
          onMouseDown={() => setSelectedTask(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50/60 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                    TASK-{selectedTask.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadgeStyle(editPriority)}`}>
                    {editPriority}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    editStatus === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : editStatus === "In Progress"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {editStatus}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendTaskWhatsApp(selectedTask)}
                    disabled={sendingTaskId === selectedTask.id}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                      sendSuccessId === selectedTask.id
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                    title="Send WhatsApp alert now"
                  >
                    <Send className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${sendingTaskId === selectedTask.id ? "animate-spin" : ""}`} />
                    <span>
                      {sendingTaskId === selectedTask.id
                        ? "Sending..."
                        : sendSuccessId === selectedTask.id
                        ? "Sent!"
                        : "WA Alert Now"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-2">
                Task Details & Edit
              </h3>
            </div>

            {/* Modal Tabs: General vs Advanced */}
            <div className="flex border-b border-slate-200/90 px-4 sm:px-6 bg-white shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setEditModalTab("general")}
                className={`py-2.5 text-xs font-semibold border-b-2 mr-4 sm:mr-6 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
                className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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

            <form onSubmit={handleSaveEditedTask} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                            fontFamily: '"Inter", sans-serif',
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Due Date</span>
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
                        <span>Due Time (Hour & Min)</span>
                      </label>
                      <input
                        type="time"
                        value={editDueTime}
                        onChange={(e) => setEditDueTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Primary WhatsApp Notification Card */}
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label htmlFor="editReminderWhatsapp" className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="editReminderWhatsapp"
                          checked={editReminderWhatsapp}
                          onChange={(e) => setEditReminderWhatsapp(e.target.checked)}
                          className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          Send WhatsApp reminder for this task
                        </span>
                      </label>

                      {editReminderWhatsapp && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-600 font-medium">Remind:</span>
                          <select
                            value={editTriggerMode === "exact" ? "exact" : editReminderLead}
                            onChange={(e) => {
                              if (e.target.value === "exact") {
                                setEditTriggerMode("exact");
                                setEditShowExactEditor(true);
                              } else {
                                setEditTriggerMode("preset");
                                setEditReminderLead(e.target.value);
                                setEditShowExactEditor(false);
                              }
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium shadow-2xs cursor-pointer"
                          >
                            <option value="At due time">At due time</option>
                            <option value="5 minutes before">5 mins before</option>
                            <option value="15 minutes before">15 mins before</option>
                            <option value="30 minutes before">30 mins before</option>
                            <option value="1 hour before">1 hour before</option>
                            <option value="1 day before">1 day before</option>
                            <option value="exact">Specific Date & Time...</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {editReminderWhatsapp && (
                      <>
                        {/* Interactive Notification Trigger Banner with [Change] button */}
                        <div className="rounded-lg bg-emerald-100/80 border border-emerald-300/90 p-2.5 flex flex-col gap-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="text-[11px] text-emerald-900 font-semibold flex items-center flex-wrap gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span>{editReminderPreviewText || "Set due date & time above to schedule reminder"}</span>
                              {editComputedTriggerDate && (
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  getRelativeTriggerBadge(editComputedTriggerDate).isPast
                                    ? "bg-amber-200 text-amber-900"
                                    : "bg-emerald-200 text-emerald-950"
                                }`}>
                                  {getRelativeTriggerBadge(editComputedTriggerDate).text}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditShowExactEditor((prev) => !prev);
                                if (!editShowExactEditor) {
                                  setEditTriggerMode("exact");
                                }
                              }}
                              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white border border-emerald-300 rounded-md px-2 py-0.5 transition cursor-pointer shadow-2xs"
                            >
                              {editShowExactEditor ? "Hide Direct Pickers" : "Change Time"}
                            </button>
                          </div>

                          {/* Quick Preset Chips */}
                          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-emerald-200/70">
                            <span className="text-[10px] text-emerald-800 font-medium mr-0.5">Quick Presets:</span>
                            {[
                              { label: "At due time", val: "At due time" },
                              { label: "5m before", val: "5 minutes before" },
                              { label: "15m before", val: "15 minutes before" },
                              { label: "30m before", val: "30 minutes before" },
                              { label: "1h before", val: "1 hour before" },
                              { label: "1d before", val: "1 day before" },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setEditTriggerMode("preset");
                                  setEditReminderLead(preset.val);
                                  setEditShowExactEditor(false);
                                }}
                                className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition cursor-pointer ${
                                  editTriggerMode === "preset" && editReminderLead === preset.val
                                    ? "bg-emerald-700 text-white shadow-xs"
                                    : "bg-white/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setEditTriggerMode("exact");
                                setEditShowExactEditor(true);
                              }}
                              className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition cursor-pointer ${
                                editTriggerMode === "exact"
                                  ? "bg-emerald-700 text-white shadow-xs"
                                  : "bg-white/80 text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                              }`}
                            >
                              Exact Time
                            </button>
                          </div>

                          {/* Direct Date & Time Inputs when editing exact trigger */}
                          {editShowExactEditor && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/80 bg-white/70 p-2 rounded-lg">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                  Exact Trigger Date
                                </label>
                                <input
                                  type="date"
                                  value={editExactDate}
                                  onChange={(e) => {
                                    setEditExactDate(e.target.value);
                                    setEditTriggerMode("exact");
                                  }}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                  Exact Trigger Time
                                </label>
                                <input
                                  type="time"
                                  value={editExactTime}
                                  onChange={(e) => {
                                    setEditExactTime(e.target.value);
                                    setEditTriggerMode("exact");
                                  }}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>

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

                {/* TAB 2: ADVANCED (Recurrence, Category, Assignee, Vehicle, Property, WhatsApp) */}
                <div className={editModalTab === "advanced" ? "space-y-4" : "hidden"}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                          fontFamily: '"Inter", sans-serif',
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
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
                            fontFamily: '"Inter", sans-serif',
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
                            fontFamily: '"Inter", sans-serif',
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
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 p-4 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/40 shrink-0">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedTask.id, selectedTask.title)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 sm:flex-none rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isUpdating}
                    type="submit"
                    className="flex-1 sm:flex-none rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer text-center whitespace-nowrap"
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
  onDelete?: (id: string) => void;
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
          ? "opacity-40 border-dashed border-blue-400 scale-[0.98]"
          : isCancelled
          ? "border-rose-200/90 bg-rose-50/20 border-l-4 border-l-rose-400"
          : `border-slate-200/90 hover:border-slate-300 ${getPriorityCardBorder(task.priority)}`
      }`}
    >
      {/* Top Tag Row: Key + Category */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/70">
            TSK-{String(index + 1).padStart(2, "0")}
          </span>

          {task.category && (
            <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/70">
              {task.category}
            </span>
          )}

          {/* Auto-delete countdown for Cancelled tasks */}
          {cancelledCountdown && (
            <span
              className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200 flex items-center gap-1"
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
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-700 p-0.5 rounded transition cursor-pointer"
            title="Edit task details"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          {onDelete && (
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
          )}
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
            <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-0.5 font-semibold flex items-center gap-1.5 shadow-2xs">
              <Car className="h-3 w-3 text-amber-600" /> {task.vehicleName}
            </span>
          )}
          {task.propertyName && (
            <span className="rounded-full bg-purple-50 text-purple-800 border border-purple-200/60 px-2.5 py-0.5 font-semibold flex items-center gap-1.5 shadow-2xs">
              <Building className="h-3 w-3 text-purple-600" /> {task.propertyName}
            </span>
          )}
          {task.recurrence && task.recurrence !== "None" && (
            <span className="rounded-full bg-teal-50 text-teal-800 border border-teal-200/60 px-2.5 py-0.5 font-semibold flex items-center gap-1 shadow-2xs">
              <Repeat className="h-2.5 w-2.5 text-teal-600" /> {task.recurrence}
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
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
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
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
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
