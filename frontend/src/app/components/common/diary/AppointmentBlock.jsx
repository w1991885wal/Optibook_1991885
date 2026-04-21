import { GripVertical } from "lucide-react";
import { cn } from "../../ui/utils";

const STATUS_CLASSES = {
  scheduled: "bg-linear-to-r from-indigo-500 to-teal-600 text-white",
  confirmed: "bg-linear-to-r from-emerald-500 to-teal-600 text-white",
  completed: "bg-gray-300 text-gray-700",
  cancelled: "bg-gray-200 text-gray-500 line-through",
  "no-show": "bg-red-200 text-red-900",
};

export default function AppointmentBlock({ data }) {
  if (data.isBreak) {
    return (
      <div className="bg-yellow-100 text-yellow-900 px-4 py-3 rounded-md">
        🍽 Lunch Break
      </div>
    );
  }

  const status = data.status || "scheduled";
  const statusCls = STATUS_CLASSES[status] || STATUS_CLASSES.scheduled;
  const draggable = !!data.id;

  const handleDragStart = (e) => {
    if (!data.id) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: data.id,
        startTime: data.startTime,
        optometristId: data.optometristId,
      }),
    );
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-md",
        draggable ? "cursor-move" : "",
        statusCls,
      )}
    >
      <GripVertical className="w-4 h-4 opacity-80" />
      <span className="font-semibold">{data.patient}</span>
      {data.type && <span className="opacity-90">• {data.type}</span>}
    </div>
  );
}
