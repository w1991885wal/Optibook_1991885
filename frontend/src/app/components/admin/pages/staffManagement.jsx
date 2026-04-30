import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  Building,
  Calendar,
  ClockArrowUp,
  GraduationCap,
  Search,
  Sparkles,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { getOptometristReviewSummary } from "../../../../lib/review";
import { listOptometrists } from "../../../../lib/optometrist";
import AddStaffDialog from "./AddStaffDialog";

// Phase F: this page is now backed by real /api/optometrists data instead
// of the mock staffData. The Add Staff Member button opens AddStaffDialog;
// on success the list refreshes so the new optometrist appears immediately.
//
// Per-row metrics (today / week / month / utilization) are not yet tracked
// on the backend, so the cells render as `—` with a "Not yet tracked"
// tooltip. Satisfaction stays real (review summary join, by name).

const NOT_TRACKED = "Not yet tracked";

const displayName = (o) =>
  `Dr. ${(o.firstName || "").trim()} ${(o.lastName || "").trim()}`.trim();

const experienceLabel = (o) => {
  const n = Number(o.yearsExperience);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n} year${n === 1 ? "" : "s"}`;
};

export default function StaffManagement({ setActive }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [satisfactionByName, setSatisfactionByName] = useState(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);

  // Single source of truth: one fetch populates the staff list and the
  // satisfaction join. Called on mount and after a successful create.
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const resp = await listOptometrists();
      const optoms = resp?.data?.data || [];
      setStaff(optoms);

      // Phase Reviews-Display join, keyed by lowercase full-name (matches
      // the previous behaviour). Per-optometrist failure is silent — the
      // Satisfaction cell falls back to "—".
      const summaries = await Promise.allSettled(
        optoms.map((o) => getOptometristReviewSummary(o._id)),
      );
      const next = new Map();
      optoms.forEach((o, i) => {
        const r = summaries[i];
        if (r.status !== "fulfilled") return;
        const data = r.value?.data?.data;
        if (!data) return;
        const key =
          `${o.firstName || ""} ${o.lastName || ""}`.trim().toLowerCase();
        if (key) next.set(key, data);
      });
      setSatisfactionByName(next);
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Failed to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [query, setQuery] = useState("");

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((o) =>
      `${o.firstName || ""} ${o.lastName || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [query, staff]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Staff Management</h1>
        <p className="text-sm text-gray-500">Dashboard / Staff Management</p>
      </div>

      {/* Stats — Total Staff is real (count of API rows). The other two
          remain clinic-level showcase placeholders, deliberately unattributed
          to any single optometrist. */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Card className="border-l-4 rounded-md border-l-[#0066CC] [box-shadow:0_4px_6px_-1px_rgba(0,102,204,0.4),0_2px_4px_-2px_rgba(0,102,204,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Staff</p>
                  <p className="text-2xl font-bold">{staff.length}</p>
                </div>
                <div className="w-10 h-10 bg-[#0066CC] rounded-sm flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">All optometrist accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#FFD93D] [box-shadow:0_4px_6px_-1px_rgba(255,217,61,0.4),0_2px_4px_-2px_rgba(255,217,61,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Avg Utilization</p>
                  <p
                    className="text-2xl font-bold text-gray-400"
                    title={NOT_TRACKED}
                  >
                    —
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#FFD93D] rounded-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-gray-400">{NOT_TRACKED}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 rounded-md border-l-[#51CF66] [box-shadow:0_4px_6px_-1px_rgba(81,207,102,0.4),0_2px_4px_-2px_rgba(81,207,102,0.3)]">
          <CardContent className="pt-4 px-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">
                    Total Appointments Today
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-400"
                    title={NOT_TRACKED}
                  >
                    —
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#51CF66] rounded-sm flex items-center justify-center">
                  <ClockArrowUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400">{NOT_TRACKED}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search optometrist by name..."
            className="flex-1 px-4 py-2 border rounded-md text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button size="sm">
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
        </div>
      </Card>

      {/* Staff List */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">
              Optometrists ({filteredStaff.length})
            </h2>

            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setDialogOpen(true)}
            >
              <UserRoundPlus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </div>

          {loading && (
            <p className="text-sm text-gray-500">Loading staff…</p>
          )}
          {!loading && loadError && (
            <p className="text-sm text-red-600">{loadError}</p>
          )}
          {!loading && !loadError && filteredStaff.length === 0 && (
            <p className="text-sm text-gray-500">No staff members found.</p>
          )}

          {!loading &&
            !loadError &&
            filteredStaff.map((member) => {
              const name = displayName(member);
              const initials = `${(member.firstName || " ")[0]}${
                (member.lastName || " ")[0]
              }`.toUpperCase();
              return (
                <div
                  key={member._id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-md p-4"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="text-white">
                      <AvatarImage src={member.imageSrc} />
                      <AvatarFallback className="bg-linear-to-r from-indigo-500 to-teal-600">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-semibold">{name}</p>

                      <div className="text-sm text-gray-500 flex flex-wrap gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />{" "}
                          {member.specialty || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />{" "}
                          {member.roomNumber || "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {experienceLabel(member)}
                        </span>
                      </div>

                      <p
                        className="text-xs text-gray-400 mt-1"
                        title={NOT_TRACKED}
                      >
                        Today: — • This Week: — • Utilization: —{" "}
                        <span className="italic">({NOT_TRACKED})</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center justify-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          member.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                        title="Activation editing coming soon"
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-500/90 cursor-pointer"
                      onClick={() => setActive?.("diary")}
                      title="Open the clinic diary"
                    >
                      View Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActive?.("setting")}
                      title="Open Settings · per-staff editor coming later"
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Performance Table — structure preserved; per-row metrics show `—`
          with the Not-yet-tracked tooltip. Satisfaction column stays real. */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            Staff Performance Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Staff</th>
                  <th className="text-center p-3" title={NOT_TRACKED}>
                    Today
                  </th>
                  <th className="text-center p-3" title={NOT_TRACKED}>
                    Week
                  </th>
                  <th className="text-center p-3" title={NOT_TRACKED}>
                    Month
                  </th>
                  <th className="text-center p-3" title={NOT_TRACKED}>
                    Utilization
                  </th>
                  <th className="text-center p-3">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => {
                  const key = `${member.firstName || ""} ${
                    member.lastName || ""
                  }`
                    .trim()
                    .toLowerCase();
                  const sum = satisfactionByName.get(key);
                  return (
                    <tr key={member._id} className="border-b">
                      <td className="p-3 font-medium">{displayName(member)}</td>
                      <td
                        className="p-3 text-center text-gray-400"
                        title={NOT_TRACKED}
                      >
                        —
                      </td>
                      <td
                        className="p-3 text-center text-gray-400"
                        title={NOT_TRACKED}
                      >
                        —
                      </td>
                      <td
                        className="p-3 text-center text-gray-400"
                        title={NOT_TRACKED}
                      >
                        —
                      </td>
                      <td
                        className="p-3 text-center text-gray-400"
                        title={NOT_TRACKED}
                      >
                        —
                      </td>
                      <td className="p-3 text-center">
                        {sum && sum.count > 0 ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs tabular-nums">
                            {Number(sum.averageRating).toFixed(1)} ({sum.count})
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddStaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={refresh}
      />
    </main>
  );
}
