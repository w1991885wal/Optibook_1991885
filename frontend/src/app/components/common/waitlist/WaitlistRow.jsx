import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

const fmtAdded = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `Added: ${dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

const priorityClass = (p) => {
  if (p === "high") return "bg-red-100 text-red-900";
  if (p === "low") return "bg-gray-100 text-gray-700";
  return "bg-blue-100 text-blue-700"; // medium
};

// Phase D4: real waitlist row. Expects a populated waitlist document from
// GET /api/waitlist and parent-supplied handlers for confirm + remove.
export default function WaitlistRow({ entry, onConfirm, onRemove, busy }) {
  const patient = entry.patient || {};
  const name =
    `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div>
            <p className="font-semibold">{name}</p>
            <div className="text-sm text-gray-500 flex flex-wrap gap-1 mt-1">
              <span className="font-semibold">{entry.appointmentType}</span>
              <span className="opacity-90">• {fmtAdded(entry.addedDate)}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`capitalize ${priorityClass(entry.priority)}`}
          >
            {entry.priority || "medium"} priority
          </Badge>

          <Button
            size="sm"
            onClick={() => onConfirm?.(entry)}
            disabled={!!busy}
          >
            Confirm Booking
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRemove?.(entry)}
            disabled={!!busy}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
