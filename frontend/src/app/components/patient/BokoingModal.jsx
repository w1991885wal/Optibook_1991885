import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import Calendar from "../ui/update-calendar";
import API from "../../../lib/api";

const appointmentTypes = [
  "Comprehensive Eye Exam",
  "Contact Lens Fitting",
  "Follow-up Consultation",
  "Prescription Update",
  "Eye Emergency",
  "Children's Eye Exam",
  "Standard Eye Test",
  "Contact Lens Follow-up",
  "PCO Test",
  "PCO Test + Eye Test",
  "Other",
];

export function BookingModal({ open, onClose, userData }) {
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [selectedDate, setSelectedDate] = useState();
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("pPhone");
  const [patientEmail, setPatientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [schedulePreference, setSchedulePreference] = useState("manual");
  const [aiLoading, setAiLoading] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [aiOptometrist, setAiOptometrist] = useState(null);
  const [aiCompatibility, setAiCompatibility] = useState(null);
  const [aiExplanation, setAiExplanation] = useState([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await API.get("/optometrists");
        setDoctors(res.data.data);
      } catch (error) {
        toast.error("Failed to load optometrists");
      } finally {
        setLoadingDoctors(false);
      }
    };

    if (open) fetchDoctors();
  }, [open]);

  useEffect(() => {
    if (schedulePreference !== "manual") {
      setAvailableSlots([]);
      return;
    }
    if (!selectedDoctor || !selectedDate || !appointmentType) {
      setAvailableSlots([]);
      return;
    }
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedTime("");
        const res = await API.get("/appointments/available", {
          params: {
            optometristId: selectedDoctor,
            date: selectedDate.toISOString(),
            appointmentType,
          },
        });
        setAvailableSlots(res.data.data || []);
      } catch (error) {
        toast.error("Failed to load available slots");
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate, appointmentType, schedulePreference]);

  useEffect(() => {
    const email = userData?.email;
    const name = userData?.name;
    const phone = userData?.phone;

    setPatientEmail(email);
    setPatientName(name);
    setPatientPhone(phone);
  }, [userData]);

  const handleReset = () => {
    setStep(1);
    setSelectedDoctor("");
    setAppointmentType("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
    setSchedulePreference("manual");
    setAiLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      await API.post("/appointments", {
        patientId: user.role === "patient" ? user.id : null,
        optometristId: selectedDoctor,
        date: selectedDate,
        startTime: selectedTime,
        appointmentType,
        specialRequirements: notes,
        smartBooking: schedulePreference === "smart",
      });

      toast.success("Appointment booked successfully!", {
        description: `Your appointment with ${
          doctors.find((d) => d._id === selectedDoctor)?.firstName
        } has been confirmed.`,
      });
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Booking failed");
    }
  };

  // const handleSubmit = () => {

  //   // toast.success("Appointment booked successfully!", {
  //   //   description: `Your appointment with ${
  //   //     mockDoctors.find((d) => d.id === selectedDoctor)?.name
  //   //   } has been confirmed.`,
  //   // });
  //   handleClose();
  // };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return selectedDoctor && appointmentType;
      case 2:
        return schedulePreference === "smart"
          ? true
          : selectedDate && selectedTime;
      case 3:
        return patientName && patientPhone && patientEmail;
      default:
        return false;
    }
  };

  const handleNextStep = async () => {
    if (step === 2 && schedulePreference === "smart") {
      setAiLoading(true);
      try {
        // Scan next 7 days for a recommended optometrist + slot.
        for (let offset = 1; offset <= 7; offset++) {
          const d = new Date();
          d.setDate(d.getDate() + offset);

          const recRes = await API.post("/ai/recommend-optometrist", {
            patientId: null,
            appointmentType,
            date: d.toISOString(),
          });
          const top = recRes.data.data?.[0];
          if (!top) continue;

          const slotRes = await API.post("/ai/recommend-slots", {
            patientId: null,
            optometristId: top.optometristId,
            date: d.toISOString(),
            appointmentType,
          });
          const topSlot = slotRes.data.data?.[0];
          if (!topSlot) continue;

          setSelectedDoctor(top.optometristId);
          setSelectedDate(d);
          setSelectedTime(topSlot.startTime);
          setAiOptometrist(top);
          setAiCompatibility(top.compatibilityScore);
          setAiExplanation(topSlot.reasons || []);
          setAiLoading(false);
          setStep(step + 1);
          return;
        }
        toast.error(
          "No smart slot found in the next 7 days — please pick manually.",
        );
        setSchedulePreference("manual");
      } catch (e) {
        toast.error(e.response?.data?.message || "Smart scheduling failed");
        setSchedulePreference("manual");
      } finally {
        setAiLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book an Appointment</DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Select Doctor & Service"
              : step === 2
                ? "Choose Date & Time"
                : "Confirm Details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Doctor and Service Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Select Optometrist</Label>
                <div className="grid gap-3">
                  {loadingDoctors && <p>"Doctors loading..."</p>}
                  {doctors?.length > 0 ? (
                    doctors?.map((doctor) => (
                      <div
                        key={doctor._id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedDoctor === doctor._id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => setSelectedDoctor(doctor._id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor?._id}`}
                            />
                            <AvatarFallback>
                              {doctor.firstName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">
                              Dr. {doctor.firstName}
                            </p>
                            <p className="text-sm text-gray-600">
                              {doctor.specialty}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Doctors not found</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment Type</Label>
                <Select
                  value={appointmentType}
                  onValueChange={setAppointmentType}
                >
                  <SelectTrigger id="appointmentType">
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Date and Time Selection / AI */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Scheduling Preference */}
              <div className="space-y-3">
                <Label>Scheduling Preference</Label>

                <div className="grid gap-3">
                  {/* Manual */}
                  <div
                    onClick={() => setSchedulePreference("manual")}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      schedulePreference === "manual"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <p className="font-semibold">Manual Selection</p>
                    <p className="text-sm text-gray-600">
                      Choose your preferred date and time
                    </p>
                  </div>

                  {/* Smart Allocation */}
                  <div
                    onClick={() => setSchedulePreference("smart")}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      schedulePreference === "smart"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <p className="font-semibold flex items-center gap-2">
                      🤖 Smart Allocation (AI)
                    </p>
                    <p className="text-sm text-gray-600">
                      Let AI find the most optimal schedule for you
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Date & Time */}
              {schedulePreference === "manual" && (
                <>
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        value={selectedDate}
                        onChange={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </div>
                  </div>

                  {selectedDate && (
                    <div className="space-y-2">
                      <Label>Select Time</Label>
                      {loadingSlots ? (
                        <p className="text-sm text-gray-500">Loading slots...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No slots available for this date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((time) => (
                            <Button
                              key={time}
                              variant={
                                selectedTime === time ? "default" : "outline"
                              }
                              onClick={() => setSelectedTime(time)}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              {time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* AI Loader / Preview */}
              {schedulePreference === "smart" && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 flex flex-col items-center gap-2">
                  <p className="font-semibold mb-1">🤖 AI Scheduling Enabled</p>
                  <p className="text-sm text-gray-600 text-center">
                    Our system will analyze doctor availability, appointment
                    type, and clinic load to assign the best possible date &
                    time.
                  </p>
                  {aiLoading && (
                    <div className="mt-4 animate-pulse text-purple-600 font-medium">
                      Optimizing your schedule...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Patient Information */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <h3 className="font-semibold">Appointment Summary</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">Doctor:</span>{" "}
                    {doctors?.find((d) => d._id === selectedDoctor)?.firstName}
                  </p>
                  <p>
                    <span className="text-gray-600">Type:</span>{" "}
                    {appointmentType}
                  </p>
                  <p>
                    <span className="text-gray-600">Date:</span>{" "}
                    {selectedDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p>
                    <span className="text-gray-600">Time:</span> {selectedTime}
                  </p>
                  {schedulePreference === "smart" && (
                    <p className="text-purple-600 text-sm font-medium">
                      🤖 Scheduled via Smart Allocation
                    </p>
                  )}
                  {schedulePreference === "smart" && aiCompatibility !== null && (
                    <p className="text-purple-600 text-xs">
                      Compatibility {aiCompatibility}/100
                      {aiExplanation.length > 0
                        ? ` — ${aiExplanation.join(", ")}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="patientName"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="patientPhone"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="patientEmail"
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific concerns or requirements..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNextStep}
                disabled={!isStepValid() || aiLoading}
              >
                {aiLoading ? "Optimizing Schedule..." : "Continue"}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!isStepValid()}>
                Confirm Booking
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
