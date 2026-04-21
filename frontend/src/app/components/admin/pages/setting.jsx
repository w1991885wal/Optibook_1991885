import React, { useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import WorkingHoursCard from "../../common/schedule/WorkingHours";
import { ToggleButton } from "../../common/toggle";

export default function AdminSettings({ onLogout }) {
  const [workingHours, setWorkingHours] = useState({
    monFri: { from: "09:00", to: "17:00" },
    lunch: { from: "12:00", to: "13:00" },
    saturday: "Not Working",
  });
  const appointmentSettings = [
    {
      title: "Smart Slot Allocation",
      description: "Automatically assign patients to optimal slots",
      checked: true,
    },
    {
      title: "Auto-Fill Waitlist",
      description: "Fill cancelled slots from waitlist automatically",
      checked: true,
    },
    {
      title: "Email Reminders",
      description: "Send automated email reminders to patients",
      checked: true,
    },
    {
      title: "SMS Reminders",
      description: "Send automated SMS reminders to patients",
      checked: true,
    },
    {
      title: "Online Booking",
      description: "Allow patients to book appointments online",
      checked: true,
    },
  ];

  const handleWorkingHoursChange = (day, field, value) =>
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));

  return (
    <div className="app-container">
      <main className="main-content space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Clinic Settings ⚙️</h1>
            <p className="text-gray-500 mt-1">Dashboard / Settings</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-1">Clinic Information</h2>

          <div className="space-y-4">
            {/* Clinic Name */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Clinic Name
              </label>
              <input
                type="text"
                defaultValue="OptiBook Vision Center"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                defaultValue="123 High Street, London, UK, SW1A 1AA"
                rows={3}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  defaultValue="+44 20 1234 5678"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue="info@optibook.com"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              className="mt-2 cursor-pointer"
              onClick={() => console.log("Saved Working Hours", workingHours)}
            >
              💾 Save Clinic Information
            </Button>
          </div>
        </Card>

        {/* Operating Hours */}
        <WorkingHoursCard
          workingHours={workingHours}
          handleWorkingHoursChange={handleWorkingHoursChange}
        />

        {/* Appointment Settings */}
        <Card className="pt-4">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">
              Appointment Settings
            </h2>
            <div className="space-y-3">
              {appointmentSettings.map((setting, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-md border bg-gray-50"
                >
                  <div>
                    <strong>{setting.title}</strong>
                    <p className="text-gray-500 text-sm mt-1">
                      {setting.description}
                    </p>
                  </div>
                  <ToggleButton
                    defaultOn={setting.checked}
                    onChange={(value) => {
                      console.log(
                        `${setting.title} is now ${value ? "ON" : "OFF"}`,
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="pt-4">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">
              Notification Preferences
            </h2>
            <div className="grid gap-4">
              <div className="flex flex-col gap-1">
                <label className="form-label">
                  Reminder Time Before Appointment
                </label>
                <select className="w-full px-3 py-2 border rounded-md text-sm">
                  <option>1 hour</option>
                  <option>6 hours</option>
                  <option>24 hours</option>
                  <option defaultValue>48 hours</option>
                  <option>1 week</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="form-label">Admin Notification Email</label>
                <input
                  type="email"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  defaultValue="admin@optibook.com"
                />
              </div>
            </div>
            <Button>💾 Save Notification Preferences</Button>
          </CardContent>
        </Card>

        {/* System Management */}
        <Card className="pt-4">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">
              System Management
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary">📥 Export All Data</Button>
              <Button variant="secondary">🔄 Backup Database</Button>
              <Button variant="secondary">📊 Generate Reports</Button>
              <Button variant="secondary">🧹 Clear Old Records</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
