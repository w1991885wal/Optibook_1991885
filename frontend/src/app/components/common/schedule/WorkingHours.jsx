import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";

export default function WorkingHoursCard({
  workingHours,
  handleWorkingHoursChange,
}) {
  return (
    <Card className="pt-4">
      <CardContent className="space-y-4">
        <h2 className="text-lg font-semibold">Working Hours</h2>

        {/* Monday - Friday */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Monday - Friday</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="time"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              value={workingHours.monFri.from}
              onChange={(e) =>
                handleWorkingHoursChange("monFri", "from", e.target.value)
              }
            />
            <span className="hidden sm:flex items-center px-2 text-sm text-gray-500">
              to
            </span>
            <input
              type="time"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              value={workingHours.monFri.to}
              onChange={(e) =>
                handleWorkingHoursChange("monFri", "to", e.target.value)
              }
            />
          </div>
        </div>

        {/* Lunch Break */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Lunch Break</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="time"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              value={workingHours.lunch.from}
              onChange={(e) =>
                handleWorkingHoursChange("lunch", "from", e.target.value)
              }
            />
            <span className="hidden sm:flex items-center px-2 text-sm text-gray-500">
              to
            </span>
            <input
              type="time"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              value={workingHours.lunch.to}
              onChange={(e) =>
                handleWorkingHoursChange("lunch", "to", e.target.value)
              }
            />
          </div>
        </div>

        {/* Saturday */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Saturday</label>
          <select
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={workingHours.saturday}
            onChange={(e) =>
              setWorkingHours((prev) => ({
                ...prev,
                saturday: e.target.value,
              }))
            }
          >
            <option>Not Working</option>
            <option>9:00 AM - 1:00 PM</option>
            <option>9:00 AM - 5:00 PM</option>
          </select>
        </div>

        <Button
          className="mt-2"
          onClick={() => console.log("Saved Working Hours", workingHours)}
        >
          💾 Save Working Hours
        </Button>
      </CardContent>
    </Card>
  );
}
