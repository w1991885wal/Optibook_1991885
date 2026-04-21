import { useState } from "react";
import AdminDashboardLayout from "./layout/adminLayout";
import ClinicDiary from "./pages/clinic-diary";
import DashboardPage from "./pages/dashboard";
import AdminSettings from "./pages/setting";
import StaffManagement from "./pages/staffManagement";
import PatientsPage from "./pages/patients";
import AnalyticsPage from "./pages/analytics";

export default function AdminApp({ onLogout }) {
  const [active, setActive] = useState("dashboard");

  return (
    <AdminDashboardLayout
      active={active}
      setActive={setActive}
      onLogout={onLogout}
    >
      {(active) => {
        switch (active) {
          case "dashboard":
            return <DashboardPage />;
          case "diary":
            return <ClinicDiary />;
          case "analytics":
            return <AnalyticsPage />;
          case "patients":
            return <PatientsPage />;
          case "staff":
            return <StaffManagement />;
          case "setting":
            return <AdminSettings />;
        }
      }}
    </AdminDashboardLayout>
  );
}
