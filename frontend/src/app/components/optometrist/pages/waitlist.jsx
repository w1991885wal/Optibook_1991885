import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Sigma, WatchIcon } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import WaitlistRow from "../../common/waitlist/WaitlistRow";
import ConfirmBookingModal from "../waitlist/ConfirmBookingModal";
import API from "../../../../lib/api";

// Phase D4: real waitlist page wired to GET /api/waitlist. Confirm Booking
// opens the slot-picker modal that posts to POST /api/waitlist/:id/book;
// Remove soft-removes via DELETE /api/waitlist/:id.

const daysSince = (d) => {
  if (!d) return null;
  const start = new Date(d);
  const now = new Date();
  return Math.max(
    0,
    Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
};

export default function WaitListPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmEntry, setConfirmEntry] = useState(null);
  const [removingId, setRemovingId] = useState("");
  // Session-local "auto filled" counter — bumps on every successful booking.
  // Resets on refresh; honest prototype metric.
  const [autoFilled, setAutoFilled] = useState(0);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await API.get("/waitlist");
      setEntries(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const stats = useMemo(() => {
    const total = entries.length;
    const highPriority = entries.filter((e) => e.priority === "high").length;
    const waitDays = entries
      .map((e) => daysSince(e.addedDate))
      .filter((n) => n !== null);
    const avgWait = waitDays.length
      ? Math.round(waitDays.reduce((a, b) => a + b, 0) / waitDays.length)
      : null;
    return { total, highPriority, avgWait };
  }, [entries]);

  const handleRemove = async (entry) => {
    if (!entry?._id) return;
    const patientName = entry.patient
      ? `${entry.patient.firstName || ""} ${entry.patient.lastName || ""}`.trim()
      : "this entry";
    if (
      !window.confirm(
        `Remove ${patientName} from the waitlist? This cannot be undone from the UI.`,
      )
    ) {
      return;
    }
    try {
      setRemovingId(entry._id);
      await API.delete(`/waitlist/${entry._id}`);
      toast.success("Removed from waitlist");
      // Optimistic local update then resync.
      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove entry");
    } finally {
      setRemovingId("");
    }
  };

  const handleConfirm = (entry) => {
    setConfirmEntry(entry);
  };

  const handleBooked = () => {
    setAutoFilled((n) => n + 1);
    fetchEntries();
  };

  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-gray-400 font-normal">Waitlist</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-l-4 border-l-[#FF6B6B]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Total Waitlist</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
                  <Sigma className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs">
                {stats.highPriority} high priority
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#FFD93D]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Avg Wait Time</p>
                  <p className="text-2xl font-bold">
                    {stats.avgWait === null ? "—" : `${stats.avgWait}d`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#FFD93D] rounded-lg flex items-center justify-center">
                  <WatchIcon className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs">Across active entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#51CF66]">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black mb-1">Auto Filled</p>
                  <p className="text-2xl font-bold">{autoFilled}</p>
                </div>
                <div className="w-12 h-12 bg-[#51CF66] rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-black" />
                </div>
              </div>
              <p className="text-xs text-[#51CF66]">Booked this session</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold">
          Active Waitlist ({stats.total} Total)
        </h2>

        <div className="space-y-3 mt-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">The waitlist is empty.</p>
          ) : (
            entries.map((entry) => (
              <WaitlistRow
                key={entry._id}
                entry={entry}
                onConfirm={handleConfirm}
                onRemove={handleRemove}
                busy={removingId === entry._id}
              />
            ))
          )}
        </div>
      </Card>

      <ConfirmBookingModal
        open={!!confirmEntry}
        entry={confirmEntry}
        onClose={() => setConfirmEntry(null)}
        onBooked={handleBooked}
      />
    </div>
  );
}
