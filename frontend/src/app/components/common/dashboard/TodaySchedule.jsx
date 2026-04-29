import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { Clock, TrendingUp } from "lucide-react";
import API from "../../../../lib/api";
import AppointmentDetailDialog from "../../optometrist/AppointmentDetailDialog";

// Optometrist dashboard "Today's Schedule" panel. Pulls real appointments for
// the signed-in optom and reuses the canonical AppointmentDetailDialog for
// Start / End / Reschedule / View — no parallel logic.

const formatTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const STATUS_COLOR = {
  scheduled: "bg-yellow-500",
  confirmed: "bg-yellow-500",
  "in-progress": "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-gray-400",
  "no-show": "bg-red-500",
};

const todayLabel = () =>
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const initials = (name) =>
  (name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function TodaysSchedule({ setActive }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, []);

  const fetchToday = async () => {
    try {
      setLoading(true);
      const res = await API.get("/appointments", { params: range });
      const list = res.data?.data || [];
      list.sort((a, b) =>
        (a.startTime || "").localeCompare(b.startTime || ""),
      );
      setAppointments(list);
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Failed to load today's schedule",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDialogClose = (didChange) => {
    setSelected(null);
    if (didChange) fetchToday();
  };

  return (
    <>
      <Card className="py-4">
        <CardContent className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">
              Today's Schedule — {todayLabel()}
            </h2>
            <Button size="sm" onClick={() => setActive("diary")}>
              View Full Diary
            </Button>
          </div>

          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && appointments.length === 0 && (
            <p className="text-sm text-gray-500">
              No appointments scheduled for today.
            </p>
          )}

          {/* Appointment list */}
          <div className="space-y-3">
            {appointments.map((appt) => {
              const name = appt.patient
                ? `${appt.patient.firstName || ""} ${appt.patient.lastName || ""}`.trim()
                : "Unknown patient";
              const status = appt.status || "scheduled";
              const isFinal =
                status === "completed" ||
                status === "cancelled" ||
                status === "no-show";
              const inProgress = status === "in-progress";
              const upcoming = status === "scheduled" || status === "confirmed";

              return (
                <div
                  key={appt._id}
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md shadow-sm ${
                    isFinal ? "opacity-70" : ""
                  }`}
                >
                  {/* Left info */}
                  <div className="flex gap-3 flex-1">
                    <Avatar>
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-gray-500 text-sm">
                        {appt.appointmentType}
                      </div>
                      <div className="text-gray-400 text-xs flex gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {formatTime(appt.startTime)}
                        </span>
                        {appt.duration && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {appt.duration}{" "}
                            min
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        {upcoming && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setSelected(appt)}
                            >
                              Start Appointment
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelected(appt)}
                            >
                              Reschedule
                            </Button>
                          </>
                        )}
                        {inProgress && (
                          <Button size="sm" onClick={() => setSelected(appt)}>
                            End Appointment
                          </Button>
                        )}
                        {isFinal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(appt)}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right status badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                    <span
                      className={`text-white px-2 py-1 rounded-md text-xs font-medium capitalize ${
                        STATUS_COLOR[status] || "bg-gray-400"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AppointmentDetailDialog
        open={!!selected}
        appointment={selected}
        onClose={handleDialogClose}
      />
    </>
  );
}
