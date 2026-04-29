import API from "./api";

// Admin-only download helpers. Each call hits a read-only backend endpoint
// and triggers a browser blob download. No mutation, no destructive paths.
//
// Implementation note: `responseType: 'blob'` is essential — without it
// axios parses JSON/CSV bodies as text and the download payload becomes
// stringified instead of a real file.

const triggerDownload = (blob, filenameFallback) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameFallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Pull filename out of Content-Disposition if the server set one; fall back
// to the caller-supplied default otherwise.
const filenameFrom = (response, fallback) => {
  const cd = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/i.exec(cd);
  return match?.[1] || fallback;
};

const downloadGet = async (path, fallback) => {
  const res = await API.get(path, { responseType: "blob" });
  triggerDownload(res.data, filenameFrom(res, fallback));
};

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportAllData = () =>
  downloadGet("/admin/export", `optibook-export-${stamp()}.json`);

export const backupDatabase = () =>
  downloadGet("/admin/backup", `optibook-backup-${stamp()}.json`);

// Report key matches a backend GET /admin/report/<key> route.
export const REPORT_OPTIONS = [
  {
    key: "appointments",
    label: "Appointments",
    description: "Every appointment with patient, optometrist and status.",
  },
  {
    key: "cancellations",
    label: "Cancellations & no-shows",
    description: "Filtered to cancelled and no-show appointments only.",
  },
  {
    key: "workload",
    label: "Clinician workload",
    description:
      "Per-optometrist counts: total, completed, scheduled, cancelled, no-show.",
  },
  {
    key: "patients",
    label: "Patients",
    description:
      "Patient list with patient number, contact details, visit count and recall date.",
  },
];

export const downloadReport = (key) =>
  downloadGet(`/admin/report/${key}`, `optibook-${key}-${stamp()}.csv`);
