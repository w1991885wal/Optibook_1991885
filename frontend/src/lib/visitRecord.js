import API from "./api";

// Phase D1: visit-record helpers used by the diary detail dialog.
// Back-end auth gates these to optometrist + admin only.

export const getVisitByAppointment = (appointmentId) =>
  API.get(`/visit-records/appointment/${appointmentId}`);

export const upsertVisit = (appointmentId, payload) =>
  API.put(`/visit-records/appointment/${appointmentId}`, payload);

// Phase R2 payload shape (preferred):
//   { diagnosis?, notes?, prescription?,
//     eyeTestRecallMonths?: 3|6|12|24,
//     contactLensRecallMonths?: 3|6|12|24 }
// At least one of the two recall values must be present.
//
// Phase R1 backend still accepts the legacy shape `{ recallMonths }` for
// backward compatibility — kept until Phase R5 deprecation.
export const completeVisit = (appointmentId, payload) =>
  API.post(`/visit-records/appointment/${appointmentId}/complete`, payload);

export const startAppointment = (appointmentId) =>
  API.put(`/appointments/${appointmentId}`, { status: "in-progress" });

// Phase D2a: list every visit record for a patient (newest first).
export const listVisitsByPatient = (patientId) =>
  API.get(`/visit-records/patient/${patientId}`);
