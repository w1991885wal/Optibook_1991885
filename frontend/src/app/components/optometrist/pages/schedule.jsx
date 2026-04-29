import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import WorkingHoursCard from "../../common/schedule/WorkingHours";
import { getMeOptom, updateMeOptom } from "../../../../lib/optometrist";

// Phase E: schedule settings — real persistence against PUT /optometrists/me.
// Time Off & Holidays has been removed per spec.

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_DEFAULT = { working: true, start: "09:00", end: "17:00" };
const WEEKEND_DEFAULT = { working: false, start: "09:00", end: "13:00" };

// Normalise a loaded day record against sensible defaults — guarantees the
// editor has a well-shaped object even if Atlas has partial / legacy data.
const normaliseDay = (key, raw) => {
  const base = key === "saturday" || key === "sunday"
    ? WEEKEND_DEFAULT
    : WEEKDAY_DEFAULT;
  if (!raw || typeof raw !== "object") return { ...base };
  return {
    working: typeof raw.working === "boolean" ? raw.working : base.working,
    start: raw.start || base.start,
    end: raw.end || base.end,
  };
};

const normaliseLunch = (raw) => ({
  start: raw?.start || "12:00",
  end: raw?.end || "13:00",
});

const normaliseHours = (raw) => {
  const out = {};
  for (const key of DAY_KEYS) out[key] = normaliseDay(key, raw?.[key]);
  return out;
};

export default function ScheduleSettings() {
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [workingHours, setWorkingHours] = useState(() => normaliseHours(null));
  const [lunchBreak, setLunchBreak] = useState(() => normaliseLunch(null));
  const [prefs, setPrefs] = useState({
    defaultAppointmentDuration: 30,
    bufferTime: 10,
    maxAppointmentsPerDay: 16,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getMeOptom();
        const d = res.data?.data || {};
        setWorkingHours(normaliseHours(d.workingHours));
        setLunchBreak(normaliseLunch(d.lunchBreak));
        setPrefs({
          defaultAppointmentDuration: d.defaultAppointmentDuration ?? 30,
          bufferTime: d.bufferTime ?? 10,
          maxAppointmentsPerDay: d.maxAppointmentsPerDay ?? 16,
        });
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load schedule settings",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleWorkingHoursChange = (day, field, value) =>
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));

  const handleLunchChange = (field, value) =>
    setLunchBreak((prev) => ({ ...prev, [field]: value }));

  const validateBeforeSave = () => {
    for (const key of DAY_KEYS) {
      const d = workingHours[key];
      if (d.working && d.start >= d.end) {
        toast.error(
          `${key[0].toUpperCase() + key.slice(1)}: start must be before end`,
        );
        return false;
      }
    }
    if (lunchBreak.start >= lunchBreak.end) {
      toast.error("Lunch break: start must be before end");
      return false;
    }
    return true;
  };

  const handleSaveWorkingHours = async () => {
    if (!validateBeforeSave()) return;
    try {
      setSavingHours(true);
      await updateMeOptom({ workingHours, lunchBreak });
      toast.success("Working hours saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save hours");
    } finally {
      setSavingHours(false);
    }
  };

  const handleSavePrefs = async () => {
    const dur = Number(prefs.defaultAppointmentDuration);
    const buf = Number(prefs.bufferTime);
    const max = Number(prefs.maxAppointmentsPerDay);
    if (!Number.isInteger(dur) || dur < 5 || dur > 240) {
      toast.error("Default duration must be 5–240 minutes");
      return;
    }
    if (!Number.isInteger(buf) || buf < 0 || buf > 60) {
      toast.error("Buffer must be 0–60 minutes");
      return;
    }
    if (!Number.isInteger(max) || max < 1 || max > 64) {
      toast.error("Max patients per day must be 1–64");
      return;
    }
    try {
      setSavingPrefs(true);
      await updateMeOptom({
        defaultAppointmentDuration: dur,
        bufferTime: buf,
        maxAppointmentsPerDay: max,
      });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading schedule settings…</p>;
  }

  return (
    <main className="space-y-4">
      <div className="content-header mb-4">
        <h1 className="mb-2 text-gray-400 font-normal">Schedule settings</h1>
      </div>

      <WorkingHoursCard
        workingHours={workingHours}
        lunchBreak={lunchBreak}
        handleWorkingHoursChange={handleWorkingHoursChange}
        handleLunchChange={handleLunchChange}
      />

      <div className="flex justify-end">
        <Button onClick={handleSaveWorkingHours} disabled={savingHours}>
          {savingHours ? "Saving…" : "Save working hours"}
        </Button>
      </div>

      <Card className="pt-4">
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold">Appointment preferences</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Default duration (min)
              </Label>
              <Input
                type="number"
                min={5}
                max={240}
                value={prefs.defaultAppointmentDuration}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    defaultAppointmentDuration: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Buffer between appointments (min)
              </Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={prefs.bufferTime}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, bufferTime: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Max patients / day
              </Label>
              <Input
                type="number"
                min={1}
                max={64}
                value={prefs.maxAppointmentsPerDay}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    maxAppointmentsPerDay: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePrefs} disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
