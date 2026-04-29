import { useEffect, useState } from "react";
import { Clock, Sparkles, Calendar as CalendarIcon, User } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import Calendar from "../ui/update-calendar";
import API from "../../../lib/api";

// Patient-facing booking flow. Auto-assign only: the clinic picks the
// optometrist, the patient picks type + date + time. Manual optom selection
// has been removed. The AI story stays visible by showing the assigned
// optometrist + compatibility score + reasoning alongside the time slots.
//
// Failure modes are friendly:
//   - recommend-optometrist returns nothing  → "No optometrist available for this date."
//   - /appointments/available returns empty  → same message, invites another date.
//   - network error                          → toast, modal stays open, state preserved.

const APPOINTMENT_TYPES = [
  "Eye Test",
  "Contact Lens Fitting",
  "Contact Lens Follow-up",
  "PCO Test",
  "PCO Test + Eye Test",
];

export function BookingModal({ open, onClose }) {
  // Booking-Manual: two-mode patient flow.
  //   "predictive" — original AI-assisted flow (unchanged behaviour)
  //   "manual"     — patient picks optometrist + date + time directly
  const [mode, setMode] = useState("predictive");

  const [step, setStep] = useState(1);
  const [appointmentType, setAppointmentType] = useState("");
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-assigned optometrist + AI signals for this (type, date) — Predictive.
  const [assignedOptom, setAssignedOptom] = useState(null); // full recommend payload
  const [assignReasons, setAssignReasons] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Manual-mode state.
  const [optometrists, setOptometrists] = useState([]);
  const [loadingOptoms, setLoadingOptoms] = useState(false);
  const [manualOptomId, setManualOptomId] = useState("");
  const [manualSlots, setManualSlots] = useState([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);

  const [loadingAssign, setLoadingAssign] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Full reset on close — restores the default Predictive mode.
  const handleReset = () => {
    setMode("predictive");
    setStep(1);
    setAppointmentType("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
    setAssignedOptom(null);
    setAssignReasons([]);
    setAvailableSlots([]);
    setManualOptomId("");
    setManualSlots([]);
    setLoadingAssign(false);
    setLoadingManualSlots(false);
    setSubmitting(false);
  };

  // Mode-switch reset — back to step 1 with all cross-mode state cleared
  // so a stale optom or slot from one mode can't leak into the other.
  const handleModeChange = (next) => {
    if (next === mode) return;
    setMode(next);
    setStep(1);
    setAppointmentType("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setAssignedOptom(null);
    setAssignReasons([]);
    setAvailableSlots([]);
    setManualOptomId("");
    setManualSlots([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // When the patient picks a date in step 2, we auto-recommend an optometrist
  // and fetch their available slots in one pass. Reset slot selection so a
  // stale time can't carry over between dates.
  useEffect(() => {
    if (step !== 2 || !selectedDate || !appointmentType) return;

    let cancelled = false;
    setLoadingAssign(true);
    setSelectedTime("");
    setAvailableSlots([]);
    setAssignedOptom(null);
    setAssignReasons([]);

    (async () => {
      try {
        // 1) Ask the AI for the best optometrist for this (type, date).
        const recRes = await API.post("/ai/recommend-optometrist", {
          patientId: null, // backend resolves from req.user for patient role
          appointmentType,
          date: selectedDate.toISOString(),
        });
        const top = recRes.data.data?.[0];
        if (cancelled) return;

        if (!top) {
          toast.error(
            "No optometrist is available on that date. Please try another.",
          );
          setLoadingAssign(false);
          return;
        }

        // 2) Fetch their real available slots for that date.
        const slotsRes = await API.get("/appointments/available", {
          params: {
            optometristId: top.optometristId,
            date: selectedDate.toISOString(),
            appointmentType,
          },
        });
        if (cancelled) return;

        const slots = slotsRes.data.data || [];
        if (slots.length === 0) {
          toast.message(
            "That day is fully booked for the assigned optometrist — try another date.",
          );
        }

        // 3) Ask the AI for reasons / compatibility breakdown for the same
        //    optom so we can surface them next to the slot grid. Best-effort.
        let reasons = [];
        try {
          const detailRes = await API.post("/ai/recommend-slots", {
            patientId: null,
            optometristId: top.optometristId,
            date: selectedDate.toISOString(),
            appointmentType,
          });
          reasons = detailRes.data.data?.[0]?.reasons || [];
        } catch (_) {
          /* non-fatal */
        }

        if (cancelled) return;
        setAssignedOptom(top);
        setAssignReasons(reasons);
        setAvailableSlots(slots);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err.response?.data?.message ||
            "Could not auto-assign an optometrist — please try another date.",
        );
      } finally {
        if (!cancelled) setLoadingAssign(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, selectedDate, appointmentType]);

  // Manual mode: fetch the optometrist list once when the user lands on
  // step 2 of the manual flow. Cached for the lifetime of the modal so a
  // back-and-forth between steps doesn't re-fetch.
  useEffect(() => {
    if (!open) return;
    if (mode !== "manual") return;
    if (optometrists.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingOptoms(true);
        const res = await API.get("/optometrists");
        if (cancelled) return;
        setOptometrists(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Could not load optometrists",
          );
        }
      } finally {
        if (!cancelled) setLoadingOptoms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, optometrists.length]);

  // Manual mode: fetch slots whenever (optom, date, type) are all chosen.
  // Same /appointments/available endpoint the rest of the app uses, so
  // server-side conflict + working-hours validation runs identically.
  useEffect(() => {
    if (mode !== "manual") return;
    if (!manualOptomId || !selectedDate || !appointmentType) {
      setManualSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingManualSlots(true);
        setSelectedTime("");
        const res = await API.get("/appointments/available", {
          params: {
            optometristId: manualOptomId,
            date: selectedDate.toISOString(),
            appointmentType,
          },
        });
        if (cancelled) return;
        setManualSlots(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Could not load available times",
          );
          setManualSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingManualSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, manualOptomId, selectedDate, appointmentType]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !appointmentType) {
      toast.error("Please complete all booking details.");
      return;
    }
    // Resolve which optometrist applies to this submission based on mode.
    const optomId =
      mode === "manual" ? manualOptomId : assignedOptom?.optometristId;
    if (!optomId) {
      toast.error("Please select an optometrist.");
      return;
    }
    const optomDisplayName =
      mode === "manual"
        ? (() => {
            const o = optometrists.find((x) => x._id === manualOptomId);
            return o
              ? `Dr. ${o.firstName || ""} ${o.lastName || ""}`.trim()
              : "your optometrist";
          })()
        : `Dr. ${assignedOptom?.firstName || ""}${assignedOptom?.lastName ? " " + assignedOptom.lastName : ""}`;

    try {
      setSubmitting(true);
      await API.post("/appointments", {
        optometristId: optomId,
        date: selectedDate,
        startTime: selectedTime,
        appointmentType,
        specialRequirements: notes,
        // Booking-Manual: smartBooking flag is the canonical signal of
        // whether the patient used AI. Predictive=true, Manual=false.
        smartBooking: mode === "predictive",
      });

      toast.success("Appointment booked!", {
        description: `You'll be seen by ${optomDisplayName} on ${selectedDate.toLocaleDateString(
          "en-GB",
          { day: "numeric", month: "short" },
        )} at ${selectedTime}.`,
      });
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return !!appointmentType;
      case 2:
        if (mode === "manual") {
          return !!manualOptomId && !!selectedDate && !!selectedTime;
        }
        return !!selectedDate && !!selectedTime && !!assignedOptom;
      case 3:
        if (mode === "manual") {
          return (
            !!appointmentType &&
            !!manualOptomId &&
            !!selectedDate &&
            !!selectedTime
          );
        }
        return (
          !!appointmentType &&
          !!selectedDate &&
          !!selectedTime &&
          !!assignedOptom
        );
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book an appointment</DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Appointment type"
              : step === 2
                ? "Date & time"
                : "Confirm"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Booking-Manual: mode switch. Predictive is default; Manual lets
              the patient pick the optometrist directly. Switching resets the
              flow to step 1 so cross-mode state can't leak. */}
          <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-1 w-fit">
            <Button
              type="button"
              size="sm"
              variant={mode === "predictive" ? "default" : "ghost"}
              onClick={() => handleModeChange("predictive")}
              disabled={submitting}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Predictive
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "ghost"}
              onClick={() => handleModeChange("manual")}
              disabled={submitting}
            >
              <User className="w-4 h-4 mr-1" />
              Manual
            </Button>
          </div>

          {/* ── Step 1: appointment type ── */}
          {step === 1 && (
            <div className="space-y-4">
              {mode === "predictive" ? (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="font-medium flex items-center gap-2 text-purple-900">
                    <Sparkles className="w-4 h-4" /> Predictive booking
                  </p>
                  <p className="text-sm text-purple-800 mt-1">
                    We'll match you with the best optometrist based on your
                    needs and their availability — no need to pick one
                    yourself.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium flex items-center gap-2 text-blue-900">
                    <User className="w-4 h-4" /> Manual booking
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Choose your optometrist, date and time directly. We'll
                    still validate availability before confirming.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger id="appointmentType">
                    <SelectValue placeholder="Choose an appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Step 2 (Predictive): date + auto-assigned optom + time ── */}
          {step === 2 && mode === "predictive" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Select a date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {selectedDate && (
                <div className="rounded-lg border bg-white p-4">
                  {loadingAssign ? (
                    <p className="text-sm text-purple-700 animate-pulse">
                      Finding the best optometrist for you…
                    </p>
                  ) : assignedOptom ? (
                    <>
                      <div className="flex items-start gap-4 pb-4 border-b">
                        <Avatar className="w-14 h-14">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignedOptom.optometristId}`}
                          />
                          <AvatarFallback>
                            {assignedOptom.firstName?.[0] || "D"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Auto-assigned
                          </p>
                          <p className="font-semibold text-lg">
                            Dr. {assignedOptom.firstName}
                            {assignedOptom.lastName
                              ? ` ${assignedOptom.lastName}`
                              : ""}
                          </p>
                          {typeof assignedOptom.compatibilityScore ===
                            "number" && (
                            <p className="text-sm text-gray-600">
                              Compatibility score:{" "}
                              <span className="font-medium">
                                {assignedOptom.compatibilityScore}/100
                              </span>
                            </p>
                          )}
                          {/* Phase AI-3: ML-predicted attendance line.
                              Hidden when prediction unavailable — the
                              recommendation still works without it. */}
                          {typeof assignedOptom.predictedAttendance ===
                            "number" && (
                            <p className="text-sm text-gray-600">
                              Predicted attendance:{" "}
                              <span className="font-medium">
                                {Math.round(
                                  assignedOptom.predictedAttendance * 100,
                                )}
                                %
                              </span>
                            </p>
                          )}
                          {assignReasons.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {assignReasons.slice(0, 3).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4">
                        <Label className="mb-2 block">
                          Available times
                        </Label>
                        {availableSlots.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No free slots on this date — try another.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlots.map((time) => (
                              <Button
                                key={time}
                                variant={
                                  selectedTime === time ? "default" : "outline"
                                }
                                onClick={() => setSelectedTime(time)}
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                {time}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No optometrist available for that date. Please try another.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2 (Manual): optom dropdown + date + slot grid ── */}
          {step === 2 && mode === "manual" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="manualOptom">Optometrist</Label>
                <Select
                  value={manualOptomId}
                  onValueChange={(v) => {
                    setManualOptomId(v);
                    setSelectedTime("");
                  }}
                  disabled={loadingOptoms || optometrists.length === 0}
                >
                  <SelectTrigger id="manualOptom">
                    <SelectValue
                      placeholder={
                        loadingOptoms
                          ? "Loading optometrists…"
                          : "Choose an optometrist"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {optometrists.map((o) => (
                      <SelectItem key={o._id} value={o._id}>
                        Dr. {o.firstName}
                        {o.lastName ? ` ${o.lastName}` : ""}
                        {o.specialty ? ` · ${o.specialty}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select a date</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    value={selectedDate}
                    onChange={(d) => {
                      setSelectedDate(d);
                      setSelectedTime("");
                    }}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {manualOptomId && selectedDate && (
                <div className="rounded-lg border bg-white p-4">
                  <Label className="mb-2 block">Available times</Label>
                  {loadingManualSlots ? (
                    <p className="text-sm text-gray-500">Loading times…</p>
                  ) : manualSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No free slots for this optometrist on the chosen date —
                      try another date or another optometrist.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {manualSlots.map((time) => (
                        <Button
                          key={time}
                          variant={
                            selectedTime === time ? "default" : "outline"
                          }
                          onClick={() => setSelectedTime(time)}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Slots reflect the optometrist's working hours and
                    existing bookings. Server-side conflict validation runs
                    again on confirm.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-blue-50 p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" /> Appointment summary
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-gray-600">Type:</span>{" "}
                    {appointmentType}
                  </p>
                  <p>
                    <span className="text-gray-600">Date:</span>{" "}
                    {selectedDate?.toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p>
                    <span className="text-gray-600">Time:</span> {selectedTime}
                  </p>
                </div>
              </div>

              {mode === "predictive" ? (
                <div className="rounded-lg border bg-purple-50 p-4">
                  <p className="text-xs text-purple-700 font-medium flex items-center gap-1 mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Auto-assigned optometrist
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignedOptom?.optometristId}`}
                      />
                      <AvatarFallback>
                        {assignedOptom?.firstName?.[0] || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        Dr. {assignedOptom?.firstName}
                        {assignedOptom?.lastName
                          ? ` ${assignedOptom.lastName}`
                          : ""}
                      </p>
                      {typeof assignedOptom?.compatibilityScore === "number" && (
                        <p className="text-sm text-gray-600">
                          Compatibility {assignedOptom.compatibilityScore}/100
                        </p>
                      )}
                    </div>
                  </div>
                  {assignReasons.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {assignReasons.slice(0, 3).join(" · ")}
                    </p>
                  )}
                </div>
              ) : (
                (() => {
                  const o = optometrists.find((x) => x._id === manualOptomId);
                  return (
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-xs text-gray-700 font-medium flex items-center gap-1 mb-2">
                        <User className="w-3.5 h-3.5" /> Selected optometrist
                      </p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${manualOptomId}`}
                          />
                          <AvatarFallback>
                            {o?.firstName?.[0] || "D"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            Dr. {o?.firstName || ""}
                            {o?.lastName ? ` ${o.lastName}` : ""}
                          </p>
                          {o?.specialty && (
                            <p className="text-sm text-gray-600">
                              {o.specialty}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Manual selection — no AI recommendation applied to
                        this booking.
                      </p>
                    </div>
                  );
                })()
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Anything we should know? (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. wear contact lenses daily, sensitive to bright light…"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={submitting}
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid() || loadingAssign}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || submitting}
              >
                {submitting ? "Booking..." : "Confirm booking"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
