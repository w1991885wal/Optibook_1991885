import AppointmentBlock from "./AppointmentBlock";

export default function TimeSlot({
  time,
  appointment,
  onDrop,
  onAppointmentClick,
}) {
  const handleDragOver = (e) => {
    if (onDrop) e.preventDefault();
  };
  const handleDrop = (e) => {
    if (!onDrop) return;
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      onDrop(JSON.parse(raw), time);
    } catch {
      /* ignore malformed payloads */
    }
  };

  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
      <div className="text-sm text-gray-600 pt-3">{time}</div>

      <div className="min-h-13" onDragOver={handleDragOver} onDrop={handleDrop}>
        {appointment ? (
          <AppointmentBlock
            data={appointment}
            onClick={onAppointmentClick}
          />
        ) : (
          <div className="h-13 rounded-md border border-dashed" />
        )}
      </div>
    </div>
  );
}
