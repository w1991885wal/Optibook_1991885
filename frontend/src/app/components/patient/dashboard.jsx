import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Plus,
  LogOut,
  Eye,
  Activity,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BookingModal } from "./BokoingModal";
import ReviewModal from "./ReviewModal";
import { getMe, getPatientAppointments } from "../../../lib/patient";
import { getMyReview } from "../../../lib/review";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import API from "../../../lib/api";
import { getDaysUntilAppointment, getNextAppointment } from "../../../lib/user";

// Past vs upcoming classification. "Upcoming" = things the patient still needs
// to attend. "Past" = everything that has already happened or been closed out.
const UPCOMING_STATUSES = new Set(["scheduled", "confirmed"]);
const PAST_STATUSES = new Set(["completed", "cancelled", "no-show"]);

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const prettyOptomName = (o) => {
  if (!o?.firstName) return "Optometrist";
  return `Dr. ${o.firstName}${o.lastName ? " " + o.lastName : ""}`;
};

const statusBadgeVariant = (status) => {
  if (status === "scheduled" || status === "confirmed") return "default";
  if (status === "completed") return "secondary";
  return "outline";
};

export function PatientDashboard() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [cancellingId, setCancellingId] = useState("");

  // Phase Reviews-Patient-UI: per-appointment review state.
  //   reviewedSet :: Map<appointmentId, reviewDoc>
  //   reviewModal :: { appointment, existingReview } | null
  const [reviewedSet, setReviewedSet] = useState(new Map());
  const [reviewModal, setReviewModal] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!isBookingOpen) fetchAppointments();
  }, [isBookingOpen]);

  // Phase Reviews-Patient-UI: when appointments change, prefetch review
  // status for every completed appointment. N parallel fetches via
  // Promise.allSettled — failures don't block the dashboard, those rows
  // just default to "Leave review" and the backend will 409 if a review
  // truly exists (handled in the modal).
  useEffect(() => {
    const completed = appointments.filter((a) => a.status === "completed");
    if (completed.length === 0) {
      if (reviewedSet.size > 0) setReviewedSet(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        completed.map((a) => getMyReview(a._id)),
      );
      if (cancelled) return;
      const next = new Map();
      completed.forEach((a, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value?.data?.data) {
          next.set(a._id, r.value.data.data);
        }
      });
      setReviewedSet(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments]);

  const handleOpenReview = (appointment) => {
    // Layer 2 frontend re-check: even if the button rendered "Leave
    // review", check the cached reviewedSet at click time. Catches the
    // case where a review was created in another tab between mount and
    // click.
    const existing = reviewedSet.get(appointment._id) || null;
    setReviewModal({ appointment, existingReview: existing });
  };

  const handleReviewSubmitted = (review) => {
    if (review && review.appointment) {
      setReviewedSet((prev) => {
        const next = new Map(prev);
        next.set(String(review.appointment), review);
        return next;
      });
    }
    setReviewModal(null);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getMe();
      setUser(res.data.user);
      setProfile(res.data.profile);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await getPatientAppointments();
      setAppointments(res.data?.data || []);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load appointments",
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      setCancellingId(appointmentId);
      await API.delete(`/appointments/${appointmentId}`);
      toast.success("Appointment cancelled");
      fetchAppointments();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel appointment",
      );
    } finally {
      setCancellingId("");
    }
  };

  // Split appointments once per render.
  const { upcoming, past } = useMemo(() => {
    const up = [];
    const ps = [];
    for (const a of appointments || []) {
      if (UPCOMING_STATUSES.has(a.status)) up.push(a);
      else if (PAST_STATUSES.has(a.status)) ps.push(a);
    }
    // Upcoming sorted soonest-first; past sorted newest-first.
    up.sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        a.startTime.localeCompare(b.startTime),
    );
    ps.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcoming: up, past: ps };
  }, [appointments]);

  const upcomingCount = upcoming.length;
  const completedCount = appointments.filter(
    (a) => a.status === "completed",
  ).length;

  const nextAppointment = getNextAppointment(appointments);
  const daysUntil = getDaysUntilAppointment(nextAppointment);

  if (loading) {
    return <div className="p-10 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                OptiBook
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsBookingOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New appointment
              </Button>
              {/* Avatar acts as the entry point to the profile page. */}
              <Link
                to="/profile"
                title="Your profile"
                aria-label="Your profile"
                className="rounded-full ring-2 ring-transparent hover:ring-blue-200 transition"
              >
                <Avatar>
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?._id}`}
                  />
                  <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}!
          </h2>
          <p className="text-gray-600">
            Manage your eye-care appointments and view your history.
          </p>
        </div>

        {/* Stats — order: Upcoming, Next Visit, Completed */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                  <p className="text-2xl font-bold">{upcomingCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next visit</p>
                  <p className="text-2xl font-bold">
                    {daysUntil !== null ? `${daysUntil}d` : "--"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointment tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming {upcomingCount > 0 ? `(${upcomingCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="past">
              Past {past.length > 0 ? `(${past.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-gray-500">
                You have no upcoming appointments.
              </p>
            ) : (
              upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  profile={profile}
                  cancellingId={cancellingId}
                  onCancel={cancelAppointment}
                  showCancel
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length === 0 ? (
              <p className="text-gray-500">No past appointments yet.</p>
            ) : (
              past.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  profile={profile}
                  existingReview={reviewedSet.get(appointment._id) || null}
                  onLeaveReview={handleOpenReview}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BookingModal
        open={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        userData={{
          email: user?.email,
          name: profile?.firstName,
          phone: profile?.phone,
        }}
      />

      <ReviewModal
        open={!!reviewModal}
        appointment={reviewModal?.appointment}
        existingReview={reviewModal?.existingReview}
        onClose={() => setReviewModal(null)}
        onSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}

function AppointmentCard({
  appointment,
  profile,
  cancellingId,
  onCancel,
  showCancel = false,
  existingReview = null,
  onLeaveReview,
}) {
  const canReview =
    appointment.status === "completed" && typeof onLeaveReview === "function";
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment?.optometrist?._id}`}
            />
            <AvatarFallback>
              {appointment?.optometrist?.firstName?.[0] ||
                profile?.firstName?.[0] ||
                "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {appointment.appointmentType}
                </h3>
                <p className="text-gray-600">
                  {prettyOptomName(appointment.optometrist)}
                </p>
              </div>
              <Badge variant={statusBadgeVariant(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(appointment.date)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {appointment.startTime}
              </div>
            </div>
            {showCancel && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel(appointment._id)}
                  disabled={cancellingId === appointment._id}
                >
                  {cancellingId === appointment._id
                    ? "Cancelling..."
                    : "Cancel"}
                </Button>
              </div>
            )}
            {canReview && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant={existingReview ? "outline" : "default"}
                  onClick={() => onLeaveReview(appointment)}
                >
                  {existingReview ? "View your review" : "Leave review"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
