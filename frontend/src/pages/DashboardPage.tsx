import { useEffect, useState } from "react";
import {
  Circle,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listTasks, updateTaskStatus } from "../services/taskService";
import { listDocuments } from "../services/documentService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import { listWarranties } from "../services/warrantyService";
import { listFamilyMembers } from "../services/familyService";
import type {
  TaskItem,
  DocumentItem,
  Vehicle,
  Property,
  WarrantyItem,
  FamilyMember,
} from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
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

  return (
    <div className="space-y-4 w-full">
      {/* Top Bar Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Executive Summary
          </h1>
          <p className="text-xs text-slate-500">
            Unified status for family records, vehicles, real estate, and upcoming tasks.
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
            Open Tasks
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {pendingTasks.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tasks.length - pendingTasks.length} completed
          </div>
        </div>

        <div
          onClick={() => navigate("/documents/vault")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-amber-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition-colors">
            Expiring Docs
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
            Vehicles
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
            Properties
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {properties.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {properties.reduce((a, b) => a + (b.unitsCount || 0), 0)} rental units
          </div>
        </div>

        <div
          onClick={() => navigate("/assets/warranties")}
          className="group cursor-pointer rounded-xl border border-slate-200/90 bg-white p-3 hover:border-teal-300 hover:shadow-xs transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-teal-600 transition-colors">
            Warranties
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
          <div className="text-[11px] text-indigo-600/80 mt-0.5">registered profiles</div>
        </div>
      </div>

      {/* Main Dual Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Panel 1: Active To-Do Checklist */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Active Tasks ({pendingTasks.length})
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
                No pending tasks. Use "+ Task" to schedule an item.
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

        {/* Panel 2: Regulatory & Expiry Watch */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Expiring Items (Next 30 Days)
            </span>
            <button
              onClick={() => navigate("/documents/vault")}
              className="text-xs text-slate-500 hover:text-slate-900 font-medium inline-flex items-center gap-1"
            >
              Vault <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {expiringDocs.length === 0 && expiringWarranties.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All documents, fitness certificates, and warranties are up to date.
              </div>
            ) : (
              <>
                {expiringDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2 px-1 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-slate-900">{doc.name}</span>
                        <span className="ml-1 text-[11px] text-slate-400">
                          ({doc.category})
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 shrink-0">
                      Due: {doc.expiryDate}
                    </span>
                  </div>
                ))}

                {expiringWarranties.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-2 px-1 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-slate-900">{w.productName}</span>
                        <span className="ml-1 text-[11px] text-slate-400">Warranty</span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/50 shrink-0">
                      Due: {w.expiryDate}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
