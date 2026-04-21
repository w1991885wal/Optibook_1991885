import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Proportions, Star, TrendingDown } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import BarChart from "../../common/barchart";
import NoShowLineChart from "../../common/NoShowRate";
import API from "../../../../lib/api";

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState(null);
  const [busyHours, setBusyHours] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, t, b, w, ai] = await Promise.all([
          API.get("/analytics/dashboard"),
          API.get("/analytics/no-show-trends", { params: { days: 14 } }),
          API.get("/analytics/busy-hours", { params: { days: 30 } }),
          API.get("/analytics/clinician-workload"),
          API.get("/analytics/ai-insights"),
        ]);
        if (cancelled) return;
        setDashboard(d.data.data || null);
        setTrends(t.data.data || null);
        setBusyHours(b.data.data || []);
        setWorkload(w.data.data || []);
        setAiInsights(ai.data.data || null);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const noShowChartData = useMemo(() => {
    if (!trends) return null;
    return {
      labels: trends.labels,
      datasets: [
        {
          label: "No-Show Rate (%)",
          data: trends.rates,
          borderColor: "#004FFF",
          backgroundColor: "rgba(239,68,68,0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [trends]);

  const busyHoursChartData = useMemo(() => {
    if (!busyHours.length) return null;
    return {
      labels: busyHours.map((b) => `${String(b.hour).padStart(2, "0")}:00`),
      datasets: [
        {
          label: "Appointments",
          data: busyHours.map((b) => b.count),
          backgroundColor: "#0066CC",
          borderRadius: 6,
        },
      ],
    };
  }, [busyHours]);

  const typeChartData = useMemo(() => {
    if (!aiInsights?.typeDistribution?.length) return null;
    return {
      labels: aiInsights.typeDistribution.map((t) => t.type),
      datasets: [
        {
          label: "Bookings",
          data: aiInsights.typeDistribution.map((t) => t.count),
          backgroundColor: "#51CF66",
          borderRadius: 6,
        },
      ],
    };
  }, [aiInsights]);

  const workloadChartData = useMemo(() => {
    if (!workload.length) return null;
    return {
      labels: workload.map((w) => w.name),
      datasets: [
        {
          label: "This Week",
          data: workload.map((w) => w.weekAppointments),
          backgroundColor: "#0066CC",
          borderRadius: 6,
        },
        {
          label: "Today",
          data: workload.map((w) => w.todayAppointments),
          backgroundColor: "#FFD93D",
          borderRadius: 6,
        },
      ],
    };
  }, [workload]);

  const cancellationRate = dashboard?.cancellationRate ?? 0;
  const avgCompat = aiInsights?.avgCompatibilityScore ?? 0;
  const smartPct = (() => {
    const src = aiInsights?.bookingSource;
    if (!src) return 0;
    const total = (src.smart || 0) + (src.manual || 0);
    return total > 0 ? Math.round((src.smart / total) * 100) : 0;
  })();

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold mb-2">Analytics & Reports</h2>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Avg Compatibility</p>
                  <p className="text-2xl font-bold">{avgCompat}/100</p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">AI pairing score this month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Smart Booking Rate</p>
                  <p className="text-2xl font-bold">{smartPct}%</p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">Share of AI-assisted bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FF6B6B] [box-shadow:0_4px_6px_-1px_rgba(255,107,107,0.4),0_2px_4px_-2px_rgba(255,107,107,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Cancellation Rate</p>
                  <p className="text-2xl font-bold">{cancellationRate}%</p>
                </div>
                <div className="w-10 h-10 bg-[#FF6B6B] rounded-sm flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">Month-to-date</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Busy Hours (last 30 days)</h2>
          {busyHoursChartData ? (
            <BarChart data={busyHoursChartData} />
          ) : (
            <p className="text-sm text-gray-500">No data yet.</p>
          )}
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3">
              No-Show Rate (last 14 days)
            </h2>
            {noShowChartData ? (
              <NoShowLineChart data={noShowChartData} />
            ) : (
              <p className="text-sm text-gray-500">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">
            Appointment Type Distribution
          </h2>
          {typeChartData ? (
            <BarChart data={typeChartData} />
          ) : (
            <p className="text-sm text-gray-500">No data yet.</p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Clinician Workload</h2>
          {workloadChartData ? (
            <BarChart
              data={workloadChartData}
              options={{
                responsive: true,
                plugins: { legend: { display: true, position: "bottom" } },
              }}
            />
          ) : (
            <p className="text-sm text-gray-500">No data yet.</p>
          )}
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-2 justify-between">
            <h2 className="text-lg font-semibold">Key Performance Indicators</h2>

            <Button size="sm" className="cursor-pointer" variant={"outline"}>
              <Proportions className="w-4 h-4" />
              Export Reports
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <KpiCard
              title="Avg No-Show Risk"
              value={`${((aiInsights?.avgNoShowRiskScore ?? 0) * 100).toFixed(0)}%`}
              label="Lower is better"
            />
            <KpiCard
              title="High-Risk Bookings"
              value={String(aiInsights?.riskBuckets?.high ?? 0)}
              label={`Low: ${aiInsights?.riskBuckets?.low ?? 0} • Med: ${aiInsights?.riskBuckets?.medium ?? 0}`}
            />
            <KpiCard
              title="Predicted vs Actual (No-Show)"
              value={`${((aiInsights?.predictedVsActual?.noShowAvgRisk ?? 0) * 100).toFixed(0)}%`}
              label={`Attended avg risk: ${((aiInsights?.predictedVsActual?.attendedAvgRisk ?? 0) * 100).toFixed(0)}%`}
            />
            <KpiCard
              title="Smart vs Manual Bookings"
              value={`${aiInsights?.bookingSource?.smart ?? 0} / ${aiInsights?.bookingSource?.manual ?? 0}`}
              label="This month"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, label }) {
  return (
    <Card className="gap-1 rounded-sm px-3 py-2 bg-[#E6E6E6]">
      <p className="font-semibold">{title}</p>
      <p className="font-normal">{value}</p>
      <p className="font-normal text-sm text-gray-600">{label}</p>
    </Card>
  );
}
