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
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { WarrantiesPage } from "./pages/WarrantiesPage";
import { LicensesPage } from "./pages/LicensesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorPage } from "./pages/ErrorPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

function CarsPage() {
  return <VehicleEntryPage type="Car" />;
}

function BikesPage() {
  return <VehicleEntryPage type="Bike" />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route element={<AppLayout />}>
              {/* 1. Daily Dashboard */}
              <Route path="/" element={<DashboardPage />} />

              {/* 2. My Life */}
              <Route path="/my-life/tasks" element={<TasksPage />} />
              <Route path="/my-life/calendar" element={<CalendarPage />} />

              {/* 3. Document Vault & Licenses */}
              <Route path="/documents/vault" element={<DocumentsPage />} />
              <Route path="/documents/licenses" element={<LicensesPage />} />

              {/* 4. Assets & Vehicles */}
              <Route path="/assets/vehicles/cars" element={<CarsPage />} />
              <Route path="/assets/vehicles/bikes" element={<BikesPage />} />
              <Route path="/vehicles/:vehicleId" element={<VehicleDetailsPage />} />
              <Route path="/assets/warranties" element={<WarrantiesPage />} />

              {/* 5. Real Estate & Rentals */}
              <Route path="/rentals/properties" element={<PropertiesPage />} />

              {/* 6. Family Profiles */}
              <Route path="/family/profiles" element={<FamilyPage />} />

              {/* 7. Notifications & Settings */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* 8. Error & Diagnostic Page */}
              <Route path="/error" element={<ErrorPage />} />

              {/* Backwards-compatible legacy redirects */}
              <Route path="/vehicles/cars" element={<Navigate to="/assets/vehicles/cars" replace />} />
              <Route path="/vehicles/bikes" element={<Navigate to="/assets/vehicles/bikes" replace />} />
              <Route path="/properties" element={<Navigate to="/rentals/properties" replace />} />
              <Route path="/documents" element={<Navigate to="/documents/vault" replace />} />

              {/* 9. Proper 404 Catch-All Page */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
