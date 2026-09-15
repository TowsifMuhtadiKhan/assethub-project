import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { VehicleEntryPage } from "./pages/VehicleEntryPage";
import { VehicleDetailsPage } from "./pages/VehicleDetailsPage";
import { AuthGate } from "./components/auth/AuthGate";
import { PropertiesPage } from "./pages/PropertiesPage";

function CarsPage() {
  return <VehicleEntryPage type="Car" />;
}

function BikesPage() {
  return <VehicleEntryPage type="Bike" />;
}

function MaintenancePage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
      <p className="mt-3 text-slate-600">
        Add a vehicle first, then record its maintenance history here.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
        No maintenance records added yet.
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-3 text-slate-600">
        Vehicle and property reports include collection history, maintenance
        cost summaries, occupancy, and net income by month.
      </p>
    </div>
  );
}

function DocumentsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
      <p className="mt-3 text-slate-600">
        Receipts, tenancy papers, vehicle documents, and invoices are stored
        here with upload, preview, and replacement support.
      </p>
    </div>
  );
}

function NotificationsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
      <p className="mt-3 text-slate-600">
        Outstanding reminders, agreement expiries, and maintenance alerts are
        shown here.
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vehicles/cars" element={<CarsPage />} />
            <Route path="/vehicles/bikes" element={<BikesPage />} />
            <Route
              path="/vehicles/:vehicleId"
              element={<VehicleDetailsPage />}
            />
            <Route path="/vehicles/services" element={<MaintenancePage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
