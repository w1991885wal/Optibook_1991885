import { useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "../../ui/utils";

const STATUS_CLASSES = {
  scheduled: "bg-linear-to-r from-indigo-500 to-teal-600 text-white",
  confirmed: "bg-linear-to-r from-emerald-500 to-teal-600 text-white",
  "in-progress": "bg-linear-to-r from-amber-500 to-orange-600 text-white",
  completed: "bg-gray-300 text-gray-700",
  cancelled: "bg-gray-200 text-gray-500 line-through",
  "no-show": "bg-red-200 text-red-900",
};

// Phase AI-2: no-show risk badge. Cutoffs match backend predictNoShowRisk.
// Hidden on terminal statuses (completed / cancelled / no-show) to avoid
// styling noise — those blocks are already greyed out.
const RISK_HIDDEN_STATUSES = new Set(["completed", "cancelled", "no-show"]);

const riskBadge = (score) => {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  if (score >= 0.66) {
    return { label: "High", cls: "bg-red-200 text-red-900" };
  }
  if (score >= 0.33) {
    return { label: "Med", cls: "bg-amber-200 text-amber-900" };
  }
  return { label: "Low", cls: "bg-emerald-200 text-emerald-900" };
};

export default function AppointmentBlock({ data, onClick }) {
  // Native HTML drag does not normally fire a click event at the end of a
  // drag, but we belt-and-brace with a ref that's flipped during dragstart
  // and cleared on dragend — any click that fires while the ref is truthy
  // is suppressed so a reschedule drag can never also open the dialog.
  const draggingRef = useRef(false);

  if (data.isBreak) {
    return (
      <div className="bg-yellow-100 text-yellow-900 px-4 py-3 rounded-md">
        Lunch Break
      </div>
    );
  }

  const status = data.status || "scheduled";
  const statusCls = STATUS_CLASSES[status] || STATUS_CLASSES.scheduled;
  const draggable = !!data.id && status !== "completed" && status !== "cancelled";
  const clickable = !!data.id && typeof onClick === "function";
  const showRisk = !RISK_HIDDEN_STATUSES.has(status);
  const risk = showRisk ? riskBadge(data.noShowRiskScore) : null;

  const handleDragStart = (e) => {
    if (!data.id) return;
    draggingRef.current = true;
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

  const handleDragEnd = () => {
    // Clear on the next tick so any racing click is still caught.
    setTimeout(() => {
      draggingRef.current = false;
    }, 0);
  };

  const handleClick = (e) => {
    if (!clickable) return;
    if (draggingRef.current) return;
    e.stopPropagation();
    onClick(data);
  };

  const handleKeyDown = (e) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(data);
    }
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        clickable ? `Open appointment: ${data.patient}` : undefined
      }
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-md select-none",
        draggable ? "cursor-move" : clickable ? "cursor-pointer" : "",
        "hover:brightness-105 transition",
        statusCls,
      )}
    >
      <GripVertical className="w-4 h-4 opacity-80" />
      <span className="font-semibold">{data.patient}</span>
      {data.type && <span className="opacity-90">• {data.type}</span>}
      {risk && (
        <span
          className={cn(
            "ml-auto text-[11px] font-medium rounded px-2 py-0.5",
            risk.cls,
          )}
          title={`No-show risk: ${data.noShowRiskScore.toFixed(2)}`}
        >
          {risk.label}
        </span>
      )}
      {status === "in-progress" && (
        <span
          className={cn(
            "text-xs bg-white/20 rounded px-2 py-0.5",
            risk ? "" : "ml-auto",
          )}
        >
          in progress
        </span>
      )}
    </div>
  );
}
