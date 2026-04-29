import { LoginPage } from "./components/LoginPage";
import { PatientDashboard } from "./components/patient/dashboard";
import PatientProfilePage from "./components/patient/PatientProfilePage";
import OptometristDashboard from "./components/optometrist/dashboard";
import { Toaster } from "sonner";
import AdminApp from "./components/admin";
import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./components/LandingPage";
import { StaffGatePage } from "./components/StaffGatePage";
import { RegisterPage } from "./components/RegisterPage";

const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role || null;
};

function ProtectedDashboard() {
  const token = localStorage.getItem("token");
  const role = getUserRole();

  if (!token || !role) return <Navigate to="/" />;

  if (role === "patient") return <PatientDashboard />;
  if (role === "optometrist") return <OptometristDashboard />;
  if (role === "admin") return <AdminApp />;
}

// Patient-only guard for /profile. Any other role is bounced to /dashboard,
// which routes them to their own dashboard.
function PatientOnly({ children }) {
  const token = localStorage.getItem("token");
  const role = getUserRole();
  if (!token || !role) return <Navigate to="/" />;
  if (role !== "patient") return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <div className="size-full">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/staff-gate" element={<StaffGatePage />} />
        <Route path="/login/:role" element={<LoginPage />} />
        {/* Back-compat: bare /login defaults to patient portal. */}
        <Route path="/login" element={<Navigate to="/login/patient" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route
          path="/profile"
          element={
            <PatientOnly>
              <PatientProfilePage />
            </PatientOnly>
          }
        />
      </Routes>
      <Toaster />
    </div>
  );
}
