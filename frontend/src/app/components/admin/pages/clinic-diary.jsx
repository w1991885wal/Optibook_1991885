import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DiaryHeader from "../../clinic-diary/header";
import OptometristTabs from "../../clinic-diary/optometristTab";
import DoctorColumn from "../../clinic-diary/doctorColumn";
import API from "../../../../lib/api";

const formatTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

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

const fmtDateHeader = (d) =>
  d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function ClinicDiary() {
  const [date, setDate] = useState(() => new Date());
  const [activeDoctor, setActiveDoctor] = useState("all");
  const [optometrists, setOptometrists] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get("/optometrists")
      .then((res) => setOptometrists(res.data.data || []))
      .catch(() => toast.error("Failed to load optometrists"));
  }, []);

  const fetchAppointments = async (targetDate = date) => {
    try {
      setLoading(true);
      const iso = targetDate.toISOString();
      const res = await API.get("/appointments", {
        params: { startDate: iso, endDate: iso },
      });
      setAppointments(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load diary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(date);

  }, [date]);

  const tabs = useMemo(
    () =>
      optometrists.map((o) => ({
        id: o._id,
        label: `Dr. ${o.firstName} ${o.lastName || ""}`.trim(),
      })),
    [optometrists],
  );

  const visibleOpts = useMemo(() => {
    if (activeDoctor === "all") return optometrists;
    return optometrists.filter((o) => o._id === activeDoctor);
  }, [optometrists, activeDoctor]);

  const grouped = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      const optId = a.optometrist?._id;
      if (!optId) continue;
      if (!map[optId]) map[optId] = {};
      const timeLabel = formatTime(a.startTime);
      map[optId][timeLabel] = {
        id: a._id,
        startTime: a.startTime,
        optometristId: optId,
        patient: a.patient
          ? `${a.patient.firstName || ""} ${a.patient.lastName || ""}`.trim()
          : "Unknown",
        type: a.appointmentType,
        status: a.status,
        time: timeLabel,
      };
    }
    return map;
  }, [appointments]);

  const shiftDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  };

  const handleDropReschedule = async (
    payload,
    targetOptometristId,
    newTimeLabel,
  ) => {
    if (!payload || !payload.id) return;
    if (
      payload.optometristId &&
      payload.optometristId !== targetOptometristId
    ) {
      toast.error("Moving between optometrists is not supported yet.");
      return;
    }
    const newHHmm = toHHmm(newTimeLabel);
    if (!newHHmm) return;
    if (newHHmm === payload.startTime) return;
    try {
      await API.put(`/appointments/${payload.id}/reschedule`, {
        date: date.toISOString(),
        startTime: newHHmm,
      });
      toast.success("Appointment rescheduled");
      fetchAppointments(date);
    } catch (e) {
      toast.error(e.response?.data?.message || "Reschedule failed");
    }
  };

  return (
    <div className="bg-white rounded-xl p-6">
      <h1 className="text-xl font-bold mb-4">Clinic Diary</h1>

      <DiaryHeader
        date={fmtDateHeader(date)}
        onPrev={() => shiftDate(-1)}
        onToday={() => setDate(new Date())}
        onNext={() => shiftDate(1)}
      />

      <OptometristTabs
        items={tabs}
        active={activeDoctor}
        setActive={setActiveDoctor}
      />

      {loading && <p className="text-sm text-gray-500 mb-3">Loading…</p>}

      {visibleOpts.length === 0 ? (
        <p className="text-sm text-gray-500">No optometrists to display.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {visibleOpts.map((o) => (
            <DoctorColumn
              key={o._id}
              doctor={{
                id: o._id,
                name: `Dr. ${o.firstName} ${o.lastName || ""}`.trim(),
                room: o.roomNumber ? `Room ${o.roomNumber}` : "—",
              }}
              byTime={grouped[o._id] || {}}
              onDropReschedule={handleDropReschedule}
            />
          ))}
        </div>
      )}
    </div>
  );
}
