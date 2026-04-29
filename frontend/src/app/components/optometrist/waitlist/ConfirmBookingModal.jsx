import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import API from "../../../../lib/api";

// Lightweight slot-picker for the waitlist "Confirm Booking" flow.
// Resolves an optometrist (pinned on entry, or via /ai/recommend-optometrist
// when absent), fetches real available slots, and posts to the composite
// POST /waitlist/:id/book endpoint.

const fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const todayStr = () => new Date().toISOString().split("T")[0];

export default function ConfirmBookingModal({ open, entry, onClose, onBooked }) {
  const [date, setDate] = useState(todayStr());
  const [optom, setOptom] = useState(null);
  const [usedAi, setUsedAi] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotNote, setSlotNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset on open/entry change.
  useEffect(() => {
    if (!open || !entry) return;
    setDate(todayStr());
    setSlots([]);
    setSlotNote("");
    setSubmitting(false);
    // If the entry has a pinned optometrist, lock it in; else we'll resolve
    // via AI recommendation when the optom picks a date.
    if (entry.optometrist) {
      setOptom(entry.optometrist);
      setUsedAi(false);
    } else {
      setOptom(null);
      setUsedAi(false);
    }
  }, [open, entry]);

  // When date + optom are known, fetch real slots. When date changes but no
  // optom is pinned, first ask AI for a recommendation, then fetch slots.
  useEffect(() => {
    if (!open || !entry || !date) return;
    let cancelled = false;

    const run = async () => {
      try {
        let chosen = optom;

        if (!entry.optometrist) {
          // No pinned optom — recommend one for this date.
          setRecommending(true);
          try {
            const recRes = await API.post("/ai/recommend-optometrist", {
              appointmentType: entry.appointmentType,
              date,
              patientId: entry.patient?._id,
            });
            const list = recRes.data?.data || [];
            const top = list[0];
            // Backend returns flat rows: { optometristId, firstName, lastName, ... }.
            // Reshape into the { _id, firstName, lastName } object the rest of
            // this modal expects.
            if (!top || !top.optometristId) {
              if (!cancelled) {
                setOptom(null);
                setUsedAi(false);
                setSlots([]);
                setSlotNote(
                  "No optometrist could be auto-assigned for that date.",
                );
                setRecommending(false);
              }
              return;
            }
            chosen = {
              _id: top.optometristId,
              firstName: top.firstName,
              lastName: top.lastName,
            };
            if (!cancelled) {
              setOptom(chosen);
              setUsedAi(true);
            }
          } finally {
            if (!cancelled) setRecommending(false);
          }
        }

        if (!chosen?._id) return;

        setLoadingSlots(true);
        setSlotNote("");
        const slotRes = await API.get("/appointments/available", {
          params: {
            optometristId: chosen._id,
            date,
            appointmentType: entry.appointmentType,
          },
        });
        if (cancelled) return;
        const list = slotRes.data?.data || [];
        setSlots(list);
        if (list.length === 0) {
          setSlotNote("No available slots for this optometrist on that date.");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Failed to load slot availability",
          );
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // We deliberately react to date and pinned optom only; chosen optom is
    // set inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?._id, date, entry?.optometrist?._id]);

  const handlePickSlot = async (startTime) => {
    if (!entry || !optom?._id) return;
    try {
      setSubmitting(true);
      await API.post(`/waitlist/${entry._id}/book`, {
        optometristId: optom._id,
        date,
        startTime,
        usedAiRecommendation: usedAi,
      });
      toast.success("Appointment booked from waitlist");
      onBooked?.();
      onClose?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Booking failed";
      toast.error(msg);
      if (err.response?.status === 409) {
        // Race loss — close so the parent can refetch.
        onBooked?.();
        onClose?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!entry) return null;

  const patientName = entry.patient
    ? `${entry.patient.firstName || ""} ${entry.patient.lastName || ""}`.trim()
    : "Unknown patient";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm booking</DialogTitle>
          <DialogDescription>
            Pick a date and slot to convert this waitlist entry into a real
            appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 text-sm bg-gray-50 space-y-1">
          <div>
            <span className="font-semibold">{patientName}</span>
            {entry.priority && (
              <Badge variant="secondary" className="ml-2 capitalize">
                {entry.priority} priority
              </Badge>
            )}
          </div>
          <div className="text-gray-600">{entry.appointmentType}</div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1">Date</Label>
            <Input
              type="date"
              min={todayStr()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1">Optometrist</Label>
            {recommending ? (
              <p className="text-sm text-gray-500">Recommending…</p>
            ) : optom ? (
              <p className="text-sm">
                Dr. {optom.firstName}
                {optom.lastName ? " " + optom.lastName : ""}
                {usedAi && (
                  <span className="ml-2 text-xs text-teal-700">
                    (auto-assigned)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                No optometrist assigned yet.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1">
              Available slots
            </Label>
            {loadingSlots ? (
              <p className="text-sm text-gray-500">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-500">
                {slotNote || "Pick a date to load slots."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handlePickSlot(s)}
                  >
                    {fmtTime(s)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onClose?.()}
            disabled={submitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
