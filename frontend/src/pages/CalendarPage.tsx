import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { listTasks } from "../services/taskService";
import { listDocuments } from "../services/documentService";
import { listLicenses } from "../services/licenseService";
import { listWarranties } from "../services/warrantyService";
import type { CalendarEvent } from "../types";

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllEvents();
  }, []);

  const loadAllEvents = async () => {
    try {
      const [tasks, docs, lic, war] = await Promise.all([
        listTasks(),
        listDocuments(),
        listLicenses(),
        listWarranties(),
      ]);

      const evs: CalendarEvent[] = [];

      // Tasks
      tasks.forEach((t) => {
        if (t.dueDate) {
          evs.push({
            id: `task-${t.id}`,
            title: `Task: ${t.title}`,
            date: t.dueDate,
            time: t.dueTime,
            type: "task",
            details: `Priority: ${t.priority} (${t.status})`,
          });
        }
      });

      // Documents expiring
      docs.forEach((d) => {
        if (d.expiryDate) {
          evs.push({
            id: `doc-${d.id}`,
            title: `Doc Expiry: ${d.name}`,
            date: d.expiryDate,
            type: "document_expiry",
            details: `Category: ${d.category} (ID: ${d.documentNumber || "N/A"})`,
          });
        }
      });

      // Licenses expiring
      lic.forEach((l) => {
        if (l.expiryDate) {
          evs.push({
            id: `lic-${l.id}`,
            title: `License Renewal: ${l.licenseName}`,
            date: l.expiryDate,
            type: "document_expiry",
            details: `Holder: ${l.holderName || "Self"}`,
          });
        }
      });

      // Warranties expiring
      war.forEach((w) => {
        if (w.expiryDate) {
          evs.push({
            id: `war-${w.id}`,
            title: `Warranty Expiry: ${w.productName}`,
            date: w.expiryDate,
            type: "warranty_expiry",
            details: `Seller: ${w.seller}`,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">
            LifeNest Schedule
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Calendar & Deadlines
          </h1>
          <p className="text-sm text-slate-600">
            Unified timeline of upcoming task deadlines, license renewals,
            warranty expirations, and document renewals.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Loading schedule...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-lg font-semibold text-slate-800">
            No scheduled deadlines
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            As you add due dates to tasks, vehicle tokens, and documents, they will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">
            Upcoming Timeline ({events.length} Events)
          </h2>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {events.map((ev) => {
              const isPast = new Date(ev.date) < new Date();
              return (
                <div
                  key={ev.id}
                  className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                        ev.type === "task"
                          ? "bg-cyan-50 text-cyan-700"
                          : ev.type === "warranty_expiry"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {ev.title}
                      </h3>
                      {ev.details && (
                        <p className="text-xs text-slate-500">{ev.details}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        isPast
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ev.date} {ev.time && `at ${ev.time}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
