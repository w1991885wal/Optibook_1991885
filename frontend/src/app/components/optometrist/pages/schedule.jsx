import { useState } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import WorkingHoursCard from "../../common/schedule/WorkingHours";

const ScheduleSettings = () => {
  // --- State ---
  const [workingHours, setWorkingHours] = useState({
    monFri: { from: "09:00", to: "17:00" },
    lunch: { from: "12:00", to: "13:00" },
    saturday: "Not Working",
  });

  const [timeOff, setTimeOff] = useState({ from: "", to: "", reason: "" });
  const [preferences, setPreferences] = useState({
    duration: "30 minutes",
    buffer: "No Buffer",
    maxPatients: 16,
  });

  // --- Handlers ---
  const handleWorkingHoursChange = (day, field, value) =>
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));

  const handleTimeOffChange = (field, value) =>
    setTimeOff((prev) => ({ ...prev, [field]: value }));

  const handlePreferencesChange = (field, value) =>
    setPreferences((prev) => ({ ...prev, [field]: value }));

  return (
    <main className="space-y-2">
      {/* Header */}
      <div className="content-header mb-4">
        <h1 className="mb-2 text-gray-400 font-normal">Schedule Settings ⏰</h1>
      </div>

      {/* --- Working Hours Card --- */}
      <WorkingHoursCard
        workingHours={workingHours}
        handleWorkingHoursChange={handleWorkingHoursChange}
      />

      {/* --- Time Off & Holidays Card --- */}
      <Card className="pt-4">
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">Time Off & Holidays</h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Request Time Off
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                value={timeOff.from}
                onChange={(e) => handleTimeOffChange("from", e.target.value)}
              />
              <span className="hidden sm:flex items-center px-2 text-sm text-gray-500">
                to
              </span>
              <input
                type="date"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                value={timeOff.to}
                onChange={(e) => handleTimeOffChange("to", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Reason</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Optional: Holiday, Training, etc."
              value={timeOff.reason}
              onChange={(e) => handleTimeOffChange("reason", e.target.value)}
            />
          </div>

          <Button onClick={() => console.log("Time Off Request", timeOff)}>
            📝 Submit Request
          </Button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="mb-4 text-lg font-semibold">Upcoming Time Off</h3>

            <div className="bg-gray-50 p-4 rounded-md mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="text-gray-800">Summer Holiday</strong>
                  <br />
                  <span className="text-gray-500 text-sm">
                    July 15-29, 2026 (2 weeks)
                  </span>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  Approved
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Appointment Preferences Card --- */}
      <Card className="pt-4">
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">Appointment Preferences</h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Default Appointment Duration
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={preferences.duration}
              onChange={(e) =>
                handlePreferencesChange("duration", e.target.value)
              }
            >
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Buffer Time Between Appointments
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={preferences.buffer}
              onChange={(e) =>
                handlePreferencesChange("buffer", e.target.value)
              }
            >
              <option>No Buffer</option>
              <option>5 minutes</option>
              <option>10 minutes</option>
              <option>15 minutes</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Maximum Patients Per Day
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={preferences.maxPatients}
              onChange={(e) =>
                handlePreferencesChange("maxPatients", parseInt(e.target.value))
              }
            />
          </div>

          <Button onClick={() => console.log("Saved Preferences", preferences)}>
            💾 Save Preferences
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default ScheduleSettings;
