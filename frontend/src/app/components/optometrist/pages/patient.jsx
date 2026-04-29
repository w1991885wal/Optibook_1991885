import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { Input } from "../../ui/input";
import API from "../../../../lib/api";

// Phase D2a: replaced the mock-data list with the real GET /patients feed.
// "View History" now navigates to the new optometrist patient-history page.
// PatientRow.jsx is intentionally NOT touched — it is shared and may be
// consumed elsewhere; this page renders an inline simpler row instead.

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const ageFromDob = (d) => {
  if (!d) return null;
  const dob = new Date(d);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
};

const initials = (first, last) =>
  `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "?";

export default function PatientsPage({ onOpenHistory }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get("/patients");
        if (cancelled) return;
        const list = res.data?.data || [];
        list.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          ),
        );
        setPatients(list);
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to load patients",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName || ""} ${p.lastName || ""} ${p.user?.email || ""} ${
        p.phone || ""
      }`
        .toLowerCase()
        .includes(q),
    );
  }, [search, patients]);

  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-gray-400 font-normal">My Patients</h1>

      <Card className="p-4">
        <Input
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">
          Patient List ({visible.length}
          {patients.length !== visible.length ? ` of ${patients.length}` : ""})
        </h2>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-500">No patients found.</p>
        )}

        <div className="space-y-3">
          {visible.map((p) => {
            const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
            const age = ageFromDob(p.dateOfBirth);
            return (
              <div
                key={p._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="text-white">
                    <AvatarFallback className="bg-linear-to-r from-indigo-500 to-teal-600">
                      {initials(p.firstName, p.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {name || "Unknown patient"}
                    </p>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      {p.user?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {p.user.email}
                        </span>
                      )}
                      {age != null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {age} years
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Visits: {p.visitCount ?? 0}
                      {p.eyeTestRecallDate && (
                        <> · Eye test: {fmtDate(p.eyeTestRecallDate)}</>
                      )}
                      {p.contactLensRecallDate && (
                        <> · CL: {fmtDate(p.contactLensRecallDate)}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <Button
                    size="sm"
                    onClick={() => onOpenHistory?.(p._id)}
                  >
                    View History
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
