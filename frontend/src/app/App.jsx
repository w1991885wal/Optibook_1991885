import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { PatientDashboard } from "./components/patient/dashboard";
import OptometristDashboard from "./components/optometrist/dashboard";
import { Toaster } from "sonner";
import AdminApp from "./components/admin";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { RegisterPage } from "./components/RegisterPage";

const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role || null;
};

function ProtectedDashboard() {
  const token = localStorage.getItem("token");
  const role = getUserRole();

  if (!token || !role) return <Navigate to="/login" />;

  if (role === "patient") return <PatientDashboard />;
  if (role === "optometrist") return <OptometristDashboard />;
  if (role === "admin") return <AdminApp />;
}

export default function App() {
  return (
    <div className="size-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path={`/dashboard`} element={<ProtectedDashboard />} />
      </Routes>
      <Toaster />
    </div>
    // <div className="size-full">
    //   {!userRole && <LoginPage onLogin={handleLogin} />}
    //   {userRole === "patient" && <PatientDashboard onLogout={handleLogout} />}
    //   {userRole === "optometrist" && (
    //     <OptometristDashboard onLogout={handleLogout} />
    //   )}
    //   {userRole === "admin" && <AdminApp onLogout={handleLogout} />}
    //   <Toaster />
    // </div>
  );
}
