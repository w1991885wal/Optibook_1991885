import { useState } from "react";
import DashboardLayout from "./layout/dashboard";
import Diary from "./pages/dairy";
import DashboardComponent from "./pages/main";
import PatientsPage from "./pages/patient";
import SchedulePage from "./pages/schedule";
import WaitListPage from "./pages/waitlist";
import NotificationsPage from "./pages/notification";
const notificationsData = [
  {
    title: "Appointment booked",
    message: "John Doe booked an appointment.",
    time: "2 min ago",
  },
  {
    title: "New patient",
    message: "Jane Smith joined your patients list.",
    time: "10 min ago",
  },
  { title: "Reminder", message: "Follow up with Michael.", time: "1 hour ago" },
];

export default function OptometristApp({ onLogout }) {
  const [active, setActive] = useState("dashboard");

  return (
    <DashboardLayout active={active} setActive={setActive} onLogout={onLogout}>
      {(active) => {
        switch (active) {
          case "dashboard":
            return <DashboardComponent setActive={setActive} />;
          case "diary":
            return <Diary />;
          case "patients":
            return <PatientsPage />;
          case "waitlist":
            return <WaitListPage />;
          case "settings":
            return <SchedulePage />;
          case "notifications":
            return <NotificationsPage notifications={notificationsData} />;
        }
      }}
    </DashboardLayout>
  );
}
