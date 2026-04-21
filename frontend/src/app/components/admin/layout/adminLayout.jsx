import Header from "./Header";
import Sidebar from "./Sidbar";

export default function AdminDashboardLayout({
  active,
  setActive,
  onLogout,
  children,
}) {
  return (
    <div className="flex bg-linear-to-br from-blue-50 via-white to-teal-50 h-screen overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar active={active} onChange={setActive} onLogout={onLogout} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <Header />

        {/* Scrollable main content */}
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          {children(active)}
        </main>
      </div>
    </div>
  );
}
