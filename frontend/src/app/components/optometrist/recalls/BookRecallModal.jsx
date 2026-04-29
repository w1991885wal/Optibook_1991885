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
import { getMeOptom } from "../../../../lib/optometrist";

// Phase R4: type-aware Book Recall flow.
// Backend endpoints unchanged from D2c — the modal is now smarter about
// which recall it is resolving:
//   recallType === 'eye-test'      → appointment "Eye Test"
//                                  → pre-fill from patient.eyeTestRecallDate
//                                  → on success clear eyeTestRecallDate and
//                                    set nextRecallDate to contactLensRecallDate (or null)
//   recallType === 'contact-lens'  → appointment "Contact Lens Follow-up"
//                                  → pre-fill from patient.contactLensRecallDate
//                                  → on success clear contactLensRecallDate and
//                                    set nextRecallDate to eyeTestRecallDate (or null)
//   recallType undefined           → legacy fallback (D2c behaviour byte-identical)
//                                  → "Eye Test" + clear nextRecallDate only
//
// Endpoints used (all existing):
//   GET  /optometrists/me           (resolve signed-in optom)
//   GET  /appointments/available    (slot listing)
//   POST /appointments              (canonical booking + conflict validation)
//   PUT  /patients/:id              (recall resolution — typed or legacy)

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toYmd = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// "today if recall is in the past, otherwise the recall date itself".
const suggestedDate = (recallDate) => {
  const today = todayYmd();
  if (!recallDate) return today;
  const r = toYmd(recallDate);
  return r < today ? today : r;
};

const fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

// Resolve appointment type from recall type, defaulting to Eye Test.
const appointmentTypeFor = (recallType) => {
  if (recallType === "contact-lens") return "Contact Lens Follow-up";
  return "Eye Test";
};

// Resolve which patient field carries the recall date for this booking.
// Phase R5a: typed bookings read only the typed field — no legacy fallback.
// (R4's safety fallback to nextRecallDate is no longer needed because R1's
// backfill ensured every patient with a recall has a typed equivalent.)
// The legacy code path — recallType undefined — keeps reading nextRecallDate
// so legacy-only patients still work end-to-end.
const recallSourceDate = (patient, recallType) => {
  if (!patient) return null;
  if (recallType === "eye-test") return patient.eyeTestRecallDate || null;
  if (recallType === "contact-lens") {
    return patient.contactLensRecallDate || null;
  }
  return patient.nextRecallDate || null;
};

// Build the PATCH body for /patients/:id that resolves the booked recall and
// keeps Patient.nextRecallDate equal to "soonest of remaining typed fields"
// so the recalls page row-presence filter stays correct.
const buildRecallResolutionPatch = (patient, recallType) => {
  if (recallType === "eye-test") {
    return {
      eyeTestRecallDate: null,
      nextRecallDate: patient?.contactLensRecallDate || null,
    };
  }
  if (recallType === "contact-lens") {
    return {
      contactLensRecallDate: null,
      nextRecallDate: patient?.eyeTestRecallDate || null,
    };
  }
  // Legacy fallback — exact D2c behaviour.
  return { nextRecallDate: null };
};

export default function BookRecallModal({
  open,
  patient,
  recallType,
  onClose,
  onBooked,
}) {
  const [optom, setOptom] = useState(null);
  const [loadingOptom, setLoadingOptom] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const appointmentType = appointmentTypeFor(recallType);

  // Reset every time the modal opens for a different patient or type.
  useEffect(() => {
    if (!open || !patient) return;
    setDate(suggestedDate(recallSourceDate(patient, recallType)));
    setSlots([]);
    setSubmitting(false);
  }, [open, patient?._id, recallType]);

  // Resolve the signed-in optom once per open. Failure surfaces a clear
  // message; the booking button stays disabled until we have an optom.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingOptom(true);
        const res = await getMeOptom();
        if (!cancelled) setOptom(res.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Cannot resolve optometrist",
          );
          setOptom(null);
        }
      } finally {
        if (!cancelled) setLoadingOptom(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Fetch slots whenever optom + date + type are known.
  useEffect(() => {
    if (!open || !optom?._id || !date) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingSlots(true);
        const res = await API.get("/appointments/available", {
          params: {
            optometristId: optom._id,
            date,
            appointmentType,
          },
        });
        if (!cancelled) setSlots(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err.response?.data?.message || "Failed to load slots",
          );
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, optom?._id, date, appointmentType]);

  const handlePickSlot = async (startTime) => {
    if (!patient?._id || !optom?._id || !date || !startTime) return;
    try {
      setSubmitting(true);

      // 1) Book via the canonical endpoint.
      await API.post("/appointments", {
        patientId: patient._id,
        optometristId: optom._id,
        date: new Date(date).toISOString(),
        startTime,
        appointmentType,
      });

      // 2) Resolve the recall — typed clear when recallType is set, legacy
      //    clear otherwise. Recomputes nextRecallDate so the recalls page
      //    row-presence filter stays correct (R3 still gates on it).
      try {
        const patch = buildRecallResolutionPatch(patient, recallType);
        await API.put(`/patients/${patient._id}`, patch);
      } catch (err) {
        toast.warning(
          err.response?.data?.message ||
            "Booked, but failed to clear recall. The patient may still appear as due until refresh.",
        );
      }

      toast.success("Recall booked");
      onBooked?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient) return null;

  const patientName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
  const sourceDate = recallSourceDate(patient, recallType);
  const recallChip = sourceDate
    ? new Date(sourceDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Header label — informational only, drives no logic.
  const recallHeaderLabel =
    recallType === "eye-test"
      ? "Eye test recall"
      : recallType === "contact-lens"
        ? "Contact lens recall"
        : "Recall";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book recall</DialogTitle>
          <DialogDescription>
            Schedule the recall visit after contacting the patient.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-4 text-sm bg-gray-50 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              {patientName || "Unknown patient"}
            </span>
            {patient.patientNumber != null && (
              <span className="text-xs text-gray-500 tabular-nums">
                Patient #{patient.patientNumber}
              </span>
            )}
            {recallChip && (
              <Badge variant="secondary">
                {recallHeaderLabel} · {recallChip}
              </Badge>
            )}
          </div>
          <div className="text-gray-600 text-xs">
            {patient.phone || "No phone on file"}
          </div>
          <div className="text-gray-600 text-xs">
            Type: <span className="font-medium">{appointmentType}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1">Date</Label>
            <Input
              type="date"
              min={todayYmd()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1">Optometrist</Label>
            {loadingOptom ? (
              <p className="text-sm text-gray-500">Resolving optometrist…</p>
            ) : optom ? (
              <p className="text-sm">
                Dr. {optom.firstName}
                {optom.lastName ? " " + optom.lastName : ""}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Cannot resolve optometrist.
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
                No available slots for that date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submitting || !optom?._id}
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
