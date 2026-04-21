import AppointmentItem from "./appointmentItem";

const DEFAULT_RAIL = [
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

export default function DoctorColumn({
  doctor,
  byTime = {},
  rail = DEFAULT_RAIL,
  onDropReschedule,
}) {
  const appts = Object.values(byTime).filter(Boolean);
  const count = appts.filter((a) => !a.isLunch).length;

  const onDragOver = (e) => {
    if (onDropReschedule) e.preventDefault();
  };

  const onDropAt = (time) => (e) => {
    if (!onDropReschedule) return;
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      onDropReschedule(JSON.parse(raw), doctor.id, time);
    } catch {
      /* ignore malformed payloads */
    }
  };

  // Off-rail appointments render at the bottom so non-hourly bookings stay visible.
  const railSet = new Set(rail);
  const offRail = Object.entries(byTime).filter(([t]) => !railSet.has(t));

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold">{doctor.name}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {doctor.room} • {count} appointments
      </p>

      <div className="space-y-2">
        {rail.map((time) => {
          const appt = byTime[time];
          return (
            <div
              key={time}
              onDragOver={onDragOver}
              onDrop={onDropAt(time)}
              className="min-h-[36px]"
            >
              {appt ? (
                <AppointmentItem slot={{ ...appt, time }} />
              ) : (
                <div className="h-9 rounded-md border border-dashed text-xs text-gray-300 px-2 py-1">
                  {time}
                </div>
              )}
            </div>
          );
        })}

        {offRail.length > 0 && (
          <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
            {offRail.map(([time, appt]) => (
              <AppointmentItem key={time} slot={{ ...appt, time }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
