import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import API from "../../../../lib/api";
import { listVisitsByPatient } from "../../../../lib/visitRecord";

// Phase D2a: scheduling/follow-up focused patient history page.
// Read-only — pulls existing patient + appointment + visit-record data.
// No EMR fields, no mutation.

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDob = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

const statusBadge = (status) => {
  if (status === "completed") return "bg-blue-100 text-blue-700";
  if (status === "in-progress") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-gray-100 text-gray-600";
  if (status === "no-show") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
};

export default function PatientHistoryPage({ patientId, onBack }) {
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Three independent fetches — fail one, still show the others.
        const [pRes, aRes, vRes] = await Promise.allSettled([
          API.get(`/patients/${patientId}`),
          API.get("/appointments"),
          listVisitsByPatient(patientId),
        ]);
        if (cancelled) return;

        if (pRes.status === "fulfilled") {
          setPatient(pRes.value.data?.data || null);
        } else {
          toast.error(
            pRes.reason?.response?.data?.message || "Failed to load patient",
          );
        }

        if (aRes.status === "fulfilled") {
          // /appointments is already optom-scoped server-side; client filters
          // to the selected patient and sorts newest first.
          const list = (aRes.value.data?.data || []).filter(
            (a) => a.patient && (a.patient._id === patientId || a.patient === patientId),
          );
          list.sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime() ||
              (b.startTime || "").localeCompare(a.startTime || ""),
          );
          setAppointments(list);
        }

        if (vRes.status === "fulfilled") {
          setVisits(vRes.value.data?.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const totalCompleted = useMemo(
    () => appointments.filter((a) => a.status === "completed").length,
    [appointments],
  );

  if (!patientId) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => onBack?.()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-sm text-gray-500">No patient selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="mb-1 text-gray-400 font-normal">Patient history</h1>
        <Button variant="outline" size="sm" onClick={() => onBack?.()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && patient && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold">
                {patient.firstName} {patient.lastName}
              </h2>
              {patient.patientNumber != null && (
                <span className="text-sm text-gray-500 tabular-nums">
                  Patient #{patient.patientNumber}
                </span>
              )}
              {patient.eyeTestRecallDate && (
                <Badge variant="secondary">
                  Eye test · {fmtDate(patient.eyeTestRecallDate)}
                </Badge>
              )}
              {patient.contactLensRecallDate && (
                <Badge variant="secondary">
                  CL · {fmtDate(patient.contactLensRecallDate)}
                </Badge>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
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
                <span className="text-gray-500">Total completed visits:</span>{" "}
                {totalCompleted}
              </div>
              <div>
                <span className="text-gray-500">Visit count (record):</span>{" "}
                {patient.visitCount ?? 0}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold">Past appointments</h3>
              <span className="text-xs text-gray-500">
                ({appointments.length})
              </span>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-gray-500">
                No appointments on record for this patient.
              </p>
            ) : (
              <ul className="divide-y">
                {appointments.map((a) => (
                  <li
                    key={a._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {fmtDate(a.date)} · {fmtTime(a.startTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {a.appointmentType}
                        {a.optometrist?.firstName && (
                          <>
                            {" "}
                            · Dr. {a.optometrist.firstName}{" "}
                            {a.optometrist.lastName || ""}
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-md capitalize ${statusBadge(
                        a.status,
                      )}`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold">Visit records</h3>
              <span className="text-xs text-gray-500">({visits.length})</span>
            </div>
            {visits.length === 0 ? (
              <p className="text-sm text-gray-500">No visit records yet.</p>
            ) : (
              <ul className="divide-y">
                {visits.map((v) => (
                  <li key={v._id} className="py-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium">
                        {fmtDate(v.visitDate || v.createdAt)}
                      </span>
                      {v.optometrist?.firstName && (
                        <span className="text-xs text-gray-500">
                          · Dr. {v.optometrist.firstName}{" "}
                          {v.optometrist.lastName || ""}
                        </span>
                      )}
                    </div>
                    {v.diagnosis && (
                      <div className="text-sm">
                        <span className="text-gray-500">Findings:</span>{" "}
                        {v.diagnosis}
                      </div>
                    )}
                    {v.notes && (
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {v.notes}
                      </div>
                    )}
                    {v.prescription && (
                      <div className="text-xs text-gray-500">
                        Rx: {v.prescription}
                      </div>
                    )}
                    {/* Phase R2: prefer typed fields. Fall back to legacy
                        v.nextRecallDate so pre-R1 historical visits still
                        render their recall line. */}
                    {v.eyeTestRecallDate && (
                      <div className="text-xs text-gray-500">
                        Eye test recall set: {fmtDate(v.eyeTestRecallDate)}
                      </div>
                    )}
                    {v.contactLensRecallDate && (
                      <div className="text-xs text-gray-500">
                        CL recall set: {fmtDate(v.contactLensRecallDate)}
                      </div>
                    )}
                    {!v.eyeTestRecallDate &&
                      !v.contactLensRecallDate &&
                      v.nextRecallDate && (
                        <div className="text-xs text-gray-500">
                          Recall set: {fmtDate(v.nextRecallDate)}
                        </div>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
