import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  completeVisit,
  getVisitByAppointment,
  startAppointment,
  upsertVisit,
} from "../../../lib/visitRecord";
import API from "../../../lib/api";

// Phase D1 detail dialog for the optometrist diary. Shows the key patient
// context an optom needs during a visit, surfaces the lightweight VisitRecord
// form, and drives Start → Save notes → Complete & Set Recall.

// Phase R2: each recall control offers an explicit "None" plus the four
// month-interval options. "0" represents None and is omitted from the
// outgoing payload.
const RECALL_OPTIONS = [
  { value: "0", label: "None" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
  { value: "24", label: "2 years" },
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// YYYY-MM-DD in local time, used by the reschedule date input.
const toYmd = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmt12 = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const fmtDob = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusBadgeVariant = (status) => {
  if (status === "scheduled" || status === "confirmed") return "default";
  if (status === "in-progress") return "secondary";
  if (status === "completed") return "secondary";
  return "outline";
};

export default function AppointmentDetailDialog({
  open,
  appointment,
  onClose,
}) {
  const [status, setStatus] = useState(appointment?.status || "scheduled");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  // Phase R2: split recall pickers. Defaults: eye test 6 months (matches
  // the previous single-recall default); contact lens "None" (only set
  // when clinically relevant).
  const [eyeTestRecallMonths, setEyeTestRecallMonths] = useState("6");
  const [contactLensRecallMonths, setContactLensRecallMonths] = useState("0");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  // Patient-level recall dates shown in the header context block. Updated
  // from the response after a successful complete.
  const [patientEyeTestRecall, setPatientEyeTestRecall] = useState(
    appointment?.patient?.eyeTestRecallDate || null,
  );
  const [patientCLRecall, setPatientCLRecall] = useState(
    appointment?.patient?.contactLensRecallDate || null,
  );
  const [dirty, setDirty] = useState(false); // track if parent should refetch

  // Reschedule sub-panel state — only meaningful while status is scheduled /
  // confirmed. Hits the same /appointments/available + /:id/reschedule
  // endpoints that diary drag-drop already uses, so backend conflict
  // validation is reused unchanged.
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Reset + load visit record whenever a new appointment is opened.
  useEffect(() => {
    if (!open || !appointment?._id) return;
    setStatus(appointment.status);
    setPatientEyeTestRecall(appointment.patient?.eyeTestRecallDate || null);
    setPatientCLRecall(appointment.patient?.contactLensRecallDate || null);
    setDiagnosis("");
    setNotes("");
    setPrescription("");
    setEyeTestRecallMonths("6");
    setContactLensRecallMonths("0");
    setDirty(false);
    setRescheduleDate(toYmd(appointment.date));
    setRescheduleSlots([]);

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getVisitByAppointment(appointment._id);
        if (cancelled) return;
        const rec = res.data?.data;
        if (rec) {
          setDiagnosis(rec.diagnosis || "");
          setNotes(rec.notes || "");
          setPrescription(rec.prescription || "");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Failed to load visit record",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, appointment?._id]);

  // Fetch available slots for the reschedule sub-panel whenever the chosen
  // date changes (and only while the appointment is still upcoming).
  useEffect(() => {
    if (!open || !appointment?._id) return;
    const upcoming =
      appointment.status === "scheduled" || appointment.status === "confirmed";
    if (!upcoming) return;
    const optomId = appointment.optometrist?._id;
    if (!optomId || !rescheduleDate) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingSlots(true);
        const res = await API.get("/appointments/available", {
          params: {
            optometristId: optomId,
            date: rescheduleDate,
            appointmentType: appointment.appointmentType,
          },
        });
        if (!cancelled) setRescheduleSlots(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Failed to load slots",
          );
          setRescheduleSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, appointment?._id, appointment?.status, rescheduleDate]);

  const handleStart = async () => {
    if (!appointment?._id) return;
    try {
      setStarting(true);
      await startAppointment(appointment._id);
      setStatus("in-progress");
      setDirty(true);
      toast.success("Appointment started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start appointment");
    } finally {
      setStarting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!appointment?._id) return;
    try {
      setSaving(true);
      await upsertVisit(appointment._id, {
        diagnosis,
        notes,
        prescription,
      });
      setDirty(true);
      toast.success("Visit notes saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!appointment?._id) return;
    const eyeTestN = Number(eyeTestRecallMonths);
    const clN = Number(contactLensRecallMonths);
    if (!eyeTestN && !clN) {
      toast.error(
        "Set at least one recall (eye test or contact lens) before completing",
      );
      return;
    }
    try {
      setCompleting(true);
      // Build payload — omit a recall field when its picker is set to None.
      const payload = { diagnosis, notes, prescription };
      if (eyeTestN) payload.eyeTestRecallMonths = eyeTestN;
      if (clN) payload.contactLensRecallMonths = clN;

      const res = await completeVisit(appointment._id, payload);
      setStatus("completed");
      setPatientEyeTestRecall(res.data?.data?.eyeTestRecallDate || null);
      setPatientCLRecall(res.data?.data?.contactLensRecallDate || null);
      setDirty(true);
      toast.success("Appointment completed and recall set");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to complete appointment",
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleReschedule = async (newStartTime) => {
    if (!appointment?._id || !rescheduleDate || !newStartTime) return;
    try {
      setRescheduling(true);
      await API.put(`/appointments/${appointment._id}/reschedule`, {
        date: new Date(rescheduleDate).toISOString(),
        startTime: newStartTime,
      });
      toast.success("Appointment rescheduled");
      // Close + signal parent refetch — same pattern as Start/Complete.
      onClose?.(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reschedule failed");
    } finally {
      setRescheduling(false);
    }
  };

  const handleClose = () => {
    onClose?.(dirty);
  };

  if (!appointment) return null;

  const patient = appointment.patient || {};
  const canStart = status === "scheduled" || status === "confirmed";
  const canEdit = status === "in-progress";
  const isFinal =
    status === "completed" || status === "cancelled" || status === "no-show";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {patient.firstName || "Unknown"} {patient.lastName || ""}
            <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {appointment.appointmentType} · {fmtDate(appointment.date)} ·{" "}
            {appointment.startTime}
          </DialogDescription>
        </DialogHeader>

        {/* Patient context */}
        <div className="rounded-md border p-4 text-sm space-y-1.5 bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">DOB:</span>{" "}
              {fmtDob(patient.dateOfBirth)}
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>{" "}
              {patient.phone || "—"}
            </div>
            <div>
              <span className="text-gray-500">Language:</span>{" "}
              {patient.languagePreference || "English"}
            </div>
            <div>
              <span className="text-gray-500">Accessibility:</span>{" "}
              {patient.accessibilityNeeds || "—"}
            </div>
            <div>
              <span className="text-gray-500">Eye test recall:</span>{" "}
              {fmtDate(patientEyeTestRecall)}
            </div>
            <div>
              <span className="text-gray-500">Contact lens recall:</span>{" "}
              {fmtDate(patientCLRecall)}
            </div>
          </div>
        </div>

        {/* Reschedule sub-panel — upcoming appointments only. Reuses the
            canonical /appointments/available + /appointments/:id/reschedule
            endpoints; the same conflict validation as diary drag-drop. */}
        {canStart && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="font-semibold text-sm">Reschedule</h4>
            <div className="grid grid-cols-[120px_1fr] items-center gap-2">
              <Label className="text-xs text-gray-500">New date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                min={toYmd(new Date())}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            {loadingSlots ? (
              <p className="text-xs text-gray-500">Loading slots…</p>
            ) : rescheduleSlots.length === 0 ? (
              <p className="text-xs text-gray-500">
                No available slots for that date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {rescheduleSlots.map((s) => {
                  const sameAsCurrent =
                    rescheduleDate === toYmd(appointment.date) &&
                    s === appointment.startTime;
                  return (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={sameAsCurrent || rescheduling}
                      onClick={() => handleReschedule(s)}
                      title={sameAsCurrent ? "Current slot" : ""}
                    >
                      {fmt12(s)}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Visit record form */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Visit record</h4>
          {loading ? (
            <p className="text-sm text-gray-500">Loading visit record…</p>
          ) : (
            <>
              <div>
                <Label className="text-xs text-gray-500 mb-1">
                  Findings / summary
                </Label>
                <Input
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. mild astigmatism, stable"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1">
                  Notes / follow-up
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Free-text notes about today's visit"
                  disabled={!canEdit}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1">
                  Prescription (optional)
                </Label>
                <Input
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="OD / OS / ADD values"
                  disabled={!canEdit}
                />
              </div>

              {canEdit && (
                <div className="border-t pt-3 space-y-3">
                  <p className="text-xs text-gray-500">
                    Set at least one recall before completing.
                  </p>

                  <div>
                    <Label className="text-xs text-gray-500 mb-2">
                      Eye test recall
                    </Label>
                    <RadioGroup
                      value={eyeTestRecallMonths}
                      onValueChange={setEyeTestRecallMonths}
                      className="grid grid-cols-2 gap-2"
                    >
                      {RECALL_OPTIONS.map((opt) => (
                        <label
                          key={`eye-${opt.value}`}
                          className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                        >
                          <RadioGroupItem value={opt.value} />
                          {opt.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 mb-2">
                      Contact lens recall
                    </Label>
                    <RadioGroup
                      value={contactLensRecallMonths}
                      onValueChange={setContactLensRecallMonths}
                      className="grid grid-cols-2 gap-2"
                    >
                      {RECALL_OPTIONS.map((opt) => (
                        <label
                          key={`cl-${opt.value}`}
                          className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                        >
                          <RadioGroupItem value={opt.value} />
                          {opt.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )}

              {isFinal && !canEdit && (
                <p className="text-xs text-gray-500 italic">
                  This appointment is {status}. Visit record is read-only.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {canStart && (
            <Button onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : "Start appointment"}
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={handleSaveNotes}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save notes"}
              </Button>
              <Button onClick={handleComplete} disabled={completing}>
                {completing ? "Completing…" : "Complete & set recall"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
