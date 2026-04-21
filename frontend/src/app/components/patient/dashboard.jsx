import { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Plus,
  LogOut,
  Eye,
  Phone,
  Mail,
  MapPin,
  Activity,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ImageWithFallback } from "../ImageWithFallback";
import { BookingModal } from "./BokoingModal";
import { useEffect } from "react";
import { getMe, getPatientAppointments } from "../../../lib/patient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import API from "../../../lib/api";
import { getDaysUntilAppointment, getNextAppointment } from "../../../lib/user";
import ProfileTab from "./profileUpdate";

const mockAppointments = [
  {
    id: 1,
    date: "2026-01-20",
    time: "10:00 AM",
    doctor: "Dr. Emma Wilson",
    type: "Comprehensive Eye Exam",
    status: "upcoming",
    image:
      "https://images.unsplash.com/photo-1604781099561-c70393a38a6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcHRvbWV0cmlzdCUyMGdsYXNzZXN8ZW58MXx8fHwxNzY4Mjc5NjI5fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: 2,
    date: "2026-01-15",
    time: "2:30 PM",
    doctor: "Dr. James Chen",
    type: "Contact Lens Fitting",
    status: "completed",
    image:
      "https://images.unsplash.com/photo-1604781099561-c70393a38a6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvcHRvbWV0cmlzdCUyMGdsYXNzZXN8ZW58MXx8fHwxNzY4Mjc5NjI5fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
];

const mockRecords = [
  {
    id: 1,
    date: "2026-01-10",
    type: "Eye Exam",
    doctor: "Dr. Sarah Johnson",
    prescription: "Right: -2.50, Left: -2.25",
  },
  {
    id: 2,
    date: "2025-12-15",
    type: "Follow-up",
    doctor: "Dr. Michael Chen",
    prescription: "No change",
  },
];

export function PatientDashboard() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [isDel, setIsDel] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  // useEffect(() => {
  //   const user = getUserRole();
  //   setUserInfo({
  //     name: user.name || user.email || "Sarah",
  //     email: user.email,
  //     profile: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
  //   });
  // }, []);

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

  useEffect(() => {
    if (!isBookingOpen) {
      fetchAppointments();
    }
  }, [isBookingOpen]);

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
    navigate("/login");
  };

  if (loading) {
    return <div className="p-10 text-center">Loading dashboard...</div>;
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      setIsDel(appointmentId);
      await API.delete(`/appointments/${appointmentId}`);
      toast.success("Appointment cancelled successfully");

      // refresh appointments
      fetchAppointments();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel appointment",
      );
    } finally {
      setIsDel(false);
    }
  };

  const upcomingCount = appointments?.filter(
    (a) => a.status === "scheduled",
  ).length;
  const completedCount = appointments?.filter(
    (a) => a.status === "completed",
  ).length;

  const nextAppointment = getNextAppointment(appointments);
  const daysUntil = getDaysUntilAppointment(nextAppointment);

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
                New Appointment
              </Button>
              <Avatar>
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?._id}`}
                />
                <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.firstName}!
          </h2>
          <p className="text-gray-600">
            Manage your eye care appointments and health records
          </p>
        </div>

        {/* Stats Cards */}
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
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next Visit</p>
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
        </div>

        {/* Main Content */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            {/* <TabsTrigger value="records">Medical Records</TabsTrigger> */}
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            {appointments?.length === 0 && (
              <p className="text-gray-500">No appointments yet.</p>
            )}
            {appointments?.map((appointment) => (
              <Card
                key={appointment.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment?.optometrist?._id}`}
                      />
                      <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    {/* <ImageWithFallback
                      src={appointment.image}
                      alt="Optometrist"
                      className="w-20 h-20 rounded-lg object-cover"
                    /> */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {appointment.appointmentType}
                          </h3>
                          <p className="text-gray-600">
                            {appointment?.optometrist?.firstName
                              ? `Dr. ${appointment.optometrist.firstName}${
                                  appointment.optometrist.lastName
                                    ? " " + appointment.optometrist.lastName
                                    : ""
                                }`
                              : "Optometrist"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            appointment.status === "scheduled"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(appointment.date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {appointment?.startTime}
                        </div>
                      </div>
                      {appointment.status === "scheduled" && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              cancelAppointment(appointment?._id);
                            }}
                            disabled={isDel === appointment?._id}
                          >
                            {isDel === appointment?._id
                              ? "Cancelling"
                              : "Cancel"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {mockRecords.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{record.type}</CardTitle>
                      <CardDescription>
                        {new Date(record.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{record.doctor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        Prescription: {record.prescription}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab user={user} profile={profile} />
            {/* <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Manage your profile and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?._id}`}
                    />
                    <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{profile?.name}</h3>
                    <p className="text-gray-600">Patient ID: {}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>+1 (555) 123-4567</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>123 Main St, City, State 12345</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Date of Birth:</span>{" "}
                      January 15, 1985
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Blood Type:</span> A+
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Insurance:</span> BlueCross
                      BlueShield
                    </p>
                  </div>
                </div>
                <Button>Edit Profile</Button>
              </CardContent>
            </Card> */}
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
    </div>
  );
}
