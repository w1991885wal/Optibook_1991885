import { useState } from "react";
import DashboardLayout from "./layout/dashboard";
import Diary from "./pages/dairy";
import DashboardComponent from "./pages/main";
import PatientsPage from "./pages/patient";
import SchedulePage from "./pages/schedule";
import WaitListPage from "./pages/waitlist";
import NotificationsPage from "./pages/notification";
import RecallsPage from "./pages/recalls";
import PatientHistoryPage from "./pages/patientHistory";

// Phase E: NotificationsPage self-fetches from /api/notifications now.
// Phase D2a: added Recalls page (sidebar) + Patient history page (deep-linked
// from Recalls / Patients rows). selectedPatientId travels with active state
// so the history page knows whose data to load.

export default function OptometristApp({ onLogout }) {
  const [active, setActive] = useState("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const openHistory = (patientId) => {
    setSelectedPatientId(patientId);
    setActive("history");
  };

  return (
    <DashboardLayout active={active} setActive={setActive} onLogout={onLogout}>
      {(active) => {
        switch (active) {
          case "dashboard":
            return <DashboardComponent setActive={setActive} />;
          case "diary":
            return <Diary />;
          case "patients":
            return <PatientsPage onOpenHistory={openHistory} />;
          case "waitlist":
            return <WaitListPage />;
          case "settings":
            return <SchedulePage />;
          case "notifications":
            return <NotificationsPage />;
          case "recalls":
            return <RecallsPage onOpenHistory={openHistory} />;
          case "history":
            return (
              <PatientHistoryPage
                patientId={selectedPatientId}
                onBack={() => setActive("recalls")}
              />
            );
        }
      }}
    </DashboardLayout>
  );
}
