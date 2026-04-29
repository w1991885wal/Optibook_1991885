import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import WorkingHoursCard from "../../common/schedule/WorkingHours";
import { ToggleButton } from "../../common/toggle";
import {
  exportAllData,
  backupDatabase,
  downloadReport,
  REPORT_OPTIONS,
} from "../../../../lib/adminTools";
import {
  getReminderTemplates,
  updateReminderTemplates,
  REMINDER_PLACEHOLDERS,
} from "../../../../lib/settings";

export default function AdminSettings({ onLogout }) {
  const [workingHours, setWorkingHours] = useState({
    monFri: { from: "09:00", to: "17:00" },
    lunch: { from: "12:00", to: "13:00" },
    saturday: "Not Working",
  });
  // Phase-E card contract: WorkingHoursCard now owns a lunch row that calls
  // handleLunchChange(field, value). Admin settings have no backend
  // persistence, so we just hold local state so the input doesn't throw.
  const [lunchBreak, setLunchBreak] = useState({
    start: "12:00",
    end: "13:00",
  });
  const handleLunchChange = (field, value) =>
    setLunchBreak((prev) => ({ ...prev, [field]: value }));

  // Admin tools: which confirm dialog (if any) is currently open.
  // Values: null | "export" | "backup" | "reports".
  const [toolDialog, setToolDialog] = useState(null);
  const [reportKey, setReportKey] = useState(REPORT_OPTIONS[0].key);
  const [running, setRunning] = useState(false);

  const closeToolDialog = () => {
    if (running) return;
    setToolDialog(null);
  };

  const runExport = async () => {
    try {
      setRunning(true);
      await exportAllData();
      toast.success("Export ready — download started");
      setToolDialog(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setRunning(false);
    }
  };

  const runBackup = async () => {
    try {
      setRunning(true);
      await backupDatabase();
      toast.success("Backup ready — download started");
      setToolDialog(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Backup failed");
    } finally {
      setRunning(false);
    }
  };

  const runReport = async () => {
    try {
      setRunning(true);
      await downloadReport(reportKey);
      toast.success("Report ready — download started");
      setToolDialog(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Report failed");
    } finally {
      setRunning(false);
    }
  };

  // Reminder templates — load + edit + save.
  // Backend seeds defaults on first read so the editor always has values.
  const [templates, setTemplates] = useState({
    reminderSmsTemplate: "",
    reminderEmailSubject: "",
    reminderEmailBody: "",
  });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getReminderTemplates();
        if (cancelled) return;
        setTemplates({
          reminderSmsTemplate: res.data?.data?.reminderSmsTemplate || "",
          reminderEmailSubject: res.data?.data?.reminderEmailSubject || "",
          reminderEmailBody: res.data?.data?.reminderEmailBody || "",
        });
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message ||
              "Failed to load reminder templates",
          );
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTemplateChange = (field, value) =>
    setTemplates((prev) => ({ ...prev, [field]: value }));

  const handleSaveTemplates = async () => {
    try {
      setSavingTemplates(true);
      const res = await updateReminderTemplates(templates);
      // Reflect server-side trim so the editor matches what was stored.
      setTemplates({
        reminderSmsTemplate: res.data?.data?.reminderSmsTemplate || "",
        reminderEmailSubject: res.data?.data?.reminderEmailSubject || "",
        reminderEmailBody: res.data?.data?.reminderEmailBody || "",
      });
      toast.success("Reminder templates saved");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save reminder templates",
      );
    } finally {
      setSavingTemplates(false);
    }
  };
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
            <h1 className="text-2xl font-semibold">Clinic Settings</h1>
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
              Save Clinic Information
            </Button>
          </div>
        </Card>

        {/* Operating Hours */}
        <WorkingHoursCard
          workingHours={workingHours}
          lunchBreak={lunchBreak}
          handleWorkingHoursChange={handleWorkingHoursChange}
          handleLunchChange={handleLunchChange}
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
            <Button>Save Notification Preferences</Button>
          </CardContent>
        </Card>

        {/* Reminder Templates — editable SMS / email reminder content.
            Stored centrally; substitution will happen at send time once a
            real provider is wired. No emojis added per scope rule. */}
        <Card className="pt-4">
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold border-b pb-2">
                Reminder Templates
              </h2>
              <p className="text-xs text-gray-500 mt-2">
                Edit the SMS reminder, email subject and email body. These
                templates are stored centrally and will be used when reminders
                are sent. Token substitution happens at send time.
              </p>
            </div>

            {loadingTemplates ? (
              <p className="text-sm text-gray-500">
                Loading reminder templates…
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    SMS reminder
                  </Label>
                  <Input
                    type="text"
                    value={templates.reminderSmsTemplate}
                    onChange={(e) =>
                      handleTemplateChange(
                        "reminderSmsTemplate",
                        e.target.value,
                      )
                    }
                    maxLength={320}
                    placeholder="Single-line SMS message"
                  />
                  <div className="text-[11px] text-gray-400">
                    {templates.reminderSmsTemplate.length}/320 characters
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    Email subject
                  </Label>
                  <Input
                    type="text"
                    value={templates.reminderEmailSubject}
                    onChange={(e) =>
                      handleTemplateChange(
                        "reminderEmailSubject",
                        e.target.value,
                      )
                    }
                    maxLength={200}
                    placeholder="Email subject line"
                  />
                  <div className="text-[11px] text-gray-400">
                    {templates.reminderEmailSubject.length}/200 characters
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Email body</Label>
                  <textarea
                    value={templates.reminderEmailBody}
                    onChange={(e) =>
                      handleTemplateChange(
                        "reminderEmailBody",
                        e.target.value,
                      )
                    }
                    maxLength={4000}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                    placeholder="Multi-line email body. Line breaks are preserved."
                  />
                  <div className="text-[11px] text-gray-400">
                    {templates.reminderEmailBody.length}/4000 characters
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Available placeholders
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_PLACEHOLDERS.map((tok) => (
                      <code
                        key={tok}
                        className="text-[11px] px-2 py-1 bg-white border rounded text-gray-700"
                      >
                        {tok}
                      </code>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Insert these tokens to personalise messages.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveTemplates}
                    disabled={savingTemplates}
                  >
                    {savingTemplates ? "Saving…" : "Save reminder templates"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Management — admin tools (read-only).
            Each action opens a confirm dialog before running. */}
        <Card className="pt-4">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">
              System Management
            </h2>
            <p className="text-xs text-gray-500">
              Read-only export and reporting actions. No data is modified or
              deleted.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setToolDialog("export")}
              >
                Export All Data
              </Button>
              <Button
                variant="secondary"
                onClick={() => setToolDialog("backup")}
              >
                Backup Database
              </Button>
              <Button
                variant="secondary"
                onClick={() => setToolDialog("reports")}
              >
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Export confirm dialog */}
      <Dialog
        open={toolDialog === "export"}
        onOpenChange={(v) => (!v ? closeToolDialog() : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export all data</DialogTitle>
            <DialogDescription>
              Downloads a JSON bundle containing patients, optometrists,
              appointments, visit records and waitlist entries. User accounts
              and passwords are excluded. Nothing is modified or deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeToolDialog}
              disabled={running}
            >
              Cancel
            </Button>
            <Button onClick={runExport} disabled={running}>
              {running ? "Preparing…" : "Download export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup confirm dialog */}
      <Dialog
        open={toolDialog === "backup"}
        onOpenChange={(v) => (!v ? closeToolDialog() : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup database</DialogTitle>
            <DialogDescription>
              Downloads a JSON snapshot of every collection (users included,
              passwords excluded). For backup only — restoration is not
              automated. Nothing is modified or deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeToolDialog}
              disabled={running}
            >
              Cancel
            </Button>
            <Button onClick={runBackup} disabled={running}>
              {running ? "Preparing…" : "Download backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports confirm dialog with picker */}
      <Dialog
        open={toolDialog === "reports"}
        onOpenChange={(v) => (!v ? closeToolDialog() : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
            <DialogDescription>
              Downloads a CSV file (opens in Excel). Read-only — nothing is
              modified or deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REPORT_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-3 border rounded-md p-3 text-sm cursor-pointer hover:bg-gray-50 ${
                  reportKey === opt.key ? "border-blue-500 bg-blue-50/40" : ""
                }`}
              >
                <input
                  type="radio"
                  name="admin-report"
                  className="mt-1"
                  checked={reportKey === opt.key}
                  onChange={() => setReportKey(opt.key)}
                />
                <span>
                  <span className="font-medium block">{opt.label}</span>
                  <span className="text-xs text-gray-500">
                    {opt.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeToolDialog}
              disabled={running}
            >
              Cancel
            </Button>
            <Button onClick={runReport} disabled={running}>
              {running ? "Preparing…" : "Download CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
