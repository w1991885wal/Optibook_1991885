import { Card, CardContent } from "../../ui/card";
import { Switch } from "../../ui/switch";

// Phase E: uniform 7-day editor. Every day — including Saturday and Sunday —
// is driven through the same handleWorkingHoursChange(day, field, value) path.
// No day-specific code, no special enums, no direct parent-state access.

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function WorkingHoursCard({
  workingHours,
  lunchBreak,
  handleWorkingHoursChange,
  handleLunchChange,
}) {
  return (
    <Card className="pt-4">
      <CardContent className="space-y-4">
        <h2 className="text-lg font-semibold">Working hours</h2>
        <p className="text-xs text-gray-500">
          Toggle a day off or set its start and end time. Each day is independent.
        </p>

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = workingHours[key] || {
              working: false,
              start: "09:00",
              end: "17:00",
            };
            return (
              <div
                key={key}
                className="grid grid-cols-[120px_90px_1fr_auto_1fr] items-center gap-3"
              >
                <div className="text-sm font-medium">{label}</div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!day.working}
                    onCheckedChange={(v) =>
                      handleWorkingHoursChange(key, "working", v)
                    }
                  />
                  <span className="text-xs text-gray-500">
                    {day.working ? "Open" : "Off"}
                  </span>
                </div>

                <input
                  type="time"
                  disabled={!day.working}
                  value={day.start || "09:00"}
                  onChange={(e) =>
                    handleWorkingHoursChange(key, "start", e.target.value)
                  }
                  className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-400"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="time"
                  disabled={!day.working}
                  value={day.end || "17:00"}
                  onChange={(e) =>
                    handleWorkingHoursChange(key, "end", e.target.value)
                  }
                  className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Lunch break</h3>
          <div className="grid grid-cols-[120px_1fr_auto_1fr] items-center gap-3">
            <div className="text-sm text-gray-600">Daily</div>
            <input
              type="time"
              value={lunchBreak?.start || "12:00"}
              onChange={(e) => handleLunchChange("start", e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="time"
              value={lunchBreak?.end || "13:00"}
              onChange={(e) => handleLunchChange("end", e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
