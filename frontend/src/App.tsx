import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { VehicleEntryPage } from "./pages/VehicleEntryPage";
import { VehicleDetailsPage } from "./pages/VehicleDetailsPage";
import { AuthGate } from "./components/auth/AuthGate";
import { PropertiesPage } from "./pages/PropertiesPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { FamilyPage } from "./pages/FamilyPage";
import { AccessControlPage } from "./pages/AccessControlPage";
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { WarrantiesPage } from "./pages/WarrantiesPage";
import { LicensesPage } from "./pages/LicensesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorPage } from "./pages/ErrorPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { startReminderDaemon } from "./services/reminderDaemon";

import { AdminPage } from "./pages/AdminPage";

function AllVehiclesPage() {
  return <VehicleEntryPage filterType="All" />;
}

function CarsPage() {
  return <VehicleEntryPage filterType="Car" />;
}

function BikesPage() {
  return <VehicleEntryPage filterType="Bike" />;
}

function App() {
  useEffect(() => {
    const stop = startReminderDaemon(15000);
    return () => stop();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Fully Separate & Private SuperAdmin Panel (ID: Towsif, Pass: Admin) */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />

          {/* Standard User App Layout */}
          <Route
            element={
              <AuthGate>
                <AppLayout />
              </AuthGate>
            }
          >
            {/* 1. Daily Dashboard */}
            <Route path="/" element={<DashboardPage />} />

              {/* 2. My Life */}
              <Route path="/my-life/tasks" element={<TasksPage />} />
              <Route path="/my-life/calendar" element={<CalendarPage />} />

              {/* 3. Document Vault & Licenses */}
              <Route path="/documents/vault" element={<DocumentsPage />} />
              <Route path="/documents/licenses" element={<LicensesPage />} />

              {/* 4. Assets & Vehicles */}
              <Route path="/assets/vehicles" element={<AllVehiclesPage />} />
              <Route path="/assets/vehicles/cars" element={<CarsPage />} />
              <Route path="/assets/vehicles/bikes" element={<BikesPage />} />
              <Route path="/vehicles/:vehicleId" element={<VehicleDetailsPage />} />
              <Route path="/assets/warranties" element={<WarrantiesPage />} />

              {/* 5. Real Estate & Rentals */}
              <Route path="/rentals/properties" element={<PropertiesPage />} />

              {/* 6. Family Profiles & Workspace Access Control */}
              <Route path="/family/profiles" element={<FamilyPage />} />
              <Route path="/workspace/access-control" element={<AccessControlPage />} />
              <Route path="/family/access-control" element={<Navigate to="/workspace/access-control" replace />} />

              {/* 7. Notifications & Settings */}
              <Route path="/notifications" element={<Navigate to="/settings?tab=notifications" replace />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* 8. Error & Diagnostic Page */}
              <Route path="/error" element={<ErrorPage />} />

              {/* Backwards-compatible legacy redirects */}
              <Route path="/vehicles" element={<Navigate to="/assets/vehicles" replace />} />
              <Route path="/vehicles/cars" element={<Navigate to="/assets/vehicles/cars" replace />} />
              <Route path="/vehicles/bikes" element={<Navigate to="/assets/vehicles/bikes" replace />} />
              <Route path="/properties" element={<Navigate to="/rentals/properties" replace />} />
              <Route path="/documents" element={<Navigate to="/documents/vault" replace />} />

              {/* 9. Proper 404 Catch-All Page */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    );
  }

export default App;
