import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Mail, Phone, MapPin } from "lucide-react";
import API from "../../../lib/api";
import { toast } from "sonner";

// Patient profile editor. Used as a route-level page via PatientProfilePage.jsx.
// Fields:
//   - firstName, lastName, dateOfBirth, phone, address
//   - languagePreference, accessibilityNeeds
//   - notificationPreferences: { email, sms, calendarSync }
//
// Reads + writes via GET/PUT /patients/:id.
export default function ProfileTab({ user, profile }) {
  const [patient, setPatient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    languagePreference: "English",
    accessibilityNeeds: "",
    email: "",
    notificationPreferences: {
      email: true,
      sms: true,
      calendarSync: false,
    },
  });

  useEffect(() => {
    if (!profile?._id) return;
    const fetchPatient = async () => {
      try {
        const res = await API.get(`/patients/${profile._id}`);
        const data = res.data.data;
        setPatient(data);

        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          address: data.address || "",
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split("T")[0]
            : "",
          languagePreference: data.languagePreference || "English",
          accessibilityNeeds: data.accessibilityNeeds || "",
          email: data.user?.email || user?.email || "",
          notificationPreferences: {
            email: data.notificationPreferences?.email ?? true,
            sms: data.notificationPreferences?.sms ?? true,
            calendarSync:
              data.notificationPreferences?.calendarSync ?? false,
          },
        });
      } catch (error) {
        toast.error("Failed to load profile");
      }
    };

    fetchPatient();
  }, [profile, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNotifToggle = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // email lives on User, not Patient — strip it from the payload.
      const { email: _ignored, ...payload } = formData;
      const res = await API.put(`/patients/${profile._id}`, payload);
      setPatient(res.data.data);
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return <p className="text-gray-500">Loading profile...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
        <CardDescription>
          Keep your contact details and preferences up to date.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient._id}`}
            />
            <AvatarFallback>{formData.firstName?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>
            ) : (
              <h3 className="font-semibold text-lg">
                {patient.firstName} {patient.lastName}
              </h3>
            )}
            <p className="text-gray-500 text-sm">OptiBook patient</p>
          </div>
        </div>

        {/* Contact + demographics */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <p className="text-sm">{formData.email || "—"}</p>
              <p className="text-xs text-gray-400 mt-1">
                Contact support to change your email.
              </p>
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone
              </Label>
              {isEditing ? (
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 7700 900000"
                />
              ) : (
                <p className="text-sm">{patient.phone || "—"}</p>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Address
              </Label>
              {isEditing ? (
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, city, postcode"
                />
              ) : (
                <p className="text-sm">{patient.address || "—"}</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Date of birth
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              ) : (
                <p className="text-sm">
                  {patient.dateOfBirth
                    ? new Date(patient.dateOfBirth).toLocaleDateString()
                    : "—"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Language preference
              </Label>
              {isEditing ? (
                <select
                  name="languagePreference"
                  value={formData.languagePreference}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="English">English</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Arabic">Arabic</option>
                </select>
              ) : (
                <p className="text-sm">{patient.languagePreference}</p>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1">
                Accessibility needs
              </Label>
              {isEditing ? (
                <Input
                  name="accessibilityNeeds"
                  value={formData.accessibilityNeeds}
                  onChange={handleChange}
                  placeholder="e.g. wheelchair access, step-free entrance"
                />
              ) : (
                <p className="text-sm">{patient.accessibilityNeeds || "—"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="border-t pt-6">
          <h4 className="font-semibold text-sm mb-1">
            Notification preferences
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            How should we contact you about appointments and recalls?
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email reminders</p>
                <p className="text-xs text-gray-500">
                  Confirmations and day-before reminders by email.
                </p>
              </div>
              <Switch
                checked={formData.notificationPreferences.email}
                disabled={!isEditing}
                onCheckedChange={(v) => handleNotifToggle("email", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS reminders</p>
                <p className="text-xs text-gray-500">
                  Text message reminders to your phone.
                </p>
              </div>
              <Switch
                checked={formData.notificationPreferences.sms}
                disabled={!isEditing}
                onCheckedChange={(v) => handleNotifToggle("sms", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Calendar sync</p>
                <p className="text-xs text-gray-500">
                  Attach an .ics invite to confirmation emails.
                </p>
              </div>
              <Switch
                checked={formData.notificationPreferences.calendarSync}
                disabled={!isEditing}
                onCheckedChange={(v) => handleNotifToggle("calendarSync", v)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
