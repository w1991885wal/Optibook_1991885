import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "../../ui/card";
import DiaryHeader from "../../common/diary/DiaryHeader";
import DayTabs from "../../common/diary/DayTabs";
import TimeSlot from "../../common/diary/TimeSlot";
import AppointmentDetailDialog from "../AppointmentDetailDialog";
import API from "../../../../lib/api";
import { getMeOptom } from "../../../../lib/optometrist";

const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat"];

const startOfWeekMonday = (d) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  const day = n.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  n.setDate(n.getDate() + diff);
  return n;
};
const addDays = (d, n) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};
const sameYMD = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const fmtShort = (d) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtLong = (d) =>
  d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const toHHmm = (time12) => {
  const m = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const p = m[3].toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
};
const formatTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

// Convert a "9:00 AM" style rail label back to minutes since midnight so we
// can test overlap against the HH:mm lunch window.
const labelToMinutes = (label) => {
  const m = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const p = m[3].toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + min;
};
const hhmmToMinutes = (s) => {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export default function Diary() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekMonday(new Date()),
  );
  const [activeDay, setActiveDay] = useState("mon");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [lunchBreak, setLunchBreak] = useState(null);

  // Fetch the signed-in optom's lunch break once so the rail can highlight
  // the overlapping slot. Failure is silent — the diary still works without
  // the lunch band; we just skip the pseudo-block injection.
  useEffect(() => {
    (async () => {
      try {
        const res = await getMeOptom();
        const lb = res.data?.data?.lunchBreak;
        if (lb?.start && lb?.end) setLunchBreak(lb);
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

  const weekDates = useMemo(
    () => DAY_KEYS.map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = weekDates[weekDates.length - 1];

  const days = useMemo(
    () =>
      DAY_KEYS.map((key, i) => ({
        key,
        label: `${key[0].toUpperCase() + key.slice(1)} ${fmtShort(weekDates[i])}`,
      })),
    [weekDates],
  );

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await API.get("/appointments", {
        params: {
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
        },
      });
      setAppointments(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load diary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [weekStart]);

  // Build a { day -> { time -> blockData } } map for render. Each block
  // carries a `full` reference back to the raw appointment so the detail
  // dialog has everything it needs without re-fetching.
  const byDayTime = useMemo(() => {
    const out = {};
    for (const a of appointments) {
      const d = new Date(a.date);
      const idx = weekDates.findIndex((wd) => sameYMD(wd, d));
      if (idx < 0) continue;
      const key = DAY_KEYS[idx];
      if (!out[key]) out[key] = {};
      const t = formatTime(a.startTime);
      out[key][t] = {
        id: a._id,
        startTime: a.startTime,
        patient: a.patient
          ? `${a.patient.firstName || ""} ${a.patient.lastName || ""}`.trim()
          : "Unknown",
        type: a.appointmentType,
        status: a.status,
        optometristId: a.optometrist?._id,
        // Phase AI-2: surface predicted no-show risk for the diary badge.
        noShowRiskScore: a.noShowRiskScore,
        full: a,
      };
    }
    return out;
  }, [appointments, weekDates]);

  const activeDayDate = weekDates[DAY_KEYS.indexOf(activeDay)] || weekStart;
  const rangeTitle = `Week of ${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;

  const handleDrop = async (payload, newTimeLabel) => {
    if (!payload || !payload.id) return;
    const newHHmm = toHHmm(newTimeLabel);
    if (!newHHmm) return;
    if (newHHmm === payload.startTime) return;
    try {
      await API.put(`/appointments/${payload.id}/reschedule`, {
        date: activeDayDate.toISOString(),
        startTime: newHHmm,
      });
      toast.success("Appointment rescheduled");
      fetchAppointments();
    } catch (e) {
      toast.error(e.response?.data?.message || "Reschedule failed");
    }
  };

  const handleAppointmentClick = (block) => {
    if (!block?.full) return;
    setSelectedAppointment(block.full);
  };

  const handleDialogClose = (didChange) => {
    setSelectedAppointment(null);
    if (didChange) fetchAppointments();
  };

  const dayAppts = byDayTime[activeDay] || {};
  const railSet = new Set(TIME_SLOTS);
  const offRail = Object.entries(dayAppts).filter(([t]) => !railSet.has(t));

  // Compute which rail rows overlap the lunch window. Each rail slot spans
  // 60 minutes starting at its label. We only inject a break pseudo-block
  // where there is no real appointment occupying that slot.
  const lunchRange = useMemo(() => {
    if (!lunchBreak) return null;
    const s = hhmmToMinutes(lunchBreak.start);
    const e = hhmmToMinutes(lunchBreak.end);
    if (s == null || e == null || s >= e) return null;
    return [s, e];
  }, [lunchBreak]);

  const isLunchSlot = (label) => {
    if (!lunchRange) return false;
    const start = labelToMinutes(label);
    if (start == null) return false;
    const end = start + 60;
    // overlap: slot[start,end) intersects lunch[s,e)
    return start < lunchRange[1] && end > lunchRange[0];
  };

  return (
    <>
      <h1 className="mb-2 text-gray-400 font-normal">My Diary</h1>
      <Card>
        <CardContent className="p-6">
          <DiaryHeader
            title={rangeTitle}
            subtitle={fmtLong(activeDayDate)}
            onPrev={() => setWeekStart(addDays(weekStart, -7))}
            onToday={() => setWeekStart(startOfWeekMonday(new Date()))}
            onNext={() => setWeekStart(addDays(weekStart, 7))}
          />
          <DayTabs days={days} active={activeDay} onChange={setActiveDay} />
          {loading && (
            <p className="text-sm text-gray-500 mb-3">Loading…</p>
          )}
          <div className="space-y-3">
            {TIME_SLOTS.map((time) => {
              const real = dayAppts[time];
              // Safeguard #4: lunch highlight only when the slot has no real
              // appointment. A real booking always takes visual priority.
              const block =
                real || (isLunchSlot(time) ? { isBreak: true } : undefined);
              return (
                <TimeSlot
                  key={time}
                  time={time}
                  appointment={block}
                  onDrop={handleDrop}
                  onAppointmentClick={handleAppointmentClick}
                />
              );
            })}
            {offRail.length > 0 && (
              <div className="pt-3 mt-3 border-t border-gray-200 space-y-3">
                {offRail.map(([time, appt]) => (
                  <TimeSlot
                    key={time}
                    time={time}
                    appointment={appt}
                    onAppointmentClick={handleAppointmentClick}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AppointmentDetailDialog
        open={!!selectedAppointment}
        appointment={selectedAppointment}
        onClose={handleDialogClose}
      />
    </>
  );
}
