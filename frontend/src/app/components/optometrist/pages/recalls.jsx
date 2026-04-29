import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import API from "../../../../lib/api";
import BookRecallModal from "../recalls/BookRecallModal";

// Phase R5a: split-recall-aware recall list, now driven by typed fields.
// Row presence, sort, and status bucket all key off `effectiveRecallDate(p)`
// (= soonest of eyeTestRecallDate / contactLensRecallDate, falling back to
// legacy nextRecallDate only for unmigrated edge cases). Backend continues
// to dual-write nextRecallDate during R5a — that gets cut over in R5b.

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const daysFromNow = (d) => {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const recallBucket = (d) => {
  const days = daysFromNow(d);
  if (days == null) return null;
  if (days < 0) return "overdue";
  if (days <= 30) return "due-soon";
  return "upcoming";
};

const BUCKET_LABEL = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};

const BUCKET_BADGE = {
  overdue: "bg-red-100 text-red-700",
  "due-soon": "bg-yellow-100 text-yellow-700",
  upcoming: "bg-blue-100 text-blue-700",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due-soon", label: "Due soon" },
  { key: "upcoming", label: "Upcoming" },
];

const TYPE_FILTERS = [
  { key: "all", label: "All types" },
  { key: "eye-test", label: "Eye test" },
  { key: "contact-lens", label: "Contact lens" },
  { key: "legacy", label: "Legacy" },
];

const TYPE_LABEL = {
  "eye-test": "Eye test",
  "contact-lens": "Contact lens",
  legacy: "Legacy",
};

const TYPE_BADGE = {
  "eye-test": "bg-teal-100 text-teal-800",
  "contact-lens": "bg-indigo-100 text-indigo-800",
  legacy: "bg-gray-200 text-gray-700",
};

// Classify what recall type tags a patient currently carries. A patient may
// have multiple tags (typical post-R2 dual recall set).
const recallTypesFor = (p) => {
  const tags = [];
  if (p.eyeTestRecallDate) tags.push("eye-test");
  if (p.contactLensRecallDate) tags.push("contact-lens");
  if (tags.length === 0 && p.nextRecallDate) tags.push("legacy");
  return tags;
};

// Phase R5a: derive the "effective" recall date used for filter / sort /
// status bucket. Soonest of typed fields when present, else fall back to
// legacy nextRecallDate so unmigrated edge-case patients still appear.
const effectiveRecallDate = (p) => {
  const candidates = [p.eyeTestRecallDate, p.contactLensRecallDate].filter(
    Boolean,
  );
  if (candidates.length > 0) {
    return candidates.reduce((earliest, d) =>
      new Date(d).getTime() < new Date(earliest).getTime() ? d : earliest,
    );
  }
  return p.nextRecallDate || null;
};

export default function RecallsPage({ onOpenHistory }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  // R4: bookingTarget carries the patient AND which recall is being booked
  // so BookRecallModal can resolve the right appointment type, pre-fill date
  // and clear the right typed field on success.
  const [bookingTarget, setBookingTarget] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await API.get("/patients");
      // R5a: row presence / sort gated by effectiveRecallDate. A patient
      // shows up if they carry any typed recall, OR (legacy edge case) only
      // a legacy nextRecallDate. Sort key is the same effective date.
      const list = (res.data?.data || []).filter((p) =>
        Boolean(effectiveRecallDate(p)),
      );
      list.sort(
        (a, b) =>
          new Date(effectiveRecallDate(a)).getTime() -
          new Date(effectiveRecallDate(b)).getTime(),
      );
      setPatients(list);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load recall list",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-compute tags once per patient for use across filters + render.
  const patientsWithTags = useMemo(
    () =>
      patients.map((p) => ({
        patient: p,
        tags: recallTypesFor(p),
      })),
    [patients],
  );

  // Status bucket counts respect the type filter; type counts respect the
  // status filter — so chips reflect the live intersection.
  const statusCounts = useMemo(() => {
    const c = { all: 0, overdue: 0, "due-soon": 0, upcoming: 0 };
    for (const { patient, tags } of patientsWithTags) {
      if (typeFilter !== "all" && !tags.includes(typeFilter)) continue;
      const b = recallBucket(effectiveRecallDate(patient));
      c.all += 1;
      if (b) c[b] += 1;
    }
    return c;
  }, [patientsWithTags, typeFilter]);

  const typeCounts = useMemo(() => {
    const c = { all: 0, "eye-test": 0, "contact-lens": 0, legacy: 0 };
    for (const { patient, tags } of patientsWithTags) {
      if (
        statusFilter !== "all" &&
        recallBucket(effectiveRecallDate(patient)) !== statusFilter
      ) {
        continue;
      }
      c.all += 1;
      for (const t of tags) c[t] += 1;
    }
    return c;
  }, [patientsWithTags, statusFilter]);

  const visible = useMemo(() => {
    return patientsWithTags.filter(({ patient, tags }) => {
      if (
        statusFilter !== "all" &&
        recallBucket(effectiveRecallDate(patient)) !== statusFilter
      ) {
        return false;
      }
      if (typeFilter !== "all" && !tags.includes(typeFilter)) {
        return false;
      }
      return true;
    });
  }, [patientsWithTags, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-gray-400 font-normal">Recalls</h1>

      <Card className="p-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={statusFilter === f.key ? "default" : "outline"}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
                <span className="ml-2 text-xs opacity-70">
                  {statusCounts[f.key] ?? 0}
                </span>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={typeFilter === f.key ? "default" : "outline"}
                onClick={() => setTypeFilter(f.key)}
              >
                {f.label}
                <span className="ml-2 text-xs opacity-70">
                  {typeCounts[f.key] ?? 0}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="p-4">
          {loading && (
            <p className="text-sm text-gray-500">Loading recall list…</p>
          )}

          {!loading && visible.length === 0 && (
            <p className="text-sm text-gray-500">
              No patients in this category.
            </p>
          )}

          {!loading && visible.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Recall(s)</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ patient: p, tags }) => {
                    const effective = effectiveRecallDate(p);
                    const bucket = recallBucket(effective);
                    const days = daysFromNow(effective);
                    const dayLabel =
                      days == null
                        ? ""
                        : days < 0
                          ? `${-days} day${-days === 1 ? "" : "s"} ago`
                          : days === 0
                            ? "today"
                            : `in ${days} day${days === 1 ? "" : "s"}`;
                    const showLegacy = tags.includes("legacy");
                    return (
                      <tr key={p._id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-gray-500 tabular-nums">
                          {p.patientNumber != null
                            ? `#${p.patientNumber}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className="font-medium text-gray-900 hover:underline text-left"
                            onClick={() => onOpenHistory?.(p._id)}
                          >
                            {p.firstName} {p.lastName}
                          </button>
                        </td>
                        <td className="py-2 pr-3 text-gray-700">
                          {p.phone || "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-700">
                          {p.eyeTestRecallDate && (
                            <div>
                              <span className="text-gray-500">Eye test:</span>{" "}
                              {fmtDate(p.eyeTestRecallDate)}
                            </div>
                          )}
                          {p.contactLensRecallDate && (
                            <div>
                              <span className="text-gray-500">CL:</span>{" "}
                              {fmtDate(p.contactLensRecallDate)}
                            </div>
                          )}
                          {showLegacy && (
                            <div>
                              <span className="text-gray-500">Legacy:</span>{" "}
                              {fmtDate(p.nextRecallDate)}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-0.5">
                            {dayLabel}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className={TYPE_BADGE[t]}
                              >
                                {TYPE_LABEL[t]}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          {bucket && (
                            <Badge
                              variant="secondary"
                              className={BUCKET_BADGE[bucket]}
                            >
                              {BUCKET_LABEL[bucket]}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenHistory?.(p._id)}
                            >
                              History
                            </Button>
                            {/* R4: per-type booking buttons. A patient with
                                both types renders two buttons. Legacy-only
                                renders a single typeless "Book Recall". */}
                            {tags.includes("eye-test") && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setBookingTarget({
                                    patient: p,
                                    recallType: "eye-test",
                                  })
                                }
                              >
                                Book Eye Test
                              </Button>
                            )}
                            {tags.includes("contact-lens") && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setBookingTarget({
                                    patient: p,
                                    recallType: "contact-lens",
                                  })
                                }
                              >
                                Book Contact Lens
                              </Button>
                            )}
                            {!tags.includes("eye-test") &&
                              !tags.includes("contact-lens") &&
                              tags.includes("legacy") && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setBookingTarget({
                                      patient: p,
                                      recallType: undefined,
                                    })
                                  }
                                >
                                  Book Recall
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookRecallModal
        open={!!bookingTarget}
        patient={bookingTarget?.patient || null}
        recallType={bookingTarget?.recallType}
        onClose={() => setBookingTarget(null)}
        onBooked={() => {
          // R4: typed recall path clears the corresponding typed field AND
          // recomputes nextRecallDate (= remaining typed field or null), so
          // the row-presence filter still drops booked patients off when no
          // recall remains. Legacy path is byte-identical to D2c.
          fetchPatients();
        }}
      />
    </div>
  );
}
