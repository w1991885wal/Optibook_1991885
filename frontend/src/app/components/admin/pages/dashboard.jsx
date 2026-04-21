import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  Hourglass,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import API from "../../../../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, s] = await Promise.all([
          API.get("/analytics/dashboard"),
          API.get("/analytics/clinician-workload"),
        ]);
        if (cancelled) return;
        setStats(d.data.data || null);
        setStaff(s.data.data || []);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const quickStats = stats
    ? [
        { label: "Total Appointments (Month)", value: String(stats.monthlyAppointments ?? 0) },
        { label: "Completed", value: String(stats.completedAppointments ?? 0) },
        { label: "Cancelled", value: String(stats.cancelledCount ?? 0) },
        { label: "No-Shows", value: String(stats.noShowCount ?? 0) },
      ]
    : [];

  const ai = stats?.ai || {};
  const todayCount = stats?.todayAppointments ?? 0;
  const utilization = stats?.utilization ?? 0;
  const noShowRate = stats?.noShowRate ?? 0;
  const waitlistActive = stats?.waitlistActive ?? 0;
  const waitlistHigh = stats?.waitlistHighPriority ?? 0;
  const totalOptoms = stats?.totalOptometrists ?? 0;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-3xl font-bold mb-2">System Overview</h2>
        <p className="text-gray-600">
          Manage your clinic operations and monitor performance
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#0066CC] [box-shadow:0_4px_6px_-1px_rgba(0,102,204,0.4),0_2px_4px_-2px_rgba(0,102,204,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Today's Appointments</p>
                  <p className="text-2xl font-bold">{todayCount}</p>
                </div>
                <div className="w-10 h-10 bg-[#0066CC] rounded-sm flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">Across {totalOptoms} optometrists</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Clinic Utilization</p>
                  <p className="text-2xl font-bold">{utilization}%</p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs">Based on today's load vs capacity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">No-Show Rate</p>
                  <p className="text-2xl font-bold">{noShowRate}%</p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <TriangleAlert className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs">Month-to-date</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FF6B6B] [box-shadow:0_4px_6px_-1px_rgba(255,107,107,0.4),0_2px_4px_-2px_rgba(255,107,107,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Waitlist</p>
                  <p className="text-2xl font-bold">{waitlistActive}</p>
                </div>
                <div className="w-10 h-10 bg-[#FF6B6B] rounded-sm flex items-center justify-center">
                  <Hourglass className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">{waitlistHigh} high priority</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Stats quickStats={quickStats} staffsOverview={staff} ai={ai} />
    </div>
  );
}

function Stats({ quickStats, staffsOverview, ai }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      {/* Performance summary */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">Clinic Performance This Month</h2>
          <div className="space-y-2">
            {quickStats.map((stat, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center px-3 py-2 ${
                  idx !== quickStats.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-semibold mb-2">AI Insights</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="px-3 py-2 bg-[#E6E6E6] rounded-sm">
                <p className="text-gray-600">Avg Compatibility</p>
                <p className="font-semibold">{ai?.avgCompatibilityScore ?? 0}/100</p>
              </div>
              <div className="px-3 py-2 bg-[#E6E6E6] rounded-sm">
                <p className="text-gray-600">Avg No-Show Risk</p>
                <p className="font-semibold">
                  {((ai?.avgNoShowRiskScore ?? 0) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="px-3 py-2 bg-[#E6E6E6] rounded-sm">
                <p className="text-gray-600">High-Risk Bookings</p>
                <p className="font-semibold">{ai?.highRiskCount ?? 0}</p>
              </div>
              <div className="px-3 py-2 bg-[#E6E6E6] rounded-sm">
                <p className="text-gray-600">Smart vs Manual</p>
                <p className="font-semibold">
                  {ai?.smartBookingCount ?? 0} / {ai?.manualBookingCount ?? 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff overview */}
      <Card className="py-4">
        <CardContent className="space-y-2">
          <h2 className="text-lg font-semibold">Staff Overview</h2>
          <div className="flex flex-col gap-2">
            {staffsOverview.length === 0 && (
              <p className="text-sm text-gray-500">No optometrists found.</p>
            )}
            {staffsOverview.map((staff) => (
              <Card
                className="gap-0 rounded-sm px-3 py-2 bg-[#E6E6E6]"
                key={staff.optometristId}
              >
                <p className="font-semibold">{staff.name}</p>
                <div className="text-sm text-gray-500 flex flex-wrap gap-1">
                  Today: {staff.todayAppointments} appointments
                  <span className="opacity-90">• Utilization: {staff.utilization}%</span>
                  <span className="opacity-90">• No-show: {staff.noShowRate}%</span>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
