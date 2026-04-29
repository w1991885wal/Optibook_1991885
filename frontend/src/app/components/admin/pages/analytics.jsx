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
  // Phase ML-Monitoring: high-risk upcoming list, fetched separately so the
  // ai-insights payload stays cacheable.
  const [highRiskUpcoming, setHighRiskUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, t, b, w, ai, hr] = await Promise.all([
          API.get("/analytics/dashboard"),
          API.get("/analytics/no-show-trends", { params: { days: 14 } }),
          API.get("/analytics/busy-hours", { params: { days: 30 } }),
          API.get("/analytics/clinician-workload"),
          API.get("/analytics/ai-insights"),
          API.get("/analytics/high-risk-upcoming", { params: { limit: 10 } }),
        ]);
        if (cancelled) return;
        setDashboard(d.data.data || null);
        setTrends(t.data.data || null);
        setBusyHours(b.data.data || []);
        setWorkload(w.data.data || []);
        setAiInsights(ai.data.data || null);
        setHighRiskUpcoming(hr.data.data || []);
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
    // Phase ML-Monitoring: overlay predicted-rate trend alongside actual.
    // Predicted = mean(noShowRiskScore × 100) per day. Honest framing: this
    // is a calibration audit of a static model, not learning feedback.
    const datasets = [
      {
        label: "Actual no-show rate (%)",
        data: trends.rates,
        borderColor: "#004FFF",
        backgroundColor: "rgba(0,79,255,0.10)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ];
    if (Array.isArray(trends.predictedRates)) {
      datasets.push({
        label: "Predicted no-show rate (%)",
        data: trends.predictedRates,
        borderColor: "#FF8A00",
        backgroundColor: "rgba(255,138,0,0.10)",
        borderDash: [6, 4],
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    return { labels: trends.labels, datasets };
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

      {/* Phase AI-2: trained no-show classifier — model performance card.
          Renders only when a model artifact is loaded server-side. */}
      {aiInsights?.model && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-2 justify-between">
              <div>
                <h2 className="text-lg font-semibold">Model performance</h2>
                <p className="text-xs text-gray-500">
                  Trained no-show risk classifier · last trained{" "}
                  {aiInsights.model.trainedAt
                    ? new Date(aiInsights.model.trainedAt).toLocaleString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "—"}
                </p>
              </div>
              <p className="text-xs text-gray-500 self-end">
                Sample size: {aiInsights.model.sampleSize ?? "—"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <KpiCard
                title="Accuracy"
                value={
                  typeof aiInsights.model.metrics?.accuracy === "number"
                    ? `${(aiInsights.model.metrics.accuracy * 100).toFixed(1)}%`
                    : "—"
                }
                label="Held-out test set"
              />
              <KpiCard
                title="Precision"
                value={
                  typeof aiInsights.model.metrics?.precision === "number"
                    ? `${(aiInsights.model.metrics.precision * 100).toFixed(1)}%`
                    : "—"
                }
                label="Of predicted no-shows"
              />
              <KpiCard
                title="Recall"
                value={
                  typeof aiInsights.model.metrics?.recall === "number"
                    ? `${(aiInsights.model.metrics.recall * 100).toFixed(1)}%`
                    : "—"
                }
                label="Of actual no-shows"
              />
              <KpiCard
                title="F1 score"
                value={
                  typeof aiInsights.model.metrics?.f1 === "number"
                    ? `${(aiInsights.model.metrics.f1 * 100).toFixed(1)}%`
                    : "—"
                }
                label="Balanced metric"
              />
              <KpiCard
                title="AUC"
                value={
                  typeof aiInsights.model.metrics?.auc === "number"
                    ? aiInsights.model.metrics.auc.toFixed(2)
                    : "—"
                }
                label="Ranking quality"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase ML-Monitoring — admin-friendly attendance insights.
          Tier 1 + Tier 2 Option B: human language for everyday use,
          technical details preserved in a collapsed advanced section
          for viva / dissertation reference. */}
      {aiInsights?.model && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Attendance insights</h2>
              <p className="text-xs text-gray-500 mt-1">
                Predicted attendance scores below help you spot patients
                likely to miss their appointment. Use them as guidance —
                high-risk patients are good candidates for a phone-confirm
                call before the visit.
              </p>
            </div>

            {/* Patients by predicted attendance — human-language buckets */}
            {Array.isArray(aiInsights.riskBucketPerformance) && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Patients by predicted attendance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-3">Group</th>
                        <th className="py-2 pr-3">Appointments</th>
                        <th className="py-2 pr-3">Completed</th>
                        <th className="py-2 pr-3">No-show</th>
                        <th className="py-2 pr-3">Confirmed missed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiInsights.riskBucketPerformance.map((b) => {
                        const friendlyLabel =
                          b.level === "low"
                            ? "Likely to attend"
                            : b.level === "medium"
                              ? "May need reminding"
                              : "High risk of missing";
                        const terminal = (b.completed || 0) + (b.noShow || 0);
                        return (
                          <tr key={b.level} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">
                              {friendlyLabel}
                            </td>
                            <td className="py-2 pr-3">{b.count}</td>
                            <td className="py-2 pr-3">{b.completed}</td>
                            <td className="py-2 pr-3">{b.noShow}</td>
                            <td className="py-2 pr-3">
                              {terminal === 0
                                ? "—"
                                : `${b.noShow} of ${terminal}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  "Confirmed missed" counts appointments that have already
                  happened (or were no-shows). Pending appointments are
                  shown in the "Appointments" total but not counted here
                  yet.
                </p>
              </div>
            )}

            {/* High-risk upcoming */}
            {highRiskUpcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  High-risk upcoming appointments
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500 border-b">
                      <tr>
                        <th className="py-2 pr-3">Risk</th>
                        <th className="py-2 pr-3">Patient</th>
                        <th className="py-2 pr-3">Optometrist</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highRiskUpcoming.map((r) => (
                        <tr
                          key={r.appointmentId}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {Math.round(r.noShowRiskScore * 100)}%
                          </td>
                          <td className="py-2 pr-3">
                            {r.patientName}
                            {r.patientNumber != null && (
                              <span className="ml-2 text-xs text-gray-500 tabular-nums">
                                #{r.patientNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3">{r.optometristName}</td>
                          <td className="py-2 pr-3">
                            {new Date(r.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 pr-3">{r.startTime}</td>
                          <td className="py-2 pr-3 text-gray-600">
                            {r.appointmentType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Top {highRiskUpcoming.length} non-cancelled future
                  appointments by predicted risk. Suggested action:
                  phone-confirm before the visit.
                </p>
              </div>
            )}

            {/* Tier 2 Option B: technical coefficients moved into a
                collapsed advanced section. Feature names translated into
                plain English for readability while preserving the raw
                numeric coefficients for the viva. */}
            {Array.isArray(aiInsights.model?.weights?.coefficients) && (
              <details className="border-t pt-3">
                <summary className="text-sm font-semibold cursor-pointer text-gray-700">
                  Model technical details (advanced)
                </summary>
                <div className="mt-3">
                  <p className="text-[11px] text-gray-500 mb-2">
                    For governance and audit. The model weighs these signals
                    when predicting whether a patient will miss their
                    appointment. A negative coefficient pushes predicted
                    risk down; a positive one pushes it up.
                  </p>
                  {(() => {
                    // Plain-English labels mapped from training feature names.
                    const FRIENDLY_LABEL = {
                      attendance_rate: "Past attendance rate",
                      prior_no_shows_180d:
                        "Recent missed appointments (last 180 days)",
                      lead_days: "Days booked in advance",
                      patient_age: "Patient age",
                      visit_count: "Number of past visits",
                      has_phone: "Phone number on file",
                      is_weekend: "Weekend appointment",
                      hour_of_day: "Time of day",
                      is_first_or_last_slot:
                        "First or last slot of the day",
                      appt_type_eye_test: "Appointment is Eye Test",
                      appt_type_cl: "Appointment is Contact Lens",
                    };
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs text-gray-500 border-b">
                            <tr>
                              <th className="py-2 pr-3">Feature</th>
                              <th className="py-2 pr-3">Coefficient</th>
                              <th className="py-2 pr-3">Direction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiInsights.model.weights.featureNames.map(
                              (name, i) => {
                                const c =
                                  aiInsights.model.weights.coefficients[i];
                                return (
                                  <tr
                                    key={name}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-2 pr-3">
                                      {FRIENDLY_LABEL[name] || name}
                                    </td>
                                    <td className="py-2 pr-3 tabular-nums">
                                      {c >= 0 ? "+" : ""}
                                      {c.toFixed(4)}
                                    </td>
                                    <td className="py-2 pr-3 text-xs">
                                      {c > 0
                                        ? "Pushes risk up"
                                        : c < 0
                                          ? "Pushes risk down"
                                          : "Neutral"}
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                            <tr>
                              <td className="py-2 pr-3 italic text-gray-600">
                                Baseline (bias term)
                              </td>
                              <td className="py-2 pr-3 tabular-nums">
                                {(aiInsights.model.weights.intercept >= 0
                                  ? "+"
                                  : "") +
                                  aiInsights.model.weights.intercept.toFixed(
                                    4,
                                  )}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-500">
                                Starting score before any patient signal
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Coefficients are standardised — larger absolute values
                    indicate a stronger influence on the predicted score.
                    Static logistic regression model trained on{" "}
                    {aiInsights.model.sampleSize ?? "—"} appointments
                    {aiInsights.model.trainedAt
                      ? ` (${new Date(aiInsights.model.trainedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`
                      : ""}
                    . The model does not retrain at runtime.
                  </p>
                </div>
              </details>
            )}

            {/* Avg risk by optometrist + by weekday */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(aiInsights.avgRiskByOptometrist) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Average risk by optometrist (this month)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 border-b">
                        <tr>
                          <th className="py-2 pr-3">Optometrist</th>
                          <th className="py-2 pr-3">Appts</th>
                          <th className="py-2 pr-3">Avg risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiInsights.avgRiskByOptometrist.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-2 text-gray-500 text-xs"
                            >
                              No scored appointments this month.
                            </td>
                          </tr>
                        )}
                        {aiInsights.avgRiskByOptometrist.map((row) => (
                          <tr
                            key={row.optometrist}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pr-3">{row.optometrist}</td>
                            <td className="py-2 pr-3">{row.count}</td>
                            <td className="py-2 pr-3 tabular-nums">
                              {row.count > 0
                                ? `${Math.round(row.avgRisk * 100)}%`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {Array.isArray(aiInsights.avgRiskByWeekday) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Average risk by weekday (this month)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 border-b">
                        <tr>
                          <th className="py-2 pr-3">Day</th>
                          <th className="py-2 pr-3">Appts</th>
                          <th className="py-2 pr-3">Avg risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiInsights.avgRiskByWeekday.map((row) => (
                          <tr
                            key={row.day}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pr-3">{row.day}</td>
                            <td className="py-2 pr-3">{row.count}</td>
                            <td className="py-2 pr-3 tabular-nums">
                              {row.count > 0
                                ? `${Math.round(row.avgRisk * 100)}%`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
