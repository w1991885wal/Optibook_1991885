import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ClockPlus,
  FolderPlus,
  Mail,
  Phone,
  Search,
  UsersRound,
} from "lucide-react";
import { patientTabStatsAdmin } from "../../common/mock-data";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { ToggleButton } from "../../common/toggle";
import API from "../../../../lib/api";

// Admin Patients page.
// - Patient list now reads real GET /patients (replacing mock-data.patients).
// - Search supports first name / last name / full name / DOB. Filtering is
//   live-as-you-type AND submittable via the Search button (form submit) so
//   the button is a real action rather than dead UI.
// - Stats grid + per-row toggle + "View/Edit Details" button are intentionally
//   left as-is (out of scope for this phase).

const initials = (first, last) =>
  `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "?";

const ageFromDob = (d) => {
  if (!d) return null;
  const dob = new Date(d);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
};

const fmtDateLong = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// Build several string representations of a DOB so the user can search in
// any common format (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "15 Apr 2020", year).
const dobBlob = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const ymd = `${y}-${mm}-${dd}`;
  const dmy = `${dd}/${mm}/${y}`;
  const dmyDash = `${dd}-${mm}-${y}`;
  const human = fmtDateLong(d);
  return `${ymd} ${dmy} ${dmyDash} ${human} ${y}`;
};

const matchesQuery = (p, q) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const first = (p.firstName || "").toLowerCase();
  const last = (p.lastName || "").toLowerCase();
  const full = `${first} ${last}`.trim();
  const email = (p.user?.email || "").toLowerCase();
  const dob = dobBlob(p.dateOfBirth).toLowerCase();
  return (
    first.includes(needle) ||
    last.includes(needle) ||
    full.includes(needle) ||
    email.includes(needle) ||
    dob.includes(needle)
  );
};

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const visible = useMemo(
    () => patients.filter((p) => matchesQuery(p, query)),
    [patients, query],
  );

  // Search button: filtering is already live-as-you-type via `query`. The
  // button submits the form to confirm the search explicitly — same filter
  // result, but the button is a real action (and Enter key works too).
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery((q) => q); // touch state so any input blur still applies
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold mb-2">Patient Management</h2>

      {/* Stats Grid — kept as-is for this phase (out of scope). */}
      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#0066CC] [box-shadow:0_4px_6px_-1px_rgba(0,102,204,0.4),0_2px_4px_-2px_rgba(0,102,204,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Patients</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.activePatients}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#0066CC] rounded-sm flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">
                {patientTabStatsAdmin.activePatientsLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Active Patients</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.activePatients}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Check className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">
                {patientTabStatsAdmin.activePatientsLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Due for Recall</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.duePatient}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <ClockPlus className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">
                {patientTabStatsAdmin.duePatientLabel}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FF6B6B] [box-shadow:0_4px_6px_-1px_rgba(255,107,107,0.4),0_2px_4px_-2px_rgba(255,107,107,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">New This Month</p>
                  <p className="text-2xl font-bold">
                    {patientTabStatsAdmin.thisMonth}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#FF6B6B] rounded-sm flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">{patientTabStatsAdmin.thisMonthLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <form
          className="flex items-center flex-wrap gap-3"
          onSubmit={handleSearchSubmit}
        >
          <input
            type="text"
            placeholder="Search by name or date of birth (YYYY-MM-DD or DD/MM/YYYY)…"
            className="flex-1 px-4 py-2 border rounded-md text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button size="sm" type="submit">
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
        </form>
      </Card>

      {/* Patient list */}
      <Card className="p-4">
        <h2 className="font-semibold">
          Patient List ({visible.length}
          {patients.length !== visible.length ? ` of ${patients.length}` : ""}{" "}
          Total)
        </h2>

        {loading && <p className="text-sm text-gray-500 mt-2">Loading…</p>}

        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">No patients found.</p>
        )}

        <div className="space-y-3 mt-3">
          {visible.map((patient) => {
            const name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
            const age = ageFromDob(patient.dateOfBirth);
            return (
              <Card key={patient._id}>
                <CardContent className="flex items-center justify-between p-4">
                  {/* Left */}
                  <div className="flex items-center gap-4">
                    <Avatar className="text-white">
                      <AvatarFallback className="bg-linear-to-r from-indigo-500 to-teal-600">
                        {initials(patient.firstName, patient.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-semibold">
                        {name || "Unknown patient"}
                        {patient.patientNumber != null && (
                          <span className="ml-2 text-xs text-gray-500 tabular-nums">
                            #{patient.patientNumber}
                          </span>
                        )}
                      </p>

                      <div className="text-sm text-gray-500 flex flex-wrap gap-4 mt-1">
                        {patient.user?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {patient.user.email}
                          </span>
                        )}
                        {age != null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {age} years
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {patient.phone}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        DOB: {fmtDateLong(patient.dateOfBirth)} ·{" "}
                        Visits: {patient.visitCount ?? 0}
                        {patient.eyeTestRecallDate && (
                          <> · Eye test: {fmtDateLong(patient.eyeTestRecallDate)}</>
                        )}
                        {patient.contactLensRecallDate && (
                          <> · CL: {fmtDateLong(patient.contactLensRecallDate)}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right — toggle + details left as-is for this phase. */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1 items-center justify-center">
                      <ToggleButton
                        defaultOn={true}
                        onChange={() => {
                          /* out of scope for this phase */
                        }}
                      />
                      <span className="text-sm">Active</span>
                    </div>
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      variant={"outline"}
                    >
                      View/Edit Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
