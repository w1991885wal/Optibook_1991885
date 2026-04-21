import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  Eye,
  BarChart2,
  UserPlus,
} from "lucide-react";
import { cn } from "../../ui/utils";
import useIsMobile from "../../../hook/useIsMobile";
import { handleLogout } from "../../../../lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "Clinic Diary", icon: Calendar, key: "diary" },
  { label: "Analytics", icon: BarChart2, key: "analytics" },
  { label: "Patients", icon: Users, key: "patients" },
  { label: "Staff Management", icon: UserPlus, key: "staff" },
  { label: "Settings", icon: Settings, key: "setting" },
];

export default function Sidebar({ active, onChange, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const isMobileView = useIsMobile();

  useEffect(() => {
    setCollapsed(isMobileView);
  }, [isMobileView]);

  return (
    <aside
      className={cn(
        "h-screen bg-white border-r flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}

      <div className="flex items-center gap-3 px-4 py-5 border-b h-16">
        {!collapsed && (
          <>
            <div className="w-10 h-10 bg-linear-to-br from-teal-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Eye className="text-white" />
            </div>

            <div>
              <h1 className="font-bold text-lg">OptiBook</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </>
        )}
        {!isMobileView && (
          <button
            onClick={() => {
              setCollapsed(!collapsed);
            }}
            className={`${collapsed ? "mx-auto" : "ml-auto"} cursor-pointer`}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              `flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-3 py-2 rounded-md w-full text-left text-[#5D7285] hover:bg-[#008080]/20 hover:text-[#0000FF] cursor-pointer`,
              active === item.key && "bg-[#008080]/20 text-[#0000FF]",
            )}
          >
            <item.icon className="w-5 h-5" />
            {!collapsed && (
              <span className={`${active === item.key ? "" : "font-normal"}`}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t">
        <button
          className="flex items-center gap-3 px-3 py-2 w-full hover:bg-red-50 text-red-600 rounded-md"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
