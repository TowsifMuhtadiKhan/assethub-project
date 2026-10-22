import { AssetDashboardPage } from "./pages/AssetDashboardPage";
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
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DailyExpensesPage } from "./pages/DailyExpensesPage";
import { EmiDetailPage } from "./pages/EmiDetailPage";
import { DpsFdrDetailPage } from "./pages/DpsFdrDetailPage";
import { WarrantiesPage } from "./pages/WarrantiesPage";
import { LicensesPage } from "./pages/LicensesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorPage } from "./pages/ErrorPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { startReminderDaemon } from "./services/reminderDaemon";
import { LanguageProvider } from "./context/LanguageContext";

import { AdminPage } from "./pages/AdminPage";
import { DesignSystemShowcasePage } from "./pages/DesignSystemShowcasePage";

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
    const stop = startReminderDaemon(45000);
    return () => stop();
  }, []);

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
        <Routes>
          {/* Fully Separate & Private SuperAdmin Panel (ID: Towsif, Pass: Admin) */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />

          {/* Design System & Pattern Lab */}
          <Route path="/design-system" element={<DesignSystemShowcasePage />} />
          <Route path="/patterns" element={<DesignSystemShowcasePage />} />

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
              <Route path="/my-life/expenses" element={<DailyExpensesPage />} />
              <Route path="/my-life/expenses/loans/:loanId" element={<EmiDetailPage />} />
              <Route path="/my-life/expenses/savings/:savingsId" element={<DpsFdrDetailPage />} />
              <Route path="/expenses" element={<Navigate to="/my-life/expenses" replace />} />
              <Route path="/daily-expenses" element={<Navigate to="/my-life/expenses" replace />} />

              {/* 3. Document Vault & Licenses */}
              <Route path="/documents/vault" element={<DocumentsPage />} />
              <Route path="/documents/licenses" element={<LicensesPage />} />

              {/* 4. Assets & Vehicles */}
              <Route path="/assets/vehicles/dashboard" element={<AssetDashboardPage key="vehicle" kind="vehicle" />} />
              <Route path="/rentals/dashboard" element={<PropertiesPage key="property-dashboard" dashboard />} />
              <Route path="/assets/vehicles" element={<AllVehiclesPage />} />
              <Route path="/assets/vehicles/cars" element={<CarsPage />} />
              <Route path="/assets/vehicles/bikes" element={<BikesPage />} />
              <Route path="/vehicles/:vehicleId" element={<VehicleDetailsPage />} />
              <Route path="/assets/warranties" element={<WarrantiesPage />} />

              {/* 5. Real Estate & Rentals */}
              <Route path="/rentals/properties" element={<PropertiesPage />} />

              {/* 6. Family Profiles & Workspace Access Control (Unified in Settings) */}
              <Route path="/family/profiles" element={<Navigate to="/settings?tab=profile" replace />} />
              <Route path="/workspace/access-control" element={<Navigate to="/settings?tab=access" replace />} />
              <Route path="/family/access-control" element={<Navigate to="/settings?tab=access" replace />} />

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
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
