const STATUS_CLASSES = {
  scheduled: "bg-blue-50 text-blue-900",
  confirmed: "bg-emerald-50 text-emerald-900",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-50 text-gray-400 line-through",
  "no-show": "bg-red-50 text-red-900",
};

export default function AppointmentItem({ slot }) {
  if (slot.isLunch) {
    return (
      <div className="bg-yellow-100 text-yellow-900 px-3 py-2 rounded-md text-sm">
        🍽 {slot.time} • Lunch
      </div>
    );
  }

  const status = slot.status || "scheduled";
  const cls = STATUS_CLASSES[status] || STATUS_CLASSES.scheduled;
  const draggable = !!slot.id;

  const handleDragStart = (e) => {
    if (!slot.id) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: slot.id,
        startTime: slot.startTime,
        optometristId: slot.optometristId,
      }),
    );
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`${cls} px-3 py-2 rounded-md text-sm ${draggable ? "cursor-move" : ""}`}
    >
      <span className="font-medium">{slot.time}</span>
      <span className="ml-2">• {slot.patient}</span>
      {slot.type && <span className="ml-2 text-xs opacity-70">({slot.type})</span>}
    </div>
  );
}
